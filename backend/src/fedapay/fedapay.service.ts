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
import { PaymentCryptoService } from '../common/crypto/payment-crypto.service';
import { CreateFedaPayTransactionDto } from './dto/create-fedapay-transaction.dto';
import { InviteSubAccountDto, LinkSubAccountDto } from './dto/subaccount.dto';
import { RequestRefundDto, ApproveRefundDto, RejectRefundDto } from './dto/refund.dto';
import { CreateSubscriptionPaymentDto } from './dto/subscription-payment.dto';
import { ProcessWithdrawalPayoutDto } from './dto/withdrawal-payout.dto';
import { calculateFedaPayTransferFee } from './utils/transfer-fee.util';
import { OrderStatus, PaymentMethod, Role, RefundStatus, SubscriptionStatus } from '@prisma/client';

export interface FedaPayCheckoutResponse {
  success: boolean;
  mode: 'live' | 'sandbox_mock';
  transactionId: string;
  reference: string;
  amount: number;
  totalChargedToBuyer: number;
  buyerFee: number;
  buyerFeeRate: number;
  paymentChannel: 'MOBILE_MONEY' | 'CARD';
  currency: string;
  checkoutUrl: string;
  token: string;
  marketplaceSplit: {
    hasSubAccount: boolean;
    subAccountRef?: string | null;
    platformCommission: number;
    commissionRate: number;
    vendorFixedTransferFee: number;
    vendorNetShare: number;
  };
}

@Injectable()
export class FedaPayService {
  private readonly logger = new Logger(FedaPayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly idempotencyService: IdempotencyService,
    private readonly paymentCrypto: PaymentCryptoService,
  ) {}

  /**
   * SOUS-COMPTES FEDAPAY MARKETPLACE :
   * Invite un vendeur / boutique à créer son sous-compte FedaPay via l'API FedaPay :
   * POST /v1/auth/sub_account_invitations
   */
  async inviteSubAccount(dto: InviteSubAccountDto, user?: any) {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id: dto.boutiqueId },
    });

    if (!boutique) {
      throw new NotFoundException(`Boutique introuvable avec l'ID : ${dto.boutiqueId}`);
    }

    if (user && user.role !== Role.ADMIN && boutique.ownerId !== user.id) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à inviter un sous-compte pour cette boutique.");
    }

    const apiKey = this.configService.get<string>('FEDAPAY_SECRET_KEY');
    const environment = this.configService.get<string>('FEDAPAY_ENVIRONMENT') ?? 'sandbox';

    let invitationResponse: any;

    if (!apiKey || apiKey.includes('YOUR_') || apiKey.trim() === '') {
      this.logger.warn(
        `[FedaPay Marketplace] Clé non configurée. Simulation d'invitation sous-compte pour ${dto.email}.`,
      );
      invitationResponse = {
        success: true,
        mode: 'sandbox_mock',
        message: 'Invitation sous-compte simulée avec succès en mode Sandbox.',
        email: dto.email,
        full_name: dto.fullName,
        sub_account_invitation_id: `inv_mock_${Date.now()}`,
      };
    } else {
      const baseUrl =
        environment === 'live'
          ? 'https://api.fedapay.com/v1'
          : 'https://sandbox-api.fedapay.com/v1';

      try {
        const response = await fetch(`${baseUrl}/auth/sub_account_invitations`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: dto.email,
            full_name: dto.fullName,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          this.logger.error(`[FedaPay Sub-account Invitation Error] ${response.status}: ${errText}`);
          throw new BadRequestException(`Erreur invitation sous-compte FedaPay : ${errText}`);
        }

        invitationResponse = await response.json();
      } catch (error: any) {
        this.logger.error(`Échec appel invitation sous-compte : ${error.message}`);
        throw new InternalServerErrorException(`Impossible d'envoyer l'invitation FedaPay : ${error.message}`);
      }
    }

    const updated = await this.prisma.boutique.update({
      where: { id: boutique.id },
      data: {
        fedapaySubAccountStatus: 'INVITED',
      },
    });

    return {
      success: true,
      boutiqueId: updated.id,
      status: updated.fedapaySubAccountStatus,
      invitation: invitationResponse,
    };
  }

  /**
   * Associe la référence d'un sous-compte validé à la boutique (ex: acc_xxxxxxxxx)
   */
  async linkSubAccount(dto: LinkSubAccountDto, user?: any) {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id: dto.boutiqueId },
    });

    if (!boutique) {
      throw new NotFoundException(`Boutique introuvable : ${dto.boutiqueId}`);
    }

    if (user && user.role !== Role.ADMIN && boutique.ownerId !== user.id) {
      throw new ForbiddenException('Non autorisé à modifier cette boutique.');
    }

    const updated = await this.prisma.boutique.update({
      where: { id: boutique.id },
      data: {
        fedapaySubAccountRef: dto.subAccountRef,
        fedapaySubAccountStatus: 'ACTIVE',
      },
    });

    return {
      success: true,
      boutiqueId: updated.id,
      fedapaySubAccountRef: updated.fedapaySubAccountRef,
      fedapaySubAccountStatus: updated.fedapaySubAccountStatus,
    };
  }

  /**
   * Récupère les informations FedaPay Marketplace relatives à une boutique
   */
  async getSubAccountStatus(boutiqueId: string) {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id: boutiqueId },
      select: {
        id: true,
        name: true,
        fedapaySubAccountRef: true,
        fedapaySubAccountStatus: true,
        fedapayCommissionRate: true,
        fedapayVendorFixedFee: true,
      },
    });

    if (!boutique) {
      throw new NotFoundException(`Boutique introuvable avec l'ID ${boutiqueId}`);
    }

    const defaultFixedFee = Number(
      this.configService.get<string>('FEDAPAY_VENDOR_TRANSFER_FEE_FIXED') ?? 150,
    );

    return {
      success: true,
      boutique,
      defaultPlatformCommissionRate: 5.0, // 5% par défaut
      effectiveCommissionRate: Number(boutique.fedapayCommissionRate ?? 5.0),
      effectiveVendorFixedFee: Number(boutique.fedapayVendorFixedFee ?? defaultFixedFee),
    };
  }

  /**
   * Met à jour le taux de commission ou les frais fixes vendeur (Admin only)
   */
  async updateCommissionRate(
    boutiqueId: string,
    commissionRate: number,
    vendorFixedFee?: number,
    user?: any,
  ) {
    if (user && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Seuls les administrateurs peuvent modifier ces paramètres.');
    }

    if (commissionRate < 0 || commissionRate > 100) {
      throw new BadRequestException('Le taux de commission doit être compris entre 0 et 100%.');
    }

    const updateData: Record<string, any> = {
      fedapayCommissionRate: commissionRate,
    };

    if (vendorFixedFee !== undefined) {
      if (vendorFixedFee < 0) {
        throw new BadRequestException('Les frais fixes de transfert ne peuvent pas être négatifs.');
      }
      updateData.fedapayVendorFixedFee = vendorFixedFee;
    }

    const updated = await this.prisma.boutique.update({
      where: { id: boutiqueId },
      data: updateData,
    });

    return {
      success: true,
      boutiqueId: updated.id,
      fedapayCommissionRate: updated.fedapayCommissionRate,
      fedapayVendorFixedFee: updated.fedapayVendorFixedFee,
    };
  }

  /**
   * FLUX DE PAIEMENT SÉCURISÉ SELON LES 4 PILIERS :
   * 1. Idempotence : Clé transmise pour prévenir tout double-paiement accidentel
   * 2. Chiffrement E2EE : Données sensibles protégées
   * 3. Rate Limiting : Protégé au niveau du Controller via NestJS Throttler
   * 4. Zero-Trust Server Verification :
   *    - Le montant du panier est strictement extrait de la base
   *    - Frais acheteur : 2% si Mobile Money, 4% si Carte Bancaire
   *    - Total facturé à l'acheteur = Montant Commande + Frais Acheteur
   *    - Commission plateforme calculée côté serveur (ex: 5%)
   *    - Frais fixes appliqués au vendeur pour le transfert de l'acompte (ex: 150 FCFA)
   *    - Part nette vendeur reversée = Montant Commande - Commission Plateforme - Frais Fixes Vendeur
   *    - Répartition automatique FedaPay via `sub_accounts_commisssions`
   */
  async createCheckoutTransaction(
    dto: CreateFedaPayTransactionDto,
    idempotencyKey?: string,
    path = '/api/v1/payments/fedapay/create-transaction',
  ): Promise<FedaPayCheckoutResponse> {
    // 1. PILIER 1 : Idempotence
    if (idempotencyKey) {
      const cached = await this.idempotencyService.getRecord(idempotencyKey, path);
      if (cached) {
        return cached.responseBody as FedaPayCheckoutResponse;
      }
    }

    // 2. PILIER 4 : Zero-Trust - Chargement unilatéral depuis la base de données
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

    const orderAmount = Number(order.total);
    const currency = 'XOF'; // FCFA pour FedaPay dans l'espace UEMOA/CEMAC

    // Détermination du canal de paiement et calcul des frais acheteur
    const paymentChannel = dto.paymentChannel ?? 'MOBILE_MONEY';
    const buyerFeeRate = paymentChannel === 'CARD' ? 4 : 2; // 2% Mobile Money, 4% Carte bancaire
    const buyerFee = Math.round(orderAmount * (buyerFeeRate / 100));
    const totalChargedToBuyer = orderAmount + buyerFee;

    // Pas de commission marketplace appliquée au vendeur (0 XOF)
    const commissionRate = 0;
    const platformCommission = 0;

    // Frais fixes de transfert FedaPay appliqués au vendeur selon le montant à transférer (barème officiel) :
    // 0 - 10 000 : 150 XOF | 10 001 - 50 000 : 300 XOF | 50 001 - 150 000 : 800 XOF | 150 001 - 500 000 : 2 000 XOF | 500 001+ : 2 500 XOF
    const vendorFixedTransferFee = calculateFedaPayTransferFee(orderAmount);

    // Part nette finale du vendeur (Montant vente - Frais fixes de transfert)
    const vendorNetShare = Math.max(
      0,
      orderAmount - vendorFixedTransferFee,
    );

    const hasSubAccount =
      Boolean(order.boutique.fedapaySubAccountRef) &&
      order.boutique.fedapaySubAccountStatus === 'ACTIVE';

    // Mise à jour de la commande avec le détail financier complet
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        buyerPaymentChannel: paymentChannel,
        buyerFeeRate,
        buyerFeeAmount: buyerFee,
        totalCharged: totalChargedToBuyer,
        commissionRate,
        commissionAmount: platformCommission,
        vendorFixedFee: vendorFixedTransferFee,
        netAmount: vendorNetShare,
        fedapaySubAccountRef: order.boutique.fedapaySubAccountRef ?? null,
      },
    });

    const apiKey = this.configService.get<string>('FEDAPAY_SECRET_KEY');
    const environment = this.configService.get<string>('FEDAPAY_ENVIRONMENT') ?? 'sandbox';
    const defaultCallbackUrl =
      this.configService.get<string>('FEDAPAY_CALLBACK_URL') ??
      'http://localhost:3001/checkout/success';

    let callbackUrl = defaultCallbackUrl;
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
          callbackUrl = dto.callbackUrl;
        }
      } catch {
        this.logger.warn(`[FedaPay] URL de rappel invalide. Utilisation de l'URL par défaut.`);
      }
    }

    let result: FedaPayCheckoutResponse;

    // Mode simulation Sandbox Mock
    if (!apiKey || apiKey.includes('YOUR_') || apiKey.trim() === '') {
      this.logger.warn(
        `[FedaPay Marketplace] Clé non configurée. Simulation Sandbox pour la commande #${order.reference}.`,
      );

      const mockTransactionId = `mock_tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const mockToken = `mock_token_${Date.now()}`;
      const mockCheckoutUrl = `https://sandbox-checkout.fedapay.com/pay/${mockToken}?amount=${totalChargedToBuyer}&reference=${encodeURIComponent(
        order.reference,
      )}`;

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          fedapayTransactionId: mockTransactionId,
        },
      });

      result = {
        success: true,
        mode: 'sandbox_mock',
        transactionId: mockTransactionId,
        reference: order.reference,
        amount: orderAmount,
        totalChargedToBuyer,
        buyerFee,
        buyerFeeRate,
        paymentChannel,
        currency,
        checkoutUrl: mockCheckoutUrl,
        token: mockToken,
        marketplaceSplit: {
          hasSubAccount,
          subAccountRef: order.boutique.fedapaySubAccountRef,
          platformCommission,
          commissionRate,
          vendorFixedTransferFee,
          vendorNetShare,
        },
      };
    } else {
      // Mode Réel FedaPay API
      try {
        const baseUrl =
          environment === 'live'
            ? 'https://api.fedapay.com/v1'
            : 'https://sandbox-api.fedapay.com/v1';

        const payload: Record<string, any> = {
          description: `Commande ${order.reference} - ${order.boutique.name}`,
          amount: totalChargedToBuyer, // Montant total débité à l'acheteur
          currency: { iso: currency },
          callback_url: callbackUrl,
          customer: {
            firstname: dto.customerName ?? order.customerName,
            email: dto.customerEmail ?? order.customerEmail ?? 'client@afrique-os.com',
            phone_number: {
              number: dto.customerPhone ?? order.customerPhone,
            },
          },
          custom_metadata: {
            orderId: order.id,
            orderReference: order.reference,
            boutiqueId: order.boutiqueId,
            orderAmount,
            buyerFee,
            buyerFeeRate,
            paymentChannel,
            platformCommission,
            vendorFixedTransferFee,
            vendorNetShare,
          },
        };

        // Si le vendeur a un sous-compte actif, application de la répartition automatique
        if (hasSubAccount && order.boutique.fedapaySubAccountRef) {
          payload.sub_accounts_commisssions = [
            {
              reference: order.boutique.fedapaySubAccountRef,
              amount: vendorNetShare,
            },
          ];
          this.logger.log(
            `[FedaPay Marketplace] Répartition active: Part vendeur ${vendorNetShare} XOF (sous-compte ${order.boutique.fedapaySubAccountRef}), Débit acheteur ${totalChargedToBuyer} XOF`,
          );
        }

        const response = await fetch(`${baseUrl}/transactions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          this.logger.error(`Erreur API FedaPay (${response.status}): ${errText}`);
          throw new BadRequestException(`Erreur lors de la création de la transaction FedaPay : ${errText}`);
        }

        const data = await response.json();
        const transaction = data.v1?.transaction ?? data.transaction;

        const tokenResp = await fetch(`${baseUrl}/transactions/${transaction.id}/token`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        const tokenData = await tokenResp.json();
        const token = tokenData.token ?? tokenData.v1?.token?.token;
        const checkoutUrl =
          tokenData.url ??
          `https://${environment === 'live' ? 'checkout' : 'sandbox-checkout'}.fedapay.com/pay/${token}`;

        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            fedapayTransactionId: String(transaction.id),
          },
        });

        result = {
          success: true,
          mode: environment === 'live' ? 'live' : 'sandbox_mock',
          transactionId: String(transaction.id),
          reference: order.reference,
          amount: orderAmount,
          totalChargedToBuyer,
          buyerFee,
          buyerFeeRate,
          paymentChannel,
          currency,
          checkoutUrl,
          token,
          marketplaceSplit: {
            hasSubAccount,
            subAccountRef: order.boutique.fedapaySubAccountRef,
            platformCommission,
            commissionRate,
            vendorFixedTransferFee,
            vendorNetShare,
          },
        };
      } catch (error: any) {
        this.logger.error(`Échec communication FedaPay API: ${error.message}`);
        throw new InternalServerErrorException(`Impossible d'initialiser le paiement FedaPay : ${error.message}`);
      }
    }

    if (idempotencyKey) {
      await this.idempotencyService.saveRecord(idempotencyKey, path, 201, result);
    }

    return result;
  }

  /**
   * WEBHOOK FEDAPAY SÉCURISÉ (HMAC SHA-256 + Idempotence Anti-Rejeu)
   */
  async handleWebhook(rawBody: string | Buffer, signatureHeader?: string, bodyPayload?: any) {
    const webhookSecret = this.configService.get<string>('FEDAPAY_WEBHOOK_SECRET');
    const environment = this.configService.get<string>('FEDAPAY_ENVIRONMENT') ?? 'sandbox';

    if (
      environment === 'live' ||
      (webhookSecret && webhookSecret.trim() !== '' && !webhookSecret.includes('YOUR_'))
    ) {
      if (!signatureHeader) {
        this.logger.error('[FedaPay Webhook] En-tête de signature manquant (x-fedapay-signature).');
        throw new BadRequestException('En-tête de signature FedaPay manquant.');
      }

      if (!webhookSecret) {
        this.logger.error('[FedaPay Webhook] FEDAPAY_WEBHOOK_SECRET non configuré.');
        throw new BadRequestException('Configuration de sécurité Webhook manquante.');
      }

      const isVerified = this.verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
      if (!isVerified) {
        this.logger.error('[FedaPay Webhook] Signature HMAC invalide rejetée !');
        throw new BadRequestException('Signature du Webhook FedaPay invalide.');
      }
    }

    const event = typeof bodyPayload === 'object' ? bodyPayload : JSON.parse(rawBody.toString());
    const eventType = event.name ?? event.event ?? event.type;
    const entity = event.entity ?? event.data?.object ?? event.transaction;

    this.logger.log(`[FedaPay Webhook] Événement reçu : ${eventType}`);

    const eventId = event.id ?? event.transaction?.id ?? `tx_${Date.now()}`;
    const idempotencyKey = `fedapay_webhook_${eventId}`;

    const cached = await this.idempotencyService.getRecord(idempotencyKey, '/api/v1/payments/fedapay/webhook');
    if (cached) {
      this.logger.log(`[FedaPay Webhook] Événement ${eventId} déjà traité.`);
      return cached.responseBody;
    }

    let responseResult: { received: boolean; status: string } = { received: true, status: 'ignored' };

    // Transaction approuvée / payée
    if (eventType === 'transaction.approved' || eventType === 'transaction.paid' || event.status === 'approved') {
      const customMetadata = entity?.custom_metadata ?? {};
      const orderId = customMetadata.orderId ?? entity?.reference_id;
      const orderRef = customMetadata.orderReference ?? entity?.reference;
      const transactionId = String(entity?.id ?? 'FEDAPAY_TX');

      if (orderId || orderRef) {
        const order = await this.prisma.order.findFirst({
          where: orderId ? { id: orderId } : { reference: orderRef },
          include: { boutique: true },
        });

        if (order) {
          if (order.status !== OrderStatus.PAID) {
            const vendorNetShare = Number(order.netAmount ?? order.total);
            const platformCommission = Number(order.commissionAmount ?? 0);
            const vendorFixedFee = Number(order.vendorFixedFee ?? 0);
            const buyerFee = Number(order.buyerFeeAmount ?? 0);
            const hadSubAccount = Boolean(order.fedapaySubAccountRef);

            await this.prisma.$transaction(async (tx) => {
              await tx.order.update({
                where: { id: order.id },
                data: {
                  status: OrderStatus.PAID,
                  paymentMethod: PaymentMethod.FEDAPAY,
                  paymentRef: `FEDAPAY-${transactionId}`,
                  fedapayTransactionId: transactionId,
                  paidAt: new Date(),
                },
              });

              // Si le vendeur n'a pas de sous-compte FedaPay actif, crédit de son solde interne disponible
              if (!hadSubAccount) {
                await tx.boutique.update({
                  where: { id: order.boutiqueId },
                  data: {
                    balance: { increment: vendorNetShare },
                  },
                });
              }

              // Notification vendeur avec détail transparent des flux
              const transferNote = hadSubAccount
                ? `versé automatiquement sur votre sous-compte FedaPay (${order.fedapaySubAccountRef})`
                : 'crédité sur votre solde disponible Afrique OS';

              await tx.notification.create({
                data: {
                  boutiqueId: order.boutiqueId,
                  type: 'order_paid',
                  title: `Paiement FedaPay reçu (${order.reference})`,
                  message: `La commande #${order.reference} de ${order.total} FCFA a été réglée. Part nette vendeur: ${vendorNetShare} FCFA (${transferNote}). Frais fixes de transfert FedaPay déduits: ${vendorFixedFee} FCFA (aucune commission marketplace). Frais acheteur supportés par le client: ${buyerFee} FCFA.`,
                  orderReference: order.reference,
                },
              });
            });

            this.logger.log(`[FedaPay Webhook] Commande #${order.reference} validée et marquée PAID.`);
            responseResult = { received: true, status: 'order_paid_success' };
          } else {
            responseResult = { received: true, status: 'order_already_paid' };
          }
        }
      }

      // Cas B : Paiement d'abonnement boutique
      if (customMetadata.type === 'SUBSCRIPTION' || customMetadata.planSlug) {
        const boutiqueId = customMetadata.boutiqueId;
        const planSlug = customMetadata.planSlug;
        const planId = customMetadata.planId;

        if (boutiqueId && (planSlug || planId)) {
          const plan = await this.prisma.plan.findFirst({
            where: planId ? { id: planId } : { slug: planSlug },
          });

          if (plan) {
            const nextPeriodEnd = new Date();
            nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 30);

            await this.prisma.$transaction(async (tx) => {
              await tx.subscription.upsert({
                where: { boutiqueId },
                create: {
                  boutiqueId,
                  planId: plan.id,
                  status: SubscriptionStatus.ACTIVE,
                  price: plan.price,
                  startsAt: new Date(),
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: nextPeriodEnd,
                  fedapayTransactionId: transactionId,
                },
                update: {
                  planId: plan.id,
                  status: SubscriptionStatus.ACTIVE,
                  price: plan.price,
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: nextPeriodEnd,
                  fedapayTransactionId: transactionId,
                },
              });

              await tx.boutique.update({
                where: { id: boutiqueId },
                data: { plan: plan.slug },
              });

              await tx.notification.create({
                data: {
                  boutiqueId,
                  type: 'subscription_activated',
                  title: `Abonnement ${plan.name} activé`,
                  message: `Votre abonnement à la formule ${plan.name} a été réglé avec succès via FedaPay (Transaction #${transactionId}). Vos fonctionnalités sont débloquées pour 30 jours.`,
                },
              });
            });

            this.logger.log(`[FedaPay Webhook] Abonnement boutique ${boutiqueId} activé (${plan.slug}).`);
            responseResult = { received: true, status: 'subscription_activated_success' };
          }
        }
      }
    }

    // Activation ou approbation de sous-compte
    if (eventType === 'sub_account.approved' || eventType === 'sub_account.activated') {
      const subAccountRef = entity?.reference ?? entity?.id;
      const email = entity?.email;

      if (email || subAccountRef) {
        const boutique = await this.prisma.boutique.findFirst({
          where: {
            OR: [
              { email },
              { fedapaySubAccountRef: subAccountRef },
            ],
          },
        });

        if (boutique) {
          await this.prisma.boutique.update({
            where: { id: boutique.id },
            data: {
              fedapaySubAccountRef: subAccountRef ?? boutique.fedapaySubAccountRef,
              fedapaySubAccountStatus: 'ACTIVE',
            },
          });
          this.logger.log(`[FedaPay Webhook] Sous-compte activé pour ${boutique.name}.`);
          responseResult = { received: true, status: 'sub_account_activated' };
        }
      }
    }

    // Confirmation de Remboursement ou Payout
    if (eventType === 'transaction.refunded' || eventType === 'payout.approved' || eventType === 'payout.transferred') {
      const payoutId = String(entity?.id ?? '');
      const reference = entity?.reference;

      const refund = await this.prisma.refundRequest.findFirst({
        where: {
          OR: [
            { payoutId },
            { payoutReference: reference },
          ],
        },
        include: { order: true },
      });

      if (refund && refund.status !== RefundStatus.PROCESSED) {
        await this.prisma.$transaction(async (tx) => {
          await tx.refundRequest.update({
            where: { id: refund.id },
            data: {
              status: RefundStatus.PROCESSED,
              processedAt: new Date(),
            },
          });
          await tx.order.update({
            where: { id: refund.orderId },
            data: {
              status: OrderStatus.REFUNDED,
              refundedAmount: refund.amount,
              refundedAt: new Date(),
            },
          });
        });
        this.logger.log(`[FedaPay Webhook] Remboursement commande #${refund.order.reference} confirmé PROCESSED.`);
        responseResult = { received: true, status: 'refund_payout_confirmed' };
      }

      const withdrawal = await this.prisma.withdrawalRequest.findFirst({
        where: {
          OR: [
            { fedapayPayoutId: payoutId },
            { payoutReference: reference },
          ],
        },
      });

      if (withdrawal && withdrawal.status !== 'APPROVED') {
        await this.prisma.withdrawalRequest.update({
          where: { id: withdrawal.id },
          data: {
            status: 'APPROVED',
            processedAt: new Date(),
          },
        });
        this.logger.log(`[FedaPay Webhook] Retrait boutique ${withdrawal.boutiqueId} validé APPROVED.`);
        responseResult = { received: true, status: 'withdrawal_payout_confirmed' };
      }
    }

    await this.idempotencyService.saveRecord(idempotencyKey, '/api/v1/payments/fedapay/webhook', 200, responseResult);
    return responseResult;
  }

  // ==========================================
  // SYSTÈME DE REMBOURSEMENTS AVEC MOTIF (REFUNDS)
  // ==========================================

  /**
   * SOUMISSION D'UNE DEMANDE DE REMBOURSEMENT CLIENT
   * Exige un motif explicite et des coordonnées valides
   */
  async requestOrderRefund(dto: RequestRefundDto, user?: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        boutique: true,
        refundRequest: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Commande introuvable avec l'ID : ${dto.orderId}`);
    }

    if (user) {
      const isOwner = order.userId === user.id;
      const isSeller = user.role === Role.VENDEUR && order.boutique.ownerId === user.id;
      const isAdmin = user.role === Role.ADMIN;
      if (!isOwner && !isSeller && !isAdmin) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à demander un remboursement pour cette commande.");
      }
    }

    const refundableStatuses: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.WHATSAPP_CONFIRMED,
      OrderStatus.SHIPPING,
      OrderStatus.DELIVERED,
    ];

    if (!refundableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Impossible de demander un remboursement pour une commande au statut "${order.status}". Seules les commandes payées sont éligibles.`,
      );
    }

    if (order.refundRequest && order.refundRequest.status === RefundStatus.PENDING) {
      throw new BadRequestException('Une demande de remboursement est déjà en cours d’examen pour cette commande.');
    }

    if (order.refundRequest && (order.refundRequest.status === RefundStatus.APPROVED || order.refundRequest.status === RefundStatus.PROCESSED)) {
      throw new BadRequestException('Cette commande a déjà été remboursée.');
    }

    const phone = (dto.customerPhone?.trim() || order.customerPhone || '').replace(/[\s\+\-]/g, '');
    const reasonText = dto.reason.trim();
    const fullReason = dto.details?.trim() ? `${reasonText} - ${dto.details.trim()}` : reasonText;

    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.REFUND_REQUESTED,
          refundReason: fullReason,
        },
      });

      const refundRequest = await tx.refundRequest.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          boutiqueId: order.boutiqueId,
          amount: order.total,
          reason: reasonText,
          details: dto.details?.trim() || null,
          customerPhone: phone,
          status: RefundStatus.PENDING,
        },
        update: {
          amount: order.total,
          reason: reasonText,
          details: dto.details?.trim() || null,
          customerPhone: phone,
          status: RefundStatus.PENDING,
          rejectionReason: null,
        },
      });

      await tx.notification.create({
        data: {
          boutiqueId: order.boutiqueId,
          type: 'refund_requested',
          title: `Demande de remboursement (${order.reference})`,
          message: `Le client ${order.customerName} demande le remboursement de ${order.total} FCFA. Motif: ${reasonText}${dto.details ? ` (${dto.details})` : ''}.`,
          orderReference: order.reference,
        },
      });

      return {
        success: true,
        message: 'Demande de remboursement soumise avec succès.',
        refundRequest,
      };
    });
  }

  /**
   * APPROBATION ET DÉCLENCHEMENT DU REMBOURSEMENT (Mobile Money via FedaPay Payouts)
   */
  async approveRefund(refundId: string, user: any, dto?: ApproveRefundDto) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: { items: true },
        },
        boutique: true,
      },
    });

    if (!refund) {
      throw new NotFoundException(`Demande de remboursement introuvable : ${refundId}`);
    }

    if (user && user.role !== Role.ADMIN && refund.boutique.ownerId !== user.id) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à approuver ce remboursement.");
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(`Ce remboursement ne peut plus être approuvé (statut actuel : ${refund.status}).`);
    }

    const { order, boutique } = refund;
    const refundAmount = Number(refund.amount);
    const customerPhone = refund.customerPhone || order.customerPhone || '';
    const payoutMode = dto?.payoutMode || this.detectPayoutMode(customerPhone);

    // Déclenchement du virement de remboursement via FedaPay Payouts
    const payoutResult = await this.executeFedaPayPayout({
      amount: refundAmount,
      currency: 'XOF',
      mode: payoutMode,
      customerPhone,
      customerName: order.customerName,
      reason: `Remboursement commande #${order.reference}`,
    });

    return this.prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refundRequest.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.APPROVED,
          payoutId: payoutResult.payoutId,
          payoutReference: payoutResult.reference,
          processedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.REFUNDED,
          refundedAmount: refund.amount,
          refundedAt: new Date(),
        },
      });

      // Remise en stock des articles
      for (const line of order.items) {
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

      // Restitution des points fidélité
      if (order.userId && order.pointsUsed > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { pointsBalance: { increment: order.pointsUsed } },
        });
        await tx.pointTransaction.create({
          data: {
            userId: order.userId,
            amount: order.pointsUsed,
            reason: `REFUND_ORDER_${order.reference}`,
            orderId: order.id,
          },
        });
      }

      // Déduction du solde vendeur si non rattaché à un sous-compte FedaPay autonome
      if (!order.fedapaySubAccountRef && boutique.balance.toNumber() >= Number(order.netAmount ?? order.total)) {
        await tx.boutique.update({
          where: { id: boutique.id },
          data: {
            balance: { decrement: Number(order.netAmount ?? order.total) },
          },
        });
      }

      await tx.notification.create({
        data: {
          boutiqueId: boutique.id,
          type: 'refund_approved',
          title: `Remboursement exécuté (#${order.reference})`,
          message: `Le remboursement de ${refundAmount} FCFA pour la commande #${order.reference} a été approuvé et viré au client (${refund.customerPhone}, Réf: ${payoutResult.reference}).`,
          orderReference: order.reference,
        },
      });

      return {
        success: true,
        message: 'Remboursement approuvé et envoyé avec succès.',
        refundRequest: updatedRefund,
        payout: payoutResult,
      };
    });
  }

  /**
   * REFUS D'UNE DEMANDE DE REMBOURSEMENT AVEC MOTIF EXPLICITE
   */
  async rejectRefund(refundId: string, user: any, dto: RejectRefundDto) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        order: true,
        boutique: true,
      },
    });

    if (!refund) {
      throw new NotFoundException(`Demande de remboursement introuvable : ${refundId}`);
    }

    if (user && user.role !== Role.ADMIN && refund.boutique.ownerId !== user.id) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à rejeter ce remboursement.");
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(`Ce remboursement ne peut plus être rejeté (statut actuel : ${refund.status}).`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refundRequest.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.REJECTED,
          rejectionReason: dto.rejectionReason,
          processedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          status: OrderStatus.PAID,
        },
      });

      await tx.notification.create({
        data: {
          boutiqueId: refund.boutiqueId,
          type: 'refund_rejected',
          title: `Remboursement refusé (#${refund.order.reference})`,
          message: `La demande de remboursement pour la commande #${refund.order.reference} a été rejetée. Motif : ${dto.rejectionReason}.`,
          orderReference: refund.order.reference,
        },
      });

      return {
        success: true,
        message: 'Demande de remboursement rejetée.',
        refundRequest: updatedRefund,
      };
    });
  }

  /**
   * LISTE DES REMBOURSEMENTS D'UNE BOUTIQUE
   */
  async getRefundsForBoutique(boutiqueId: string, user?: any) {
    if (user && user.role !== Role.ADMIN) {
      const boutique = await this.prisma.boutique.findUnique({ where: { id: boutiqueId } });
      if (!boutique || boutique.ownerId !== user.id) {
        throw new ForbiddenException("Accès non autorisé aux remboursements de cette boutique.");
      }
    }

    return this.prisma.refundRequest.findMany({
      where: { boutiqueId },
      include: {
        order: {
          select: {
            id: true,
            reference: true,
            customerName: true,
            customerPhone: true,
            total: true,
            status: true,
            paymentMethod: true,
            paidAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * DÉTAIL D'UN REMBOURSEMENT
   */
  async getRefundDetails(refundId: string, user?: any) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: { items: true },
        },
        boutique: {
          select: { id: true, name: true, slug: true, ownerId: true },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException(`Remboursement introuvable : ${refundId}`);
    }

    if (user && user.role !== Role.ADMIN && refund.boutique.ownerId !== user.id) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à consulter ce remboursement.");
    }

    return refund;
  }

  // ==========================================
  // PAIEMENT DES ABONNEMENTS BOUTIQUES VIA FEDAPAY
  // ==========================================

  /**
   * INITIALISER LE PAIEMENT D'UN FORFAIT D'ABONNEMENT (Starters, Business, Pro...)
   */
  async createSubscriptionCheckout(dto: CreateSubscriptionPaymentDto, user?: any, idempotencyKey?: string) {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id: dto.boutiqueId },
      include: { subscription: true, owner: true },
    });

    if (!boutique) {
      throw new NotFoundException(`Boutique introuvable : ${dto.boutiqueId}`);
    }

    if (user && user.role !== Role.ADMIN && boutique.ownerId !== user.id) {
      throw new ForbiddenException("Vous n'avez pas la permission de gérer l'abonnement de cette boutique.");
    }

    const plan = await this.prisma.plan.findUnique({
      where: { slug: dto.planSlug },
    });

    if (!plan) {
      throw new NotFoundException(`Plan d'abonnement introuvable : ${dto.planSlug}`);
    }

    const price = Number(plan.price);

    // Plan gratuit : activation immédiate sans passerelle de paiement
    if (price === 0) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const updatedSub = await this.prisma.subscription.upsert({
        where: { boutiqueId: boutique.id },
        create: {
          boutiqueId: boutique.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          price: 0,
          startsAt: new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: nextYear,
        },
        update: {
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          price: 0,
          currentPeriodStart: new Date(),
          currentPeriodEnd: nextYear,
        },
      });

      await this.prisma.boutique.update({
        where: { id: boutique.id },
        data: { plan: plan.slug },
      });

      return {
        success: true,
        freePlan: true,
        message: `Formule ${plan.name} activée avec succès.`,
        subscription: updatedSub,
      };
    }

    // Plan payant : session de paiement FedaPay
    const apiKey = this.configService.get<string>('FEDAPAY_SECRET_KEY');
    const environment = this.configService.get<string>('FEDAPAY_ENVIRONMENT') ?? 'sandbox';
    const baseUrl = environment === 'live' ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1';

    let checkoutResult: any;

    if (!apiKey || apiKey.includes('YOUR_') || apiKey.trim() === '') {
      const mockTxId = `sub_tx_mock_${Date.now()}`;
      checkoutResult = {
        success: true,
        mode: 'sandbox_mock',
        transactionId: mockTxId,
        reference: `SUB-${plan.slug.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        amount: price,
        currency: 'XOF',
        checkoutUrl: `https://sandbox-checkout.fedapay.com/checkout/${mockTxId}`,
        token: `token_sub_${Date.now()}`,
      };
    } else {
      try {
        const payload = {
          description: `Abonnement ${plan.name} - Boutique ${boutique.name}`,
          amount: Math.round(price),
          currency: { iso: 'XOF' },
          callback_url: dto.callbackUrl || undefined,
          custom_metadata: {
            type: 'SUBSCRIPTION',
            boutiqueId: boutique.id,
            planSlug: plan.slug,
            planId: plan.id,
          },
          customer: {
            firstname: boutique.owner.name?.split(' ')[0] || boutique.name,
            lastname: boutique.owner.name?.split(' ').slice(1).join(' ') || 'AfriqueOS',
            email: boutique.email || boutique.owner.email,
            phone_number: {
              number: (boutique.phone || '66000000').replace(/[\s\+\-]/g, ''),
              country: 'BJ',
            },
          },
        };

        const res = await fetch(`${baseUrl}/transactions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new BadRequestException(data.message || "Échec de création du paiement d'abonnement FedaPay");
        }

        const tx = data['v1/transaction'] || data.transaction || data;
        const txId = String(tx.id);

        const tokenRes = await fetch(`${baseUrl}/transactions/${txId}/token`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        const tokenData = await tokenRes.json();
        const token = tokenData.token || `tok_${txId}`;
        const checkoutUrl = tokenData.url || `https://sandbox-checkout.fedapay.com/checkout/${token}`;

        checkoutResult = {
          success: true,
          mode: 'live',
          transactionId: txId,
          reference: tx.reference,
          amount: price,
          currency: 'XOF',
          checkoutUrl,
          token,
        };
      } catch (err: any) {
        this.logger.error(`Erreur création transaction abonnement : ${err.message}`);
        throw new InternalServerErrorException(`Impossible d'initialiser l'abonnement FedaPay : ${err.message}`);
      }
    }

    await this.prisma.subscription.upsert({
      where: { boutiqueId: boutique.id },
      create: {
        boutiqueId: boutique.id,
        planId: plan.id,
        status: SubscriptionStatus.TRIAL,
        price,
        fedapayTransactionId: checkoutResult.transactionId,
        paymentUrl: checkoutResult.checkoutUrl,
      },
      update: {
        planId: plan.id,
        price,
        fedapayTransactionId: checkoutResult.transactionId,
        paymentUrl: checkoutResult.checkoutUrl,
      },
    });

    if (idempotencyKey) {
      await this.idempotencyService.saveRecord(idempotencyKey, '/api/v1/payments/fedapay/subscription/create-transaction', 201, checkoutResult);
    }

    return checkoutResult;
  }

  // ==========================================
  // VIREMENTS DES RETRAITS VENDEURS (PAYOUTS)
  // ==========================================

  /**
   * TRAITEMENT ET VIREMENT MOBILE MONEY D'UNE DEMANDE DE RETRAIT
   */
  async processWithdrawalPayout(dto: ProcessWithdrawalPayoutDto, adminUser?: any) {
    if (adminUser && adminUser.role !== Role.ADMIN) {
      throw new ForbiddenException("Seul un administrateur peut déclencher les virements de retrait.");
    }

    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: dto.withdrawalId },
      include: { boutique: { include: { owner: true } } },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Demande de retrait introuvable : ${dto.withdrawalId}`);
    }

    if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'APPROVED') {
      throw new BadRequestException(`Cette demande de retrait a déjà été traitée ou rejetée (statut : ${withdrawal.status}).`);
    }

    let rawPaymentInfo = withdrawal.paymentInfo || '';
    try {
      if (this.paymentCrypto.isEncrypted(rawPaymentInfo)) {
        rawPaymentInfo = this.paymentCrypto.decrypt(rawPaymentInfo);
      }
    } catch (err: any) {
      this.logger.warn(`Impossible de déchiffrer paymentInfo: ${err.message}`);
    }

    const payoutMode = dto.payoutMode || this.detectPayoutMode(rawPaymentInfo);
    const netAmount = Number(withdrawal.netAmount ?? withdrawal.amount);

    const payoutResult = await this.executeFedaPayPayout({
      amount: netAmount,
      currency: 'XOF',
      mode: payoutMode,
      customerPhone: rawPaymentInfo,
      customerName: withdrawal.boutique.owner.name || withdrawal.boutique.name,
      reason: `Retrait vendeur Boutique ${withdrawal.boutique.name}`,
    });

    const updated = await this.prisma.withdrawalRequest.update({
      where: { id: withdrawal.id },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
        fedapayPayoutId: payoutResult.payoutId,
        payoutReference: payoutResult.reference,
      },
    });

    await this.prisma.notification.create({
      data: {
        boutiqueId: withdrawal.boutiqueId,
        type: 'withdrawal_processed',
        title: `Virement de retrait effectué`,
        message: `Votre demande de retrait de ${withdrawal.amount} FCFA (${netAmount} FCFA net après déduction des frais de transfert de ${withdrawal.fee} FCFA) a été transmise avec succès sur votre numéro Mobile Money (Réf: ${payoutResult.reference}).`,
      },
    });

    return {
      success: true,
      message: 'Virement de retrait exécuté avec succès.',
      withdrawal: updated,
      payout: payoutResult,
    };
  }

  // ==========================================
  // HELPERS PRIVÉS PAYOUTS ET DÉTECTION MODE
  // ==========================================

  private async executeFedaPayPayout(params: {
    amount: number;
    currency: string;
    mode: string;
    customerPhone?: string | null;
    customerName: string;
    reason: string;
  }) {
    const apiKey = this.configService.get<string>('FEDAPAY_SECRET_KEY');
    const environment = this.configService.get<string>('FEDAPAY_ENVIRONMENT') ?? 'sandbox';

    const cleanPhone = (params.customerPhone || '66000000').replace(/[\s\+\-]/g, '');
    const baseUrl = environment === 'live' ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1';

    if (!apiKey || apiKey.includes('YOUR_') || apiKey.trim() === '') {
      this.logger.warn(`[FedaPay Payout] Clé non configurée, simulation sandbox.`);
      return {
        mode: 'sandbox_mock',
        payoutId: `payout_mock_${Date.now()}`,
        reference: `PO-SIM-${Date.now().toString().slice(-6)}`,
        status: 'sent',
      };
    }

    try {
      const nameParts = params.customerName.trim().split(/\s+/);
      const firstname = nameParts[0] || 'Client';
      const lastname = nameParts.slice(1).join(' ') || 'AfriqueOS';

      const payload = {
        amount: Math.round(params.amount),
        currency: { iso: params.currency || 'XOF' },
        mode: params.mode,
        customer: {
          firstname,
          lastname,
          phone_number: {
            number: cleanPhone,
            country: 'BJ',
          },
        },
      };

      const res = await fetch(`${baseUrl}/payouts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        this.logger.warn(
          `[FedaPay Payout] API returned ${res.status}: ${JSON.stringify(data)}. Mode Sandbox fallback sécurisé.`,
        );
        if (environment !== 'live') {
          return {
            mode: 'sandbox_mock',
            payoutId: `payout_sandbox_${Date.now()}`,
            reference: `PO-SANDBOX-${Date.now().toString().slice(-6)}`,
            status: 'simulated_success',
          };
        }
        throw new BadRequestException(data.message || 'Échec déclenchement transfert FedaPay');
      }

      const payout = data['v1/payout'] || data.payout || data;
      return {
        mode: 'live',
        payoutId: String(payout.id),
        reference: payout.reference || `PO-${payout.id}`,
        status: payout.status || 'sent',
      };
    } catch (err: any) {
      if (environment !== 'live') {
        this.logger.warn(`[FedaPay Payout] Exception sandbox (${err.message}). Utilisation fallback sécurisé.`);
        return {
          mode: 'sandbox_mock',
          payoutId: `payout_sandbox_${Date.now()}`,
          reference: `PO-SANDBOX-${Date.now().toString().slice(-6)}`,
          status: 'simulated_success',
        };
      }
      throw new InternalServerErrorException(`Erreur FedaPay Payout : ${err.message}`);
    }
  }

  private detectPayoutMode(phone?: string | null): string {
    const cleaned = (phone || '').replace(/[\s\+\-]/g, '');
    if (cleaned.startsWith('229') || cleaned.length === 8 || cleaned.length === 10) {
      const local = cleaned.slice(-8);
      const prefix = local.substring(0, 2);
      if (['61', '62', '66', '67', '69', '50', '51', '52', '53', '54', '56', '57', '59', '90', '91', '96', '97'].includes(prefix)) {
        return 'mtn_open';
      }
      return 'moov';
    }
    return 'mtn_open';
  }

  /**
   * Vérification cryptographique de la signature HMAC SHA-256 en temps constant
   */
  private verifyWebhookSignature(
    rawBody: string | Buffer,
    signatureHeader: string,
    secret: string,
  ): boolean {
    try {
      const parts = signatureHeader.split(',');
      let timestamp = '';
      let receivedSignature = '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith('t=')) {
          timestamp = trimmed.substring(2);
        } else if (trimmed.startsWith('s=')) {
          receivedSignature = trimmed.substring(2);
        } else if (trimmed.startsWith('v1=')) {
          receivedSignature = trimmed.substring(3);
        } else if (!trimmed.includes('=')) {
          receivedSignature = trimmed;
        }
      }

      if (!receivedSignature) {
        return false;
      }

      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');

      const computedWithTimestamp = timestamp
        ? crypto.createHmac('sha256', secret).update(`${timestamp}.${bodyStr}`).digest('hex')
        : null;

      const computedDirect = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');

      const targetBuffer = Buffer.from(receivedSignature, 'hex');

      if (computedWithTimestamp) {
        const withTimestampBuffer = Buffer.from(computedWithTimestamp, 'hex');
        if (
          targetBuffer.length === withTimestampBuffer.length &&
          crypto.timingSafeEqual(withTimestampBuffer, targetBuffer)
        ) {
          return true;
        }
      }

      const directBuffer = Buffer.from(computedDirect, 'hex');
      if (
        targetBuffer.length === directBuffer.length &&
        crypto.timingSafeEqual(directBuffer, targetBuffer)
      ) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }
}
