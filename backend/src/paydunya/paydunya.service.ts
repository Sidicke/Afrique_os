import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IdempotencyService } from '../common/services/idempotency.service';
import { LedgerAccounts, LedgerService } from '../common/services/ledger.service';
import { CreatePayDunyaTransactionDto } from './dto/create-paydunya-transaction.dto';
import {
  LedgerDirection,
  OrderStatus,
  PaymentDirection,
  PaymentKind,
  PaymentMethod,
  SubscriptionStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

export interface PayDunyaCheckoutResponse {
  success: boolean;
  mode: 'live' | 'sandbox' | 'sandbox_mock';
  transactionId: string;
  reference: string;
  amount: number;
  currency: string;
  checkoutUrl: string;
  token: string;
}

/**
 * CORRECTIF C2 — Tolérance de comparaison des montants (FCFA).
 * Le franc CFA n'a pas de sous-unité, mais les montants transitent en
 * `Decimal(12,2)` côté base et en `number` côté API : une tolérance de 1
 * centime absorbs les écarts de représentation sans jamais masquer un
 * sous-paiement réel (100 FCFA minimum).
 */
const AMOUNT_TOLERANCE = 0.01;

@Injectable()
export class PayDunyaService {
  private readonly logger = new Logger(PayDunyaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly idempotencyService: IdempotencyService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * ÉTAPE 1, 2, 3 & 4 DU FLUX DE PAIEMENT PAYDUNYA :
   * - Vérification de l'idempotence (1er pilier)
   * - Recalcul Zero-Trust du montant serveur depuis la DB (4e pilier)
   * - Création de la facture Checkout PayDunya (API REST PayDunya ou Sandbox Mock)
   * - Retour du token et de l'URL de paiement au client
   */
  async createCheckoutTransaction(
    dto: CreatePayDunyaTransactionDto,
    idempotencyKey?: string,
    path = '/api/v1/payments/paydunya/create-transaction',
  ): Promise<PayDunyaCheckoutResponse> {
    // 1. Vérification de l'idempotence si une clé est fournie
    //    ⚠️ Le cache est scopé par (key, path) : une clé partagée avec un autre
    //    endpoint (ex. la création de commande) ne peut plus renvoyer ici une
    //    charge utile de type « commande ». La garde ci-dessous est une
    //    défense en profondeur : si la réponse en cache ne possède pas la
    //    forme d'une réponse de création de transaction PayDunya, on la
    //    rejette au lieu de la renvoyer au client (correctif C1).
    if (idempotencyKey) {
      const cached = await this.idempotencyService.getRecord(idempotencyKey, path);
      if (cached) {
        const body = cached.responseBody as PayDunyaCheckoutResponse;
        if (
          body &&
          typeof body.checkoutUrl === 'string' &&
          typeof body.token === 'string' &&
          typeof body.amount === 'number'
        ) {
          return body;
        }
        this.logger.warn(
          `[PayDunya] Réponse en cache invalide pour la clé "${idempotencyKey}" (${path}) — ignorée, la transaction sera créée.`,
        );
      }
    }

    // 2. Récupération de la commande en DB — PILIER ZERO TRUST CLIENT
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { boutique: true, items: true },
    });

    if (!order) {
      throw new NotFoundException(`Commande introuvable avec l'ID : ${dto.orderId}`);
    }

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException(`La commande #${order.reference} a déjà été réglée.`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(`La commande #${order.reference} a été annulée.`);
    }

    // PILIER ZERO TRUST : Le montant est extrait exclusivement du total recalculé serveur en DB
    const serverCalculatedAmount = Number(order.total);
    const currency = 'XOF'; // FCFA par défaut pour PayDunya dans l'espace UEMOA

    const cleanKey = (v?: string) => (v ?? '').trim().replace(/^['"]|['"]$/g, '').trim();
    const masterKey = cleanKey(this.configService.get<string>('PAYDUNYA_MASTER_KEY'));
    const publicKey = cleanKey(this.configService.get<string>('PAYDUNYA_PUBLIC_KEY'));
    const privateKey = cleanKey(this.configService.get<string>('PAYDUNYA_PRIVATE_KEY'));
    const tokenKey = cleanKey(this.configService.get<string>('PAYDUNYA_TOKEN'));
    const environment = cleanKey(this.configService.get<string>('PAYDUNYA_ENVIRONMENT') ?? 'sandbox');

    const defaultCallbackUrl =
      this.configService.get<string>('PAYDUNYA_CALLBACK_URL') ??
      'http://localhost:3001/checkout/success';
    const cancelUrl =
      this.configService.get<string>('PAYDUNYA_CANCEL_URL') ??
      'http://localhost:3001/checkout/cancel';
    const ipnUrl = this.configService.get<string>('PAYDUNYA_IPN_URL');

    let returnUrl = defaultCallbackUrl;
    if (dto.callbackUrl) {
      try {
        const parsed = new URL(dto.callbackUrl);
        const rawOrigins = this.configService.get<string>('CORS_ORIGINS') ?? 'http://localhost:3001';
        const allowedOrigins = rawOrigins
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean);

        const isAllowed =
          allowedOrigins.some((origin) => {
            try {
              return new URL(origin).origin === parsed.origin;
            } catch {
              return false;
            }
          }) || parsed.origin === new URL(defaultCallbackUrl).origin;

        if (isAllowed) {
          returnUrl = dto.callbackUrl;
        } else {
          this.logger.warn(
            `[PayDunya] Callback URL non autorisée (${dto.callbackUrl}). Utilisation de l'URL par défaut.`,
          );
        }
      } catch {
        this.logger.warn(
          `[PayDunya] Callback URL invalide (${dto.callbackUrl}). Utilisation de l'URL par défaut.`,
        );
      }
    }

    let result: PayDunyaCheckoutResponse;

    const isConfigured =
      masterKey &&
      !masterKey.includes('YOUR_') &&
      masterKey.trim() !== '' &&
      privateKey &&
      !privateKey.includes('YOUR_') &&
      privateKey.trim() !== '' &&
      publicKey &&
      !publicKey.includes('YOUR_') &&
      publicKey.trim() !== '' &&
      tokenKey &&
      !tokenKey.includes('YOUR_') &&
      tokenKey.trim() !== '';

    // Si les 4 clés PayDunya ne sont pas encore toutes configurées, mode Simulation Sandbox
    if (!isConfigured) {
      this.logger.warn(
        `[PayDunya] Clés API PayDunya incomplètes (Master/Public/Private/Token). Utilisation du mode Simulation Sandbox pour la commande #${order.reference}.`,
      );

      const mockTransactionId = `mock_pd_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const mockToken = `test_${Date.now()}`;
      const mockCheckoutUrl = `https://paydunya.com/sandbox-checkout/invoice/${mockToken}?amount=${serverCalculatedAmount}&reference=${encodeURIComponent(
        order.reference,
      )}`;

      result = {
        success: true,
        mode: 'sandbox_mock',
        transactionId: mockTransactionId,
        reference: order.reference,
        amount: serverCalculatedAmount,
        currency,
        checkoutUrl: mockCheckoutUrl,
        token: mockToken,
      };
    } else {
      // Mode Réel (Appel direct à l'API HTTP PayDunya Checkout Invoice)
      try {
        const isLive = environment === 'live' || environment === 'production';
        const baseUrl = isLive
          ? 'https://app.paydunya.com/api/v1'
          : 'https://app.paydunya.com/sandbox-api/v1';

        const invoiceItems: Record<string, any> = {};
        order.items.forEach((item, index) => {
          const unitPrice = Number(item.unitPrice);
          const totalPrice = unitPrice * item.quantity;
          invoiceItems[`item_${index}`] = {
            name: item.productName,
            quantity: item.quantity,
            unit_price: String(unitPrice),
            total_price: String(totalPrice),
            description: item.variantLabel ?? '',
          };
        });

        const payload = {
          invoice: {
            items: invoiceItems,
            total_amount: serverCalculatedAmount,
            description: `Paiement Commande ${order.reference} - ${order.boutique.name}`,
          },
          store: {
            name: order.boutique.name,
            tagline: 'Propulsé par ZennShop',
          },
          custom_data: {
            orderId: order.id,
            orderReference: order.reference,
            boutiqueId: order.boutiqueId,
            customerName: dto.customerName ?? order.customerName,
            customerPhone: dto.customerPhone ?? order.customerPhone,
          },
          actions: {
            cancel_url: cancelUrl,
            return_url: returnUrl,
            ...(ipnUrl ? { callback_url: ipnUrl } : {}),
          },
        };

        const response = await fetch(`${baseUrl}/checkout-invoice/create`, {
          method: 'POST',
          headers: {
            'PAYDUNYA-MASTER-KEY': masterKey,
            'PAYDUNYA-PRIVATE-KEY': privateKey,
            'PAYDUNYA-PUBLIC-KEY': publicKey,
            'PAYDUNYA-TOKEN': tokenKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          this.logger.error(`Erreur HTTP API PayDunya (${response.status}): ${errText}`);
          throw new BadRequestException(
            `Erreur lors de la création de la facture PayDunya : ${errText}`,
          );
        }

        const data = await response.json();

        if (data.response_code !== '00') {
          this.logger.error(
            `Rejet API PayDunya (${data.response_code}): ${data.response_text ?? data.description}`,
          );
          throw new BadRequestException(
            `PayDunya a refusé la création de la facture (${data.response_code}): ${data.response_text ?? data.description}`,
          );
        }

        const token = String(data.token);
        const checkoutUrl =
          data.response_text ??
          `https://paydunya.com/${isLive ? 'checkout' : 'sandbox-checkout'}/invoice/${token}`;

        result = {
          success: true,
          mode: isLive ? 'live' : 'sandbox',
          transactionId: token,
          reference: order.reference,
          amount: serverCalculatedAmount,
          currency,
          checkoutUrl,
          token,
        };
      } catch (error: any) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.error(`Échec de la communication avec PayDunya API: ${error.message}`);
        throw new InternalServerErrorException(
          `Impossible d'initialiser le paiement PayDunya : ${error.message}`,
        );
      }
    }

    // === CORRECTIF C2 — LIAISON FACTURE ↔ COMMANDE ET MONTANT ATTENDU ===
    // Le token de la facture émise et le montant facturé sont figés sur la
    // commande. C'est CETTE trace serveur qui sera confrontée, au moment du
    // règlement, au token et au montant réellement encaissés par PayDunya.
    // Sans elle, une facture émise pour une autre commande — ou créée depuis
    // le dashboard PayDunya, hors de notre API — pourrait solder celle-ci.
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paydunyaToken: result.token,
        paydunyaAmount: result.amount,
      },
    });

    // Sauvegarde du résultat dans l'idempotence si une clé a été fournie
    if (idempotencyKey) {
      await this.idempotencyService.saveRecord(idempotencyKey, path, 201, result);
    }

    return result;
  }

  /**
   * ÉTAPE 6 DU FLUX DE PAIEMENT : WEBHOOK IPN PAYDUNYA
   * - Vérification cryptographique de la signature (SHA-512 de la Master Key ou HMAC) — FAIL-CLOSED
   * - Vérification de l'idempotence pour prévenir le double traitement
   * - Mise à jour du statut de la commande en PAID + Crédit boutique + Séquestre + Notifications
   */
  async handleWebhook(rawBody: string | Buffer, signatureHeader?: string, bodyPayload?: any) {
    const masterKey =
      this.configService.get<string>('PAYDUNYA_MASTER_KEY') ||
      this.configService.get<string>('PAYDUNYA_WEBHOOK_SECRET');

    // 1. Vérification stricte du secret PayDunya — FAIL-CLOSED :
    //    sans Master Key configurée (valeur absente, vide ou placeholder), le
    //    webhook est REJETÉ.
    if (!masterKey || masterKey.trim() === '' || masterKey.includes('YOUR_')) {
      this.logger.error(
        '[PayDunya Webhook] PAYDUNYA_MASTER_KEY non configurée — webhook IPN rejeté (fail-closed). ' +
          'Configurez la Clé Principale depuis le dashboard PayDunya pour activer les notifications IPN.',
      );
      throw new BadRequestException(
        'Configuration de sécurité Webhook PayDunya manquante — événement rejeté.',
      );
    }

    const parsedBody =
      typeof bodyPayload === 'object' && bodyPayload !== null
        ? bodyPayload
        : (() => {
            try {
              return JSON.parse(rawBody.toString());
            } catch {
              return {};
            }
          })();

    // PayDunya IPN envoie `data` (avec `data.hash` = SHA-512 de la Master Key) ou un en-tête `x-paydunya-signature`
    const ipnData = parsedBody.data ?? parsedBody;
    const providedHashOrSignature =
      signatureHeader ?? ipnData?.hash ?? parsedBody?.hash;

    if (!providedHashOrSignature) {
      this.logger.error(
        '[PayDunya Webhook] Signature/Hash manquant (data.hash ou x-paydunya-signature).',
      );
      throw new BadRequestException(
        'Signature ou hash PayDunya manquant (data.hash ou x-paydunya-signature).',
      );
    }

    const isVerified = this.verifyWebhookSignature(
      rawBody,
      String(providedHashOrSignature),
      masterKey,
    );
    if (!isVerified) {
      this.logger.error('[PayDunya Webhook] Signature / Hash SHA-512 invalide rejeté !');
      throw new BadRequestException('Signature du Webhook PayDunya invalide.');
    }

    const status =
      ipnData?.status ??
      parsedBody?.status ??
      parsedBody?.event ??
      parsedBody?.name;
    const invoice = ipnData?.invoice ?? parsedBody?.entity ?? parsedBody?.transaction ?? {};
    const customData =
      ipnData?.custom_data ??
      invoice?.custom_data ??
      invoice?.custom_metadata ??
      parsedBody?.custom_data ??
      {};

    this.logger.log(`[PayDunya Webhook] Notification IPN reçue — statut : ${status}`);

    // === CORRECTIF C2 — MONTANT ENCAISSÉ ET TOKEN DE LA FACTURE ===
    // Le payload IPN contient le montant réellement demandé au payeur
    // (`data.invoice.total_amount`) et le token de la facture. Ces deux
    // données serveur sont lues ICI, pour la première fois, et seront
    // confrontées au montant attendu et à la liaison facture ↔ commande
    // avant tout crédit.
    const invoiceToken = invoice?.token ?? ipnData?.token ?? parsedBody?.token;
    const paidAmount =
      this.extractTotalAmount(ipnData) ??
      this.extractTotalAmount(parsedBody) ??
      this.extractTotalAmount(invoice);

    // Identifiant d'événement unique strict pour l'idempotence du webhook (anti-rejeu)
    const eventId =
      invoice?.token ??
      ipnData?.token ??
      parsedBody?.id ??
      invoice?.id ??
      ipnData?.receipt_identifier;
    if (!eventId) {
      this.logger.warn('[PayDunya Webhook] Événement rejeté : aucun token/identifiant unique fourni.');
      throw new BadRequestException("Identifiant d'événement / token PayDunya requis");
    }
    const idempotencyKey = `paydunya_webhook_${eventId}`;

    const cached = await this.idempotencyService.getRecord(
      idempotencyKey,
      '/api/v1/payments/paydunya/webhook',
    );
    if (cached) {
      this.logger.log(
        `[PayDunya Webhook] Événement ${eventId} déjà traité. Re-renvoi de la réponse 200.`,
      );
      return cached.responseBody;
    }

    let responseResult = { received: true, status: 'ignored' };

    // Traitement de l'événement de validation de paiement PayDunya (`completed`)
    const isCompleted =
      status === 'completed' ||
      status === 'invoice.completed' ||
      status === 'transaction.approved' ||
      status === 'transaction.paid' ||
      status === 'approved';

    if (isCompleted) {
      if (customData.type === 'SUBSCRIPTION' && customData.userId && customData.planSlug) {
        await this.settleSubscriptionViaPayDunya(
          String(customData.userId),
          String(customData.planSlug),
        );
        responseResult = { received: true, status: 'subscription_activated' };
      } else {
        // === CORRECTIF C2 — IDENTIFICATION DE LA COMMANDE ===
        // La commande est identifiée UNIQUEMENT par les données que NOUS avons
        // posées dans `custom_data` à l'émission de la facture. Les
        // alternatives précédentes (`invoice.reference_id`,
        // `invoice.reference`) sont retirées : elles sont alimentées par une
        // facture et pourraient être renseignées par un tiers sur une facture
        // créée hors de notre API — une simple collision de référence
        // suffirait alors à viser une commande.
        const orderId = customData.orderId ? String(customData.orderId) : undefined;
        const orderRef = customData.orderReference
          ? String(customData.orderReference)
          : undefined;

        if (!orderId && !orderRef) {
          this.logger.error(
            '[PayDunya Webhook] Aucun orderId ni orderReference dans les custom_data de la facture — règlement refusé.',
          );
          throw new BadRequestException(
            'Facture PayDunya sans référence de commande exploitable — règlement refusé.',
          );
        }

        const settleStatus = await this.settlePaidOrderViaPayDunya({
          token: invoiceToken ? String(invoiceToken) : undefined,
          transactionId: String(invoiceToken ?? eventId ?? 'PAYDUNYA_TX'),
          orderId,
          orderRef,
          paidAmount,
        });
        if (settleStatus) {
          responseResult = { received: true, status: settleStatus };
        }
      }
    }

    await this.idempotencyService.saveRecord(
      idempotencyKey,
      '/api/v1/payments/paydunya/webhook',
      200,
      responseResult,
    );
    return responseResult;
  }

  /**
   * Confirmation directe d'une facture PayDunya via son token (`GET /checkout-invoice/confirm/:token`).
   * Idéal au retour du client sur `return_url` (notamment en `localhost` sans tunnel IPN)
   * ou en double vérification serveur-à-serveur.
   *
   * CORRECTIF C2 — Cette méthode est désormais un point de règlement SÉCURISÉ :
   *  - la commande n'est PLUS déduite d'un `?orderId=` fourni par l'appelant ;
   *    elle provient des DONNÉES SERVEUR de la facture (`custom_data`) ;
   *  - le token doit être celui que nous avons émis pour CETTE commande ;
   *  - le montant encaissé (`invoice.total_amount`) doit être EXACTEMENT le
   *    montant facturé ;
   *  - l'appelant doit être authentifié ET propriétaire de la commande.
   */
  async confirmTransactionByToken(token: string, requester: AuthenticatedUser) {
    const cleanToken = token?.trim();
    if (!cleanToken) {
      throw new BadRequestException('Token de facture PayDunya requis.');
    }

    const cleanKey = (v?: string) => (v ?? '').trim().replace(/^['"]|['"]$/g, '').trim();
    const masterKey = cleanKey(this.configService.get<string>('PAYDUNYA_MASTER_KEY'));
    const publicKey = cleanKey(this.configService.get<string>('PAYDUNYA_PUBLIC_KEY'));
    const privateKey = cleanKey(this.configService.get<string>('PAYDUNYA_PRIVATE_KEY'));
    const tokenKey = cleanKey(this.configService.get<string>('PAYDUNYA_TOKEN'));
    const environment = cleanKey(this.configService.get<string>('PAYDUNYA_ENVIRONMENT') ?? 'sandbox');

    const isConfigured =
      masterKey &&
      !masterKey.includes('YOUR_') &&
      masterKey.trim() !== '' &&
      privateKey &&
      !privateKey.includes('YOUR_') &&
      privateKey.trim() !== '' &&
      publicKey &&
      !publicKey.includes('YOUR_') &&
      publicKey.trim() !== '' &&
      tokenKey &&
      !tokenKey.includes('YOUR_') &&
      tokenKey.trim() !== '';

    if (!isConfigured) {
      throw new BadRequestException(
        'Les 4 clés API PayDunya (Master, Public, Private, Token) doivent être configurées pour vérifier une facture auprès de PayDunya.',
      );
    }

    const isLive = environment === 'live' || environment === 'production';
    const baseUrl = isLive
      ? 'https://app.paydunya.com/api/v1'
      : 'https://app.paydunya.com/sandbox-api/v1';

    let data: any;
    try {
      const response = await fetch(
        `${baseUrl}/checkout-invoice/confirm/${encodeURIComponent(cleanToken)}`,
        {
          method: 'GET',
          headers: {
            'PAYDUNYA-MASTER-KEY': masterKey,
            'PAYDUNYA-PRIVATE-KEY': privateKey,
            'PAYDUNYA-PUBLIC-KEY': publicKey,
            'PAYDUNYA-TOKEN': tokenKey,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Erreur HTTP PayDunya Confirm (${response.status}): ${errText}`);
        throw new BadRequestException(
          `Impossible de vérifier la facture PayDunya : ${errText}`,
        );
      }

      data = await response.json();
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Échec de vérification PayDunya Confirm: ${error.message}`);
      throw new InternalServerErrorException(
        `Erreur de communication avec PayDunya lors de la confirmation : ${error.message}`,
      );
    }

    if (data.response_code !== '00') {
      throw new BadRequestException(
        `Facture PayDunya introuvable ou invalide (${data.response_code}): ${data.response_text ?? ''}`,
      );
    }

    const invoiceStatus = String(data.status ?? 'pending');
    const customData = data.custom_data ?? data.invoice?.custom_data ?? {};

    // === CORRECTIF C2 — MONTANT RÉELLEMENT ENCAISSÉ ===
    // La réponse `confirm` de PayDunya porte le montant de la facture
    // (`invoice.total_amount`). Il est lu ICI — il ne l'était jamais — et sera
    // comparé au montant facturé attendu avant tout crédit.
    const paidAmount = this.extractTotalAmount(data);

    // === CORRECTIF C2 — SUPPRESSION DU `?orderId=` ===
    // La commande ne provient PLUS d'un paramètre fourni par l'appelant :
    // elle est déduite des DONNÉES SERVEUR de la facture (les `custom_data`
    // que nous avons posés à l'émission). Un token devinable ne peut donc
    // plus désigner une commande arbitraire.
    const orderId = customData.orderId ? String(customData.orderId) : undefined;
    const orderRef = customData.orderReference
      ? String(customData.orderReference)
      : undefined;

    let settlementResult: string | null = null;
    if (
      invoiceStatus === 'completed' &&
      customData.type === 'SUBSCRIPTION' &&
      customData.userId &&
      customData.planSlug
    ) {
      // CORRECTIF C2 — Contrôle de propriété : l'abonnement ne peut être
      // activé que par le compte concerné.
      if (String(customData.userId) !== requester.id) {
        throw new ForbiddenException(
          "Vous n'êtes pas autorisé à confirmer le paiement de cet abonnement.",
        );
      }
      await this.settleSubscriptionViaPayDunya(
        String(customData.userId),
        String(customData.planSlug),
      );
      settlementResult = 'subscription_activated';
    } else if (invoiceStatus === 'completed') {
      if (!orderId && !orderRef) {
        this.logger.error(
          `[PayDunya] Facture ${cleanToken} sans référence de commande exploitable — règlement refusé.`,
        );
        throw new BadRequestException(
          'Facture PayDunya sans référence de commande exploitable — règlement refusé.',
        );
      }
      settlementResult = await this.settlePaidOrderViaPayDunya({
        token: cleanToken,
        transactionId: cleanToken,
        orderId,
        orderRef,
        paidAmount,
        requester,
      });
    }

    return {
      success: invoiceStatus === 'completed',
      token: cleanToken,
      paydunyaStatus: invoiceStatus,
      orderId: orderId ?? null,
      orderReference: orderRef ?? null,
      settlementStatus: settlementResult ?? 'not_settled',
      receiptUrl: data.receipt_url ?? null,
    };
  }

  /**
   * Active atomiquement l'abonnement commerçant après validation d'une facture PayDunya Checkout.
   */
  private async settleSubscriptionViaPayDunya(userId: string, planSlug: string) {
    const normalizedSlug = planSlug.toLowerCase();
    const PLAN_PRICES: Record<string, { name: string; price: number; sortOrder: number }> = {
      starter: { name: 'Starter', price: 0, sortOrder: 1 },
      pro: { name: 'Pro', price: 15000, sortOrder: 2 },
      business: { name: 'Business', price: 12500, sortOrder: 3 },
      enterprise: { name: 'Enterprise', price: 45000, sortOrder: 4 },
    };
    const meta = PLAN_PRICES[normalizedSlug] ?? { name: normalizedSlug, price: 12500, sortOrder: 3 };

    const planRecord = await this.prisma.plan.upsert({
      where: { slug: normalizedSlug },
      update: { isActive: true },
      create: {
        slug: normalizedSlug,
        name: meta.name,
        price: meta.price,
        isActive: true,
        sortOrder: meta.sortOrder,
      },
    });

    const boutiques = await this.prisma.boutique.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.boutique.updateMany({
        where: { ownerId: userId },
        data: { plan: normalizedSlug },
      });

      for (const b of boutiques) {
        await tx.subscription.upsert({
          where: { boutiqueId: b.id },
          update: {
            planId: planRecord.id,
            status: SubscriptionStatus.ACTIVE,
            price: meta.price,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelledAt: null,
          },
          create: {
            boutiqueId: b.id,
            planId: planRecord.id,
            status: SubscriptionStatus.ACTIVE,
            price: meta.price,
            startsAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
      }
    });
  }

  /**
   * Transaction atomique partagée entre le Webhook IPN et la confirmation directe par Token :
   * passe la commande en PAID, calcule la commission selon le plan vendeur, crédite le solde net,
   * verrouille l'allocation de séquestre (SettlementAllocation) et attribue le cashback/parrainage.
   *
   * CORRECTIF C2 — Avant tout crédit, la facture est RÉCONCILIÉE avec la commande :
   * propriété de la commande, liaison facture ↔ commande, montant encaissé vs
   * montant facturé. Toute anomalie interrompt le règlement (fail-closed) :
   * aucun euro n'est crédité sur la base d'une facture non vérifiée.
   */
  private async settlePaidOrderViaPayDunya(params: {
    token?: string;
    transactionId?: string;
    orderId?: string;
    orderRef?: string;
    paidAmount: number | null;
    requester?: AuthenticatedUser;
  }): Promise<'order_paid_success' | 'order_already_paid' | null> {
    const {
      token,
      transactionId = 'PAYDUNYA_TX',
      orderId,
      orderRef,
      paidAmount,
      requester,
    } = params;

    if (!orderId && !orderRef) {
      this.logger.error(
        '[PayDunya] Règlement refusé : aucune commande identifiable dans les données de la facture.',
      );
      return null;
    }

    const order = await this.prisma.order.findFirst({
      where: orderId ? { id: orderId } : { reference: orderRef! },
      include: { boutique: true },
    });

    if (!order) {
      this.logger.error(
        `[PayDunya] Règlement refusé : aucune commande ne correspond à la facture reçue (orderId=${orderId ?? '-'}, orderRef=${orderRef ?? '-'}).`,
      );
      return null;
    }

    // --- CORRECTIF C2 — CONTRÔLE DE PROPRIÉTÉ ---
    // Placé AVANT la réconciliation : un appelant non propriétaire ne doit pas
    // pouvoir apprendre quoi que ce soit sur la commande (montant, état) en
    // provoquant un message d'erreur détaillé.
    if (requester && !this.isOrderOwnedBy(order, requester.id)) {
      this.logger.warn(
        `[PayDunya] Règlement refusé : l'utilisateur ${requester.id} ne possède pas la commande #${order.reference}.`,
      );
      throw new ForbiddenException(
        `Vous n'êtes pas autorisé à confirmer le paiement de la commande #${order.reference}.`,
      );
    }

    // --- CORRECTIF C2 — RÉCONCILIATION FACTURE ↔ COMMANDE ---
    this.assertInvoiceMatchesOrder(order, token, paidAmount);

    if (order.status === OrderStatus.PAID) {
      this.logger.log(
        `[PayDunya] La commande #${order.reference} était déjà marquée comme PAYÉE.`,
      );
      return 'order_already_paid';
    }

    await this.prisma.$transaction(async (tx) => {
      // === CORRECTIF C3 — IDEMPOTENCE MÉTIER (AVANT TOUT CRÉDIT) ===
      // Un règlement déjà enregistré pour cette facture (PSP, token, nature
      // CAPTURE) interdit tout nouveau crédit. La contrainte UNIQUE
      // (provider, providerRef, kind) de la table `Payment` en est la preuve :
      // le double crédit devient IMPOSSIBLE, et pas seulement improbable.
      const alreadyCaptured = await tx.payment.findUnique({
        where: {
          provider_ref_kind: {
            provider: 'PAYDUNYA',
            providerRef: transactionId,
            kind: PaymentKind.CAPTURE,
          },
        },
        select: { id: true },
      });
      if (alreadyCaptured) {
        this.logger.log(
          `[PayDunya] Règlement déjà enregistré pour la facture ${transactionId} — aucun nouveau crédit.`,
        );
        return;
      }

      // Verrouillage optimiste sur le statut !== PAID pour éviter tout double crédit en concurrence IPN + Return URL
      const updatedCount = await tx.order.updateMany({
        where: { id: order.id, status: { not: OrderStatus.PAID } },
        data: {
          status: OrderStatus.PAID,
          paymentMethod: PaymentMethod.PAYDUNYA,
          paymentRef: `PAYDUNYA-${transactionId}`,
          paidAt: new Date(),
        },
      });

      if (updatedCount.count === 0) {
        return;
      }

      // === CALCUL DU MODELE ECONOMIQUE & COMMISSIONS ===
      const grossTotal = Number(order.total) + Number(order.pointsUsed || 0);
      let userPlan = 'starter';
      let commissionRate = 5.0; // 5% par défaut
      const boutique = order.boutique;
      if (boutique) {
        const userBoutiques = await tx.boutique.findMany({
          where: { ownerId: boutique.ownerId },
          select: { plan: true },
        });
        if (userBoutiques.some((b) => b.plan === 'enterprise')) {
          userPlan = 'enterprise';
          commissionRate = 1.5;
        } else if (userBoutiques.some((b) => b.plan === 'business')) {
          userPlan = 'business';
          commissionRate = 2.0;
        }
      }

      const commissionAmount = Number((grossTotal * (commissionRate / 100)).toFixed(2));
      const netAmount = grossTotal - commissionAmount;

      await tx.order.update({
        where: { id: order.id },
        data: {
          commissionRate,
          commissionAmount,
          netAmount,
          planAtPurchase: userPlan,
        },
      });

      // === CORRECTIF C3 — CRÉDIT DU SOLDLE + ÉCRITURE COMPTABLE ===
      // Le mouvement de solde et son écriture comptable (partie double) sont
      // effectués dans la MÊME transaction : ils ne peuvent pas diverger.
      //
      // Journal de l'encaissement :
      //   DÉBIT  PLATFORM_ESCROW  ← fonds collectés auprès du client
      //   DÉBIT  PLATFORM_LOYALTY ← coût des points de fidélité, absorbé par
      //                              la plateforme (« la plateforme absorbe le
      //                              coût commercial des points »)
      //   CRÉDIT BOUTIQUE:<id>     → dette de la plateforme envers le vendeur
      //   CRÉDIT PLATFORM_REVENUE → commission de la plateforme
      //
      // Débit total = total + points ; crédit total = net + commission = total
      // + points. L'écriture est équilibrée par construction.
      const cashCollected = Number(order.total);
      const pointsUsed = Number(order.pointsUsed || 0);

      await this.ledgerService.creditBoutique(tx, order.boutiqueId, netAmount, {
        counterpart: [
          {
            accountCode: LedgerAccounts.ESCROW,
            direction: LedgerDirection.DEBIT,
            amount: cashCollected,
          },
          {
            accountCode: LedgerAccounts.LOYALTY,
            direction: LedgerDirection.DEBIT,
            amount: pointsUsed,
          },
          {
            accountCode: LedgerAccounts.REVENUE,
            direction: LedgerDirection.CREDIT,
            amount: commissionAmount,
          },
        ],
        description: `Encaissement PayDunya — commande #${order.reference}`,
        orderId: order.id,
        payment: {
          provider: 'PAYDUNYA',
          providerRef: transactionId,
          kind: PaymentKind.CAPTURE,
          direction: PaymentDirection.IN,
          grossAmount: cashCollected,
          netAmount,
          orderId: order.id,
          boutiqueId: order.boutiqueId,
        },
      });

      // Synchronisation atomique de l'allocation de séquestre (SettlementAllocation)
      const existingSellerAlloc = await tx.settlementAllocation.findFirst({
        where: {
          orderId: order.id,
          beneficiaryType: 'SELLER_BOUTIQUE',
        },
      });
      if (existingSellerAlloc) {
        await tx.settlementAllocation.update({
          where: { id: existingSellerAlloc.id },
          data: {
            grossAmountFcfa: grossTotal,
            commissionRate,
            commissionAmountFcfa: commissionAmount,
            netAmountFcfa: netAmount,
            status:
              existingSellerAlloc.status === 'PENDING_PAYMENT'
                ? 'AWAITING_DELIVERY_VERIFICATION'
                : existingSellerAlloc.status,
          },
        });
      } else {
        const existingShipment = await tx.shipment.findFirst({
          where: { orderId: order.id },
          select: { id: true },
        });
        await tx.settlementAllocation.create({
          data: {
            orderId: order.id,
            shipmentId: existingShipment?.id ?? null,
            beneficiaryType: 'SELLER_BOUTIQUE',
            beneficiaryId: order.boutiqueId,
            grossAmountFcfa: grossTotal,
            commissionRate,
            commissionAmountFcfa: commissionAmount,
            netAmountFcfa: netAmount,
            status: 'AWAITING_DELIVERY_VERIFICATION',
          },
        });
      }

      await tx.shipment.updateMany({
        where: { orderId: order.id, status: 'AWAITING_PREPARATION' },
        data: { status: 'READY_FOR_DISPATCH' },
      });

      // === CASHBACK ET PARRAINAGE (0.5%) ===
      const pointsEarned = Math.floor(grossTotal * 0.005);
      if (order.userId && pointsEarned > 0) {
        const buyer = await tx.user.findUnique({ where: { id: order.userId } });
        if (buyer) {
          await tx.user.update({
            where: { id: buyer.id },
            data: { pointsBalance: { increment: pointsEarned } },
          });
          await tx.pointTransaction.create({
            data: {
              userId: buyer.id,
              amount: pointsEarned,
              reason: 'CASHBACK_PURCHASE',
              orderId: order.id,
            },
          });

          if (buyer.referredById) {
            await tx.user.update({
              where: { id: buyer.referredById },
              data: { pointsBalance: { increment: pointsEarned } },
            });
            await tx.pointTransaction.create({
              data: {
                userId: buyer.referredById,
                amount: pointsEarned,
                reason: 'CASHBACK_REFERRAL',
                orderId: order.id,
              },
            });
          }
        }
      }

      // Création d'une notification pour le vendeur
      await tx.notification.create({
        data: {
          boutiqueId: order.boutiqueId,
          type: 'order_paid',
          title: `Paiement PayDunya reçu (${order.reference})`,
          message: `La commande #${order.reference} d'un montant de ${order.total} FCFA a été payée avec succès via PayDunya.`,
          orderReference: order.reference,
        },
      });
    });

    this.logger.log(
      `[PayDunya] Commande #${order.reference} marquée comme PAYÉE via PayDunya.`,
    );
    return 'order_paid_success';
  }

  /**
   * CORRECTIF C2 — Réconciliation de la facture PayDunya avec la commande attendue.
   *
   * Tous les contrôles sont FAIL-CLOSED : dès qu'un contrôle ne peut pas être
   * satisfait, une BadRequestException est levée et AUCUN crédit n'a lieu.
   *
   *  1. MONTANT — le montant encaissé (`invoice.total_amount`) doit être connu
   *     et être EXACTEMENT le montant facturé (`Order.paydunyaAmount`, figé à
   *     l'émission de la facture).
   *  2. COHÉRENCE — le total de la commande ne doit pas avoir bougé depuis
   *     l'émission : sinon l'écart entre la facture et la commande serait
   *     absorbé silencieusement par la boutique.
   *  3. LIAISON — le token encaissé doit être celui que NOUS avons émis pour
   *     CETTE commande (`Order.paydunyaToken`). Une facture émise pour une
   *     autre commande, ou créée depuis le dashboard PayDunya, est rejetée.
   */
  private assertInvoiceMatchesOrder(
    order: {
      id: string;
      reference: string;
      total: unknown;
      paydunyaToken: string | null;
      paydunyaAmount: unknown;
    },
    invoiceToken: string | undefined,
    paidAmount: number | null,
  ): void {
    // (1) Le montant encaissé doit être connu.
    if (paidAmount === null || !Number.isFinite(paidAmount)) {
      this.logger.error(
        `[PayDunya] Règlement refusé pour la commande #${order.reference} : montant de la facture introuvable dans la réponse PayDunya.`,
      );
      throw new BadRequestException(
        'Montant de la facture PayDunya introuvable — règlement refusé.',
      );
    }

    // Le montant attendu = montant figé à l'émission de la facture.
    const expectedAmount =
      order.paydunyaAmount !== null && order.paydunyaAmount !== undefined
        ? Number(order.paydunyaAmount)
        : Number(order.total);

    if (!Number.isFinite(expectedAmount)) {
      this.logger.error(
        `[PayDunya] Règlement refusé pour la commande #${order.reference} : montant attendu illisible.`,
      );
      throw new BadRequestException(
        'Montant attendu de la commande illisible — règlement refusé.',
      );
    }

    // Le montant encaissé doit être EXACTEMENT le montant facturé.
    if (Math.abs(paidAmount - expectedAmount) > AMOUNT_TOLERANCE) {
      this.logger.error(
        `[PayDunya] MONTANT INCOHÉRENT — commande #${order.reference} : ${expectedAmount} FCFA facturés, ${paidAmount} FCFA encaissés. Règlement refusé.`,
      );
      throw new BadRequestException(
        `Montant incohérent : ${expectedAmount} FCFA facturés, ${paidAmount} FCFA encaissés. Règlement refusé.`,
      );
    }

    // (2) Le total de la commande doit être resté identique à l'émission de
    //     la facture (sinon l'écart serait absorbé par la boutique).
    const orderTotal = Number(order.total);
    if (
      !Number.isFinite(orderTotal) ||
      Math.abs(orderTotal - expectedAmount) > AMOUNT_TOLERANCE
    ) {
      this.logger.error(
        `[PayDunya] Règlement refusé pour la commande #${order.reference} : le total de la commande (${orderTotal}) a été modifié après l'émission de la facture (${expectedAmount}).`,
      );
      throw new BadRequestException(
        'Le total de la commande a été modifié après l’émission de la facture — règlement refusé.',
      );
    }

    // (3) La facture doit être celle que NOUS avons émise pour CETTE commande.
    if (invoiceToken) {
      if (!order.paydunyaToken) {
        this.logger.error(
          `[PayDunya] Règlement refusé pour la commande #${order.reference} : aucune facture PayDunya enregistrée pour cette commande.`,
        );
        throw new BadRequestException(
          'Aucune facture PayDunya enregistrée pour cette commande — règlement refusé.',
        );
      }
      if (order.paydunyaToken !== invoiceToken) {
        this.logger.error(
          `[PayDunya] Règlement refusé pour la commande #${order.reference} : la facture ${invoiceToken} n'est pas celle émise pour cette commande (facture enregistrée : ${order.paydunyaToken}).`,
        );
        throw new BadRequestException(
          'Facture non rattachée à cette commande — règlement refusé.',
        );
      }
    } else {
      // Le token de facture n'est pas transporté par le payload : la liaison
      // facture ↔ commande ne peut pas être vérifiée. Le contrôle du montant
      // reste appliqué — on ne dégrade que la défense en profondeur.
      this.logger.warn(
        `[PayDunya] Token de facture absent du payload PayDunya pour la commande #${order.reference} : la liaison facture ↔ commande n'a pas pu être vérifiée (contrôle du montant toujours appliqué).`,
      );
    }
  }

  /**
   * CORRECTIF C2 — Le demandeur est-il autorisé à déclencher le règlement de
   * cette commande ? Client de la commande ou propriétaire de la boutique.
   */
  private isOrderOwnedBy(
    order: { userId?: string | null; boutique?: { ownerId?: string | null } | null },
    userId: string,
  ): boolean {
    return order.userId === userId || order.boutique?.ownerId === userId;
  }

  /**
   * CORRECTIF C2 — Extrait le montant total d'une charge utile PayDunya.
   *
   * Le montant est présent dans la réponse IPN (`data.invoice.total_amount`)
   * comme dans la réponse `confirm` (`invoice.total_amount`). Selon le
   * sérialiseur, il arrive en nombre (JSON) ou en chaîne : les deux formes
   * sont acceptées. Retourne `null` si aucun montant exploitable n'est
   * présent — l'appelant doit alors REFUSER le règlement (fail-closed),
   * jamais présumer le montant attendu.
   */
  private extractTotalAmount(payload: any): number | null {
    const candidates = [
      payload?.invoice?.total_amount,
      payload?.total_amount,
      payload?.invoice?.invoice?.total_amount,
      payload?.invoice?.amount,
      payload?.amount,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'number' && typeof candidate !== 'string') continue;
      const raw = typeof candidate === 'string' ? candidate.trim() : candidate;
      if (raw === '') continue;
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }

    return null;
  }

  /**
   * Vérifie l'authenticité du Webhook IPN PayDunya :
   * 1. Standard officiel PayDunya IPN : `data.hash === SHA-512(PAYDUNYA_MASTER_KEY)`
   * 2. Signature HMAC SHA-256 / SHA-512 sur le payload brut (si envoyée en en-tête)
   * Toutes les comparaisons utilisent `crypto.timingSafeEqual` (temps constant).
   */
  private verifyWebhookSignature(
    rawBody: string | Buffer,
    receivedHashOrSignature: string,
    masterKey: string,
  ): boolean {
    try {
      const cleaned = receivedHashOrSignature.trim();
      if (!cleaned) {
        return false;
      }

      // 1. Standard officiel PayDunya IPN : SHA-512 de la Master Key
      const expectedMasterKeySha512 = crypto
        .createHash('sha512')
        .update(masterKey)
        .digest('hex');

      if (/^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length % 2 === 0) {
        const receivedBuffer = Buffer.from(cleaned, 'hex');
        const sha512Buffer = Buffer.from(expectedMasterKeySha512, 'hex');
        if (
          receivedBuffer.length === sha512Buffer.length &&
          crypto.timingSafeEqual(sha512Buffer, receivedBuffer)
        ) {
          return true;
        }
      }

      // 2. Support HMAC-SHA256 / HMAC-SHA512 (avec ou sans timestamp)
      const parts = cleaned.split(',');
      let timestamp = '';
      let signatureHex = '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith('t=')) {
          timestamp = trimmed.substring(2);
        } else if (trimmed.startsWith('s=')) {
          signatureHex = trimmed.substring(2);
        } else if (trimmed.startsWith('v1=')) {
          signatureHex = trimmed.substring(3);
        } else if (!trimmed.includes('=')) {
          signatureHex = trimmed;
        }
      }

      if (!signatureHex || !/^[0-9a-fA-F]+$/.test(signatureHex) || signatureHex.length % 2 !== 0) {
        return false;
      }

      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
      const targetBuffer = Buffer.from(signatureHex, 'hex');

      if (timestamp) {
        const computedWithTimestamp = crypto
          .createHmac('sha256', masterKey)
          .update(`${timestamp}.${bodyStr}`)
          .digest('hex');
        const withTimestampBuffer = Buffer.from(computedWithTimestamp, 'hex');
        if (
          targetBuffer.length === withTimestampBuffer.length &&
          crypto.timingSafeEqual(withTimestampBuffer, targetBuffer)
        ) {
          return true;
        }
      }

      const computedDirectSha256 = crypto
        .createHmac('sha256', masterKey)
        .update(bodyStr)
        .digest('hex');
      const directSha256Buffer = Buffer.from(computedDirectSha256, 'hex');
      if (
        targetBuffer.length === directSha256Buffer.length &&
        crypto.timingSafeEqual(directSha256Buffer, targetBuffer)
      ) {
        return true;
      }

      const computedDirectSha512 = crypto
        .createHmac('sha512', masterKey)
        .update(bodyStr)
        .digest('hex');
      const directSha512Buffer = Buffer.from(computedDirectSha512, 'hex');
      if (
        targetBuffer.length === directSha512Buffer.length &&
        crypto.timingSafeEqual(directSha512Buffer, targetBuffer)
      ) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }
}
