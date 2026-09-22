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
import { calculateFedaPayTransferFee } from './utils/transfer-fee.util';
import { OrderStatus, PaymentMethod, Role } from '@prisma/client';

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

    await this.idempotencyService.saveRecord(idempotencyKey, '/api/v1/payments/fedapay/webhook', 200, responseResult);
    return responseResult;
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
