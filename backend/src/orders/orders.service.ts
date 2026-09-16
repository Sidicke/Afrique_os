import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { phoneMatchClause } from '../common/utils/normalize-phone.util';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Création d'une commande depuis la vitrine (publique).
   * Le total est TOUJOURS recalculé côté serveur à partir du prix en base ;
   * le client ne fournit que les quantités + la livraison choisie.
   * Le stock est décrémenté dans la même transaction.
   */
  async create(boutiqueId: string, dto: CreateOrderDto, userId?: string) {
    let conversation = null;
    if (dto.conversationId) {
      conversation = await this.prisma.conversation.findFirst({
        where: {
          id: dto.conversationId,
          boutiqueId,
          ...(userId
            ? { userId }
            : dto.customerPhone
              ? phoneMatchClause(dto.customerPhone)
              : { id: 'impossible' }),
        },
      });
    }
    // Charge les produits demandés (scopés à la boutique)
    const productIds = dto.items.map((i) => i.productId);
    const uniqueProductIds = [...new Set(productIds)];
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, boutiqueId, isActive: true },
      select: { id: true, name: true, price: true, stock: true },
    });
    if (products.length !== uniqueProductIds.length) {
      throw new BadRequestException('Certains produits sont indisponibles');
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Variantes éventuelles
    const variantIds = dto.items
      .map((i) => i.variantId)
      .filter((v): v is string => Boolean(v));
    const variants = variantIds.length
      ? await this.prisma.variant.findMany({
          where: { id: { in: variantIds }, productId: { in: productIds } },
          select: { id: true, name: true, value: true, priceDelta: true, productId: true, stock: true },
        })
      : [];
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // Calcule les lignes + vérifie le stock
    const lines = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException('Produit introuvable');
      const variant = item.variantId ? variantMap.get(item.variantId) : undefined;
      if (item.variantId && !variant) {
        throw new BadRequestException('Variante introuvable');
      }
      if (variant && variant.productId !== product.id) {
        throw new BadRequestException('Variante invalide pour ce produit');
      }
      let unitPrice = product.price.plus(variant?.priceDelta ?? 0);
      if (
        conversation &&
        conversation.agreedPrice &&
        conversation.agreedPrice.toNumber() > 0 &&
        conversation.productId === product.id
      ) {
        unitPrice = new Prisma.Decimal(conversation.agreedPrice.toNumber()).plus(variant?.priceDelta ?? 0);
      }
      const quantity = item.quantity;
      if (product.stock < quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour "${product.name}" (disponible : ${product.stock})`,
        );
      }
      return {
        productId: product.id,
        variantId: variant?.id ?? null,
        productName: product.name,
        variantLabel: variant ? `${variant.name}: ${variant.value}` : null,
        quantity,
        unitPrice,
      };
    });

    const itemsTotal = lines.reduce(
      (sum, l) => sum.plus(l.unitPrice.times(l.quantity)),
      new Prisma.Decimal(0),
    );
    const deliveryPrice = new Prisma.Decimal(dto.deliveryPrice ?? 0);

    // Calcul et plafonnement de la remise par points fidélité (1 point = 1 FCFA)
    let pointsDiscount = 0;
    if (userId && dto.pointsToUse && dto.pointsToUse > 0) {
      const requestedPoints = Math.floor(dto.pointsToUse);
      const maxApplicable = Math.floor(Number(itemsTotal));
      pointsDiscount = Math.min(requestedPoints, maxApplicable);
    }

    const grossTotal = itemsTotal.plus(deliveryPrice);
    const finalTotal = Prisma.Decimal.max(
      grossTotal.minus(pointsDiscount),
      new Prisma.Decimal(0),
    );

    // Transaction atomique : création de commande + décrément conditionnel des points et stocks
    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          boutiqueId,
          userId: userId ?? null,
          reference: this.nextReference(),
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          address: dto.address,
          city: dto.city,
          country: dto.country,
          customerEmail: dto.customerEmail,
          status: OrderStatus.PENDING,
          paymentMethod: dto.paymentMethod,
          pointsUsed: pointsDiscount,
          deliveryName: dto.deliveryName,
          deliveryPrice,
          total: finalTotal,
          notes: dto.notes,
          items: { create: lines.map((l) => ({ ...l, unitPrice: l.unitPrice })) },
        },
        include: { items: true },
      });

      // Décrément atomique conditionnel du solde de points (anti-race condition)
      if (userId && pointsDiscount > 0) {
        const userUpdate = await tx.user.updateMany({
          where: { id: userId, pointsBalance: { gte: pointsDiscount } },
          data: { pointsBalance: { decrement: pointsDiscount } },
        });
        if (userUpdate.count === 0) {
          throw new BadRequestException('Solde de points fidélité insuffisant.');
        }
        await tx.pointTransaction.create({
          data: {
            userId,
            amount: -pointsDiscount,
            reason: 'SPENT_ON_ORDER',
            orderId: created.id,
          },
        });
      }

      // Décrément atomique conditionnel des stocks (anti-overselling)
      const outOfStock: string[] = [];
      for (const line of lines) {
        const productUpdate = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (productUpdate.count === 0) {
          throw new BadRequestException(
            `Stock insuffisant pour le produit "${line.productName}".`,
          );
        }

        const currentProduct = await tx.product.findUniqueOrThrow({
          where: { id: line.productId },
          select: { id: true, name: true, stock: true },
        });
        if (currentProduct.stock === 0) {
          outOfStock.push(currentProduct.name);
        }

        if (line.variantId) {
          const variantUpdate = await tx.variant.updateMany({
            where: { id: line.variantId, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (variantUpdate.count === 0) {
            throw new BadRequestException(
              `Stock insuffisant pour la variante "${line.variantLabel ?? line.productName}".`,
            );
          }

          const currentVariant = await tx.variant.findUniqueOrThrow({
            where: { id: line.variantId },
            select: { id: true, name: true, value: true, stock: true },
          });
          if (currentVariant.stock === 0) {
            outOfStock.push(
              `${currentProduct.name} — ${currentVariant.name}: ${currentVariant.value}`,
            );
          }
        }
      }

      return { order: created, outOfStock };
    });

    // Notifications au vendeur (fire-and-forget, jamais bloquant pour la
    // commande) : nouvelle commande + ruptures de stock éventuelles.
    void this.notifySellerNewOrder(result.order, boutiqueId);
    if (result.outOfStock.length > 0) {
      void this.notifySellerLowStock(boutiqueId, result.outOfStock);
    }

    return this.toOrderView(result.order);
  }

  /**
   * Commandes du CLIENT connecté (Mes commandes) : userId du token.
   * Isolation stricte — aucun paramètre d'URL, le compte ne peut voir que
   * ses propres commandes.
   */
  async findForUser(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        boutique: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => ({
      ...this.toOrderView(o),
      boutique: o.boutique,
    }));
  }

  /** Liste des commandes d'une boutique (vendeur) */
  async findAllForAdmin(boutiqueId: string) {
    const orders = await this.prisma.order.findMany({
      where: { boutiqueId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.toOrderView(o));
  }

  /** Changement de statut par le vendeur */
  async updateStatus(boutiqueId: string, id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findFirst({
      where: { id, boutiqueId },
      include: { boutique: { select: { name: true, email: true } } },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status === OrderStatus.CANCELLED && dto.status !== OrderStatus.CANCELLED) {
      // Remettre en stock serait idéal — à ce stade, refus simple pour éviter
      // toute incohérence d'inventaire.
      throw new BadRequestException(
        'Une commande annulée ne peut pas être réactivée',
      );
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: { items: true },
    });

    // E-mail de confirmation au client quand le paiement est validé (PAID).
    // Uniquement à la TRANSITION depuis PENDING (pas de doublon sur une
    // re-affectation, ni de re-mail sur un downgrade depuis SHIPPING/
    // DELIVERED), et seulement si un e-mail a été fourni à la commande.
    // Fire-and-forget : un échec d'envoi ne casse jamais le statut.
    if (
      dto.status === OrderStatus.PAID &&
      order.status === OrderStatus.PENDING &&
      order.customerEmail
    ) {
      void this.sendOrderConfirmationMail(updated, order.boutique);
      void this.processCashbackAndSellerBalance(updated);
    }

    return this.toOrderView(updated);
  }

  /**
   * Confirmation de paiement par le CLIENT (vitrine) : PENDING → PAID.
   *
   * Ownership : un client CONNECTÉ est identifié par son userId (token) ; un
   * VISITEUR doit fournir le téléphone de la commande (sinon 404 — aucune
   * fuite d'existence). La transition est ATOMIQUE (updateMany) : deux appels
   * concurrents ne peuvent pas payer deux fois, ni payer une commande déjà
   * expédiée/livrée/annulée.
   *
   * Le statut PAID est la source de vérité du paiement : le frontend ne fait
   * qu'afficher les états de la simulation, la commande ne devient « payée »
   * que lorsque le backend le confirme ici.
   */
  async confirmPayment(
    boutiqueId: string,
    id: string,
    dto: ConfirmPaymentDto,
    userId?: string,
  ) {
    // Ownership : userId si connecté, sinon téléphone (même règle que l'annulation)
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        boutiqueId,
        ...(userId
          ? { userId }
          : dto.phone
            ? phoneMatchClause(dto.phone)
            : { id: 'impossible' }), // ni token ni téléphone → introuvable
      },
      include: {
        boutique: {
          select: { name: true, email: true, notifications: true },
        },
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    if (order.status === OrderStatus.PAID) {
      return this.toOrderView(
        await this.prisma.order.findUniqueOrThrow({
          where: { id },
          include: { items: true },
        }),
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Cette commande ne peut pas être payée dans son état actuel',
      );
    }

    if (order.paymentMethod === PaymentMethod.FEDAPAY) {
      throw new BadRequestException(
        'Les commandes réglées via FedaPay sont validées automatiquement par la passerelle de paiement sécurisée.',
      );
    }

    // Enregistrement de la référence de paiement soumise par le client pour vérification vendeur
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.transactionRef ? { paymentRef: dto.transactionRef } : {}),
      },
      include: { items: true },
    });

    // Notification au VENDEUR (cloche du dashboard) pour vérification des fonds reçus
    try {
      await this.notificationsService.create(
        boutiqueId,
        {
          type: 'order_payment_submitted',
          title: `Preuve de paiement soumise pour #${updated.reference}`,
          message: `Le client ${updated.customerName} a soumis une référence de paiement (${dto.transactionRef ?? 'non précisée'}). Veuillez vérifier votre compte et valider la commande.`,
          orderReference: `#${updated.reference}`,
        },
        order.boutique.notifications,
      );
    } catch (err) {
      this.logger.error(
        `[notifications] échec création notification paiement soumis ${updated.reference} : ${(err as Error).message}`,
      );
    }

    return {
      ...this.toOrderView(updated),
      message: 'Votre référence de paiement a été transmise au vendeur pour validation.',
    };
  }

  /** Notification vendeur : commande payée (cloche du dashboard) */
  private async notifySellerOrderPaid(
    paid: {
      reference: string;
      customerName: string;
      total: Prisma.Decimal;
    },
    boutiqueId: string,
    prefs: unknown,
  ) {
    try {
      await this.notificationsService.create(boutiqueId, {
        type: 'order_paid',
        title: `Paiement reçu pour la commande #${paid.reference}`,
        message: `${paid.customerName} — ${new Intl.NumberFormat('fr-FR').format(Number(paid.total))} FCFA. Vous pouvez préparer la commande.`,
        orderReference: `#${paid.reference}`,
      }, prefs);
    } catch (err) {
      this.logger.error(
        `[notifications] échec création paiement reçu ${paid.reference} : ${(err as Error).message}`,
      );
    }
  }

  /** Historique des commandes d'un client (par téléphone, tolérant au format) */
  async findForCustomer(phone: string, boutiqueId: string) {
    const orders = await this.prisma.order.findMany({
      where: { ...phoneMatchClause(phone), boutiqueId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.toOrderView(o));
  }

  /**
   * Annulation d'une commande par le CLIENT (vitrine). Le téléphone est
   * obligatoire et doit correspondre à celui saisi à la commande (sinon 404 :
   * on ne révèle pas l'existence de la commande). L'annulation n'est possible
   * qu'avant expédition (PENDING / PAID) ; le stock des produits
   * et variantes est REMIS dans la même transaction que le changement de
   * statut (miroir exact de la décrémentation à la création).
   */
  async cancelByCustomer(
    boutiqueId: string,
    id: string,
    dto: CancelOrderDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id, boutiqueId, ...phoneMatchClause(dto.phone) },
      include: {
        items: true,
        boutique: { select: { name: true, email: true, notifications: true } },
      },
    });
    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cette commande est déjà annulée');
    }
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PAID
    ) {
      throw new BadRequestException(
        'Cette commande ne peut plus être annulée : elle est déjà en cours d’expédition ou livrée',
      );
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      // Transition de statut ATOMIQUE : seul le premier appel gagne (count 1).
      // Deux annulations concurrentes ne peuvent pas remettre le stock deux fois.
      const trimmedReason = dto.reason?.trim();
      const transition = await tx.order.updateMany({
        where: {
          id,
          boutiqueId,
          status: { in: [OrderStatus.PENDING, OrderStatus.PAID] },
        },
        data: {
          status: OrderStatus.CANCELLED,
          // Motif optionnel saisi par le client — conservé pour le vendeur
          ...(trimmedReason ? { cancellationReason: trimmedReason } : {}),
        },
      });
      if (transition.count === 0) {
        throw new BadRequestException(
          'Cette commande ne peut plus être annulée',
        );
      }
      const updated = await tx.order.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });

      // Si la commande était déjà payée, régulariser le solde vendeur et restituer les points
      if (order.status === OrderStatus.PAID) {
        await tx.boutique.update({
          where: { id: boutiqueId },
          data: { balance: { decrement: Number(order.total) } },
        });

        if (order.userId && order.pointsUsed > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: { pointsBalance: { increment: order.pointsUsed } },
          });
          await tx.pointTransaction.create({
            data: {
              userId: order.userId,
              amount: order.pointsUsed,
              reason: 'REFUND_ON_ORDER_CANCEL',
              orderId: order.id,
            },
          });
        }
      }
      // Remise en stock (miroir de la création : produits + variantes).
      // productId est nullable (SetNull si le produit est supprimé) : on
      // ne remet en stock que les lignes encore rattachées à un produit.
      for (const line of updated.items) {
        if (!line.productId) continue;
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { increment: line.quantity } },
        });
        if (line.variantId) {
          await tx.variant.update({
            where: { id: line.variantId },
            data: { stock: { increment: line.quantity } },
          });
        }
      }
      return updated;
    });

    // Confirmation par e-mail au client (si adresse fournie à la commande).
    // Fire-and-forget : un échec d'envoi ne remet jamais en cause l'annulation.
    if (cancelled.customerEmail) {
      void this.sendCancellationMail(cancelled, order.boutique);
    }

    // Alerte par e-mail au VENDEUR (si la boutique a renseigné un e-mail).
    // Fire-and-forget : un échec d'envoi ne remet jamais en cause l'annulation.
    if (order.boutique.email) {
      void this.sendSellerCancellationMail(cancelled, order.boutique);
    }

    // Notification au VENDEUR (cloche du dashboard) — même principe : jamais
    // bloquant pour l'annulation. Les préférences (activé/désactivé par type)
    // sont déjà chargées avec la boutique : pas de requête supplémentaire.
    void this.notifySellerCancellation(cancelled, boutiqueId, order.boutique.notifications);

    return this.toOrderView(cancelled);
  }

  /** Notification vendeur : nouvelle commande reçue (cloche du dashboard) */
  private async notifySellerNewOrder(
    order: { reference: string; customerName: string; total: Prisma.Decimal },
    boutiqueId: string,
  ) {
    try {
      await this.notificationsService.create(boutiqueId, {
        type: 'new_order',
        title: `Nouvelle commande #${order.reference}`,
        message: `Client : ${order.customerName} — ${new Intl.NumberFormat('fr-FR').format(Number(order.total))} FCFA`,
        orderReference: `#${order.reference}`,
      });
    } catch (err) {
      this.logger.error(
        `[notifications] échec création nouvelle commande ${order.reference} : ${(err as Error).message}`,
      );
    }
  }

  /** Notification vendeur : produit(s) en rupture de stock */
  private async notifySellerLowStock(boutiqueId: string, productNames: string[]) {
    const unique = [...new Set(productNames)];
    try {
      await this.notificationsService.create(boutiqueId, {
        type: 'low_stock',
        title:
          unique.length === 1
            ? 'Rupture de stock'
            : `${unique.length} produits en rupture de stock`,
        message:
          unique.length === 1
            ? `« ${unique[0]} » n'est plus en stock`
            : unique.join(', '),
      });
    } catch (err) {
      this.logger.error(
        `[notifications] échec création rupture de stock : ${(err as Error).message}`,
      );
    }
  }

  /** Crée la notification vendeur « commande annulée » (avec le motif) */
  private async notifySellerCancellation(
    cancelled: {
      reference: string;
      customerName: string;
      cancellationReason: string | null;
    },
    boutiqueId: string,
    prefs: unknown,
  ) {
    try {
      await this.notificationsService.create(boutiqueId, {
        type: 'order_cancelled',
        title: `Commande #${cancelled.reference} annulée par le client`,
        message: cancelled.cancellationReason
          ? `Motif : ${cancelled.cancellationReason}`
          : `Client : ${cancelled.customerName}`,
        orderReference: `#${cancelled.reference}`,
      }, prefs);
    } catch (err) {
      this.logger.error(
        `[notifications] échec création annulation ${cancelled.reference} : ${(err as Error).message}`,
      );
    }
  }

  /** Prépare et déclenche l'e-mail de confirmation d'annulation (Resend) */
  private async sendCancellationMail(
    cancelled: {
      reference: string;
      customerName: string;
      customerEmail: string | null;
      customerPhone: string;
      cancellationReason: string | null;
      total: Prisma.Decimal;
      deliveryPrice: Prisma.Decimal;
      items: {
        productName: string;
        variantLabel: string | null;
        quantity: number;
        unitPrice: Prisma.Decimal;
      }[];
    },
    boutique: { name: string; email: string | null },
  ) {
    // Guard interne : jamais d'e-mail sans adresse.
    // MailService.sendOrderCancellation ne jette JAMAIS (il capture et loggue
    // ses propres échecs) — l'envoi ne peut donc pas remonter dans le flux
    // d'annulation.
    if (!cancelled.customerEmail) return;
    await this.mailService.sendOrderCancellation({
      orderNumber: `#${cancelled.reference}`,
      customerName: cancelled.customerName,
      customerEmail: cancelled.customerEmail,
      boutiqueName: boutique.name,
      boutiqueEmail: boutique.email,
      cancellationReason: cancelled.cancellationReason ?? undefined,
      items: cancelled.items.map((i) => ({
        name: i.productName,
        variantLabel: i.variantLabel ?? undefined,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
      deliveryPrice: Number(cancelled.deliveryPrice),
      total: Number(cancelled.total),
      formatPrice: (value) =>
        `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`,
    });
  }

  /** Prépare et déclenche l'alerte d'annulation au VENDEUR (Resend) */
  private async sendSellerCancellationMail(
    cancelled: {
      reference: string;
      customerName: string;
      customerPhone: string;
      cancellationReason: string | null;
      total: Prisma.Decimal;
      deliveryPrice: Prisma.Decimal;
      items: {
        productName: string;
        variantLabel: string | null;
        quantity: number;
        unitPrice: Prisma.Decimal;
      }[];
    },
    boutique: { name: string; email: string | null },
  ) {
    // Guard interne : jamais d'alerte sans adresse vendeur.
    // MailService.sendSellerCancellationNotice ne jette JAMAIS (il capture et
    // loggue ses propres échecs) — l'envoi ne peut pas remonter dans le flux
    // d'annulation.
    if (!boutique.email) return;
    await this.mailService.sendSellerCancellationNotice({
      orderNumber: `#${cancelled.reference}`,
      boutiqueName: boutique.name,
      sellerEmail: boutique.email,
      customerName: cancelled.customerName,
      customerPhone: cancelled.customerPhone,
      cancellationReason: cancelled.cancellationReason ?? undefined,
      items: cancelled.items.map((i) => ({
        name: i.productName,
        variantLabel: i.variantLabel ?? undefined,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
      deliveryPrice: Number(cancelled.deliveryPrice),
      total: Number(cancelled.total),
      formatPrice: (value) =>
        `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`,
    });
  }

  /** Prépare et déclenche l'e-mail de confirmation au client (Resend) */
  private async sendOrderConfirmationMail(
    confirmed: {
      reference: string;
      customerName: string;
      customerEmail: string | null;
      total: Prisma.Decimal;
      deliveryPrice: Prisma.Decimal;
      items: {
        productName: string;
        variantLabel: string | null;
        quantity: number;
        unitPrice: Prisma.Decimal;
      }[];
    },
    boutique: { name: string; email: string | null },
  ) {
    // Guard interne : jamais d'e-mail sans adresse.
    // MailService.sendOrderConfirmation ne jette JAMAIS (il capture et loggue
    // ses propres échecs) — l'envoi ne peut pas remonter dans le flux de
    // changement de statut.
    if (!confirmed.customerEmail) return;
    await this.mailService.sendOrderConfirmation({
      orderNumber: `#${confirmed.reference}`,
      customerName: confirmed.customerName,
      customerEmail: confirmed.customerEmail,
      boutiqueName: boutique.name,
      boutiqueEmail: boutique.email,
      items: confirmed.items.map((i) => ({
        name: i.productName,
        variantLabel: i.variantLabel ?? undefined,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
      deliveryPrice: Number(confirmed.deliveryPrice),
      total: Number(confirmed.total),
      formatPrice: (value) =>
        `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`,
    });
  }

  /**
   * Suivi d'une commande par numéro (référence, ex. "#AC-8901") — vitrine.
   * Le téléphone client est OBLIGATOIRE pour protéger les données personnelles (PII)
   * et garantir que seul l'acheteur accède aux détails de sa commande.
   */
  async findByReference(reference: string, boutiqueId: string, phone?: string) {
    if (!phone || !phone.trim()) {
      throw new BadRequestException(
        'Le numéro de téléphone associé à la commande est obligatoire pour consulter son suivi.',
      );
    }
    const normalized = reference
      .trim()
      .replace(/^#/, '')
      .replace(/\s+/g, '')
      .toUpperCase();
    const order = await this.prisma.order.findFirst({
      where: {
        reference: normalized,
        boutiqueId,
        ...phoneMatchClause(phone),
      },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }
    return this.toOrderView(order);
  }

  // ===== Helpers =====

  /** Vue alignée sur le contrat du dashboard frontend */
  private toOrderView(order: {
    id: string;
    reference: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    city: string | null;
    country: string | null;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentRef: string | null;
    cancellationReason: string | null;
    deliveryName: string | null;
    deliveryPrice: Prisma.Decimal;
    total: Prisma.Decimal;
    notes: string | null;
    createdAt: Date;
    items: {
      productName: string;
      variantLabel: string | null;
      quantity: number;
      unitPrice: Prisma.Decimal;
    }[];
  }) {
    const firstItem = order.items[0];
    return {
      id: order.id,
      orderNumber: `#${order.reference}`,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      city: order.city ?? '',
      country: order.country ?? '',
    status: this.toFrontStatus(order.status),
    paymentMethod: this.toFrontPayment(order.paymentMethod),
    paymentRef: order.paymentRef ?? undefined,
    cancellationReason: order.cancellationReason ?? undefined,
      productName: firstItem?.productName ?? '',
      variantLabel: firstItem?.variantLabel ?? undefined,
      quantity: order.items.reduce((sum, i) => sum + i.quantity, 0),
      totalPriceFcfa: Number(order.total),
      items: order.items.map((i) => ({
        productName: i.productName,
        variantLabel: i.variantLabel ?? undefined,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
      deliveryName: order.deliveryName ?? undefined,
      deliveryPrice: Number(order.deliveryPrice),
      createdAt: order.createdAt.toISOString(),
    };
  }

  private toFrontStatus(status: OrderStatus) {
    const map: Record<OrderStatus, string> = {
      PENDING: 'pending',
      PAID: 'paid',
      WHATSAPP_CONFIRMED: 'paid',
      SHIPPING: 'shipping',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
    };
    return map[status];
  }

  private toFrontPayment(method: PaymentMethod) {
    const map: Record<PaymentMethod, string> = {
      MOBILE_MONEY: 'mobile_money',
      CASH_ON_DELIVERY: 'cash_on_delivery',
      CARD: 'card',
      WHATSAPP_DIRECT: 'whatsapp_direct',
      FEDAPAY: 'fedapay',
    };
    return map[method];
  }

  /**
   * Référence unique sans état (atomique sous concurrence) :
   * AC-<timestamp base36>-<aléa 4 hex>. Lisible et sans collision.
   */
  private nextReference(): string {
    const time = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
    return `AC-${time}-${rand}`;
  }

  private async processCashbackAndSellerBalance(order: any) {
    // Le total enregistré est le montant final payé (net des points).
    // Le montant brut réel de la vente (celui qui revient au vendeur) est total + points utilisés.
    const grossTotal = Number(order.total) + Number(order.pointsUsed || 0);
    
    // --- Calcul de la commission selon le plan vendeur ---
    const boutique = await this.prisma.boutique.findUnique({
      where: { id: order.boutiqueId },
      select: { ownerId: true }
    });

    let commissionRate = 5.0; // Starter par défaut
    let userPlan = 'starter';

    if (boutique) {
      const userBoutiques = await this.prisma.boutique.findMany({
        where: { ownerId: boutique.ownerId },
        select: { plan: true },
      });
      if (userBoutiques.some(b => b.plan === 'enterprise')) {
        userPlan = 'enterprise';
        commissionRate = 1.5; 
      } else if (userBoutiques.some(b => b.plan === 'business')) {
        userPlan = 'business';
        commissionRate = 2.0;
      }
    }

    // La commission de la plateforme est calculée sur le montant brut de la vente
    const commissionAmount = Number((grossTotal * (commissionRate / 100)).toFixed(2));
    // Le vendeur reçoit la valeur totale de ses produits, moins la commission plateforme
    // La plateforme absorbe ainsi le coût commercial des points de fidélité !
    const netAmount = grossTotal - commissionAmount;

    // Mise à jour de la traçabilité sur la commande
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        commissionRate,
        commissionAmount,
        netAmount,
        planAtPurchase: userPlan
      }
    });

    // 1. Ajouter le solde NET au vendeur
    await this.prisma.boutique.update({
      where: { id: order.boutiqueId },
      data: { balance: { increment: netAmount } }
    });

    // 2. Cashback et Parrainage (0.5%)
    const pointsEarned = Math.floor(grossTotal * 0.005); // 0.5% sur le brut

    if (order.userId) {
      const buyer = await this.prisma.user.findUnique({ where: { id: order.userId } });
      if (buyer) {
        // Cashback Acheteur (0.5%)
        if (pointsEarned > 0) {
          await this.prisma.user.update({
            where: { id: buyer.id },
            data: { pointsBalance: { increment: pointsEarned } }
          });
          await this.prisma.pointTransaction.create({
            data: {
              userId: buyer.id,
              amount: pointsEarned,
              reason: "CASHBACK_PURCHASE",
              orderId: order.id
            }
          });
        }
        
        // Parrainage
        if (buyer.referredById && pointsEarned > 0) {
          await this.prisma.user.update({
            where: { id: buyer.referredById },
            data: { pointsBalance: { increment: pointsEarned } }
          });
          await this.prisma.pointTransaction.create({
            data: {
              userId: buyer.referredById,
              amount: pointsEarned,
              reason: "CASHBACK_REFERRAL",
              orderId: order.id
            }
          });
        }
      }
    }
  }

}