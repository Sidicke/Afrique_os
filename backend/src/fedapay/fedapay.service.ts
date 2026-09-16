import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IdempotencyService } from '../common/services/idempotency.service';
import { CreateFedaPayTransactionDto } from './dto/create-fedapay-transaction.dto';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export interface FedaPayCheckoutResponse {
  success: boolean;
  mode: 'live' | 'sandbox_mock';
  transactionId: string;
  reference: string;
  amount: number;
  currency: string;
  checkoutUrl: string;
  token: string;
}

@Injectable()
export class FedaPayService {
  private readonly logger = new Logger(FedaPayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * ÉTAPE 1, 2, 3 & 4 DU FLUX DE PAIEMENT :
   * - Vérification de l'idempotence (1er pilier)
   * - Recalcul Zero-Trust du montant serveur depuis la DB (4e pilier)
   * - Création de la transaction (FedaPay API ou Sandbox Mock)
   * - Retour du token et de l'URL de paiement au client
   */
  async createCheckoutTransaction(
    dto: CreateFedaPayTransactionDto,
    idempotencyKey?: string,
    path = '/api/v1/payments/fedapay/create-transaction',
  ): Promise<FedaPayCheckoutResponse> {
    // 1. Vérification de l'idempotence si une clé est fournie
    if (idempotencyKey) {
      const cached = await this.idempotencyService.getRecord(idempotencyKey, path);
      if (cached) {
        return cached.responseBody as FedaPayCheckoutResponse;
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
    const currency = 'XOF'; // FCFA par défaut pour FedaPay dans l'espace UEMOA/CEMAC

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
        } else {
          this.logger.warn(
            `[FedaPay] Callback URL non autorisée (${dto.callbackUrl}). Utilisation de l'URL par défaut.`,
          );
        }
      } catch {
        this.logger.warn(
          `[FedaPay] Callback URL invalide (${dto.callbackUrl}). Utilisation de l'URL par défaut.`,
        );
      }
    }

    let result: FedaPayCheckoutResponse;

    // Si aucune clé FedaPay réelle n'est encore configurée, on utilise le mode Simulation Sandbox
    if (!apiKey || apiKey.includes('YOUR_') || apiKey.trim() === '') {
      this.logger.warn(
        `[FedaPay] Clé FEDAPAY_SECRET_KEY non configurée. Utilisation du mode Simulation Sandbox pour la commande #${order.reference}.`,
      );

      const mockTransactionId = `mock_tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const mockToken = `mock_token_${Date.now()}`;
      const mockCheckoutUrl = `https://sandbox-checkout.fedapay.com/pay/${mockToken}?amount=${serverCalculatedAmount}&reference=${encodeURIComponent(
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
      // Mode Réel (Appel direct à l'API HTTP FedaPay)
      try {
        const baseUrl =
          environment === 'live'
            ? 'https://api.fedapay.com/v1'
            : 'https://sandbox-api.fedapay.com/v1';

        const payload = {
          description: `Paiement Commande ${order.reference} - ${order.boutique.name}`,
          amount: serverCalculatedAmount,
          currency: { iso: currency },
          callback_url: callbackUrl,
          customer: {
            firstname: dto.customerName ?? order.customerName,
            email: dto.customerEmail ?? order.customerEmail ?? 'client@zennshop.com',
            phone_number: {
              number: dto.customerPhone ?? order.customerPhone,
            },
          },
          custom_metadata: {
            orderId: order.id,
            orderReference: order.reference,
            boutiqueId: order.boutiqueId,
          },
        };

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

        // Demande d'url de paiement tokenisée
        const tokenResp = await fetch(`${baseUrl}/transactions/${transaction.id}/token`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        const tokenData = await tokenResp.json();
        const token = tokenData.token ?? tokenData.v1?.token?.token;
        const checkoutUrl = tokenData.url ?? `https://${environment === 'live' ? 'checkout' : 'sandbox-checkout'}.fedapay.com/pay/${token}`;

        result = {
          success: true,
          mode: environment === 'live' ? 'live' : 'sandbox_mock',
          transactionId: String(transaction.id),
          reference: order.reference,
          amount: serverCalculatedAmount,
          currency,
          checkoutUrl,
          token,
        };
      } catch (error: any) {
        this.logger.error(`Échec de la communication avec FedaPay API: ${error.message}`);
        throw new InternalServerErrorException(`Impossible d'initialiser le paiement FedaPay : ${error.message}`);
      }
    }

    // Sauvegarde du résultat dans l'idempotence si une clé a été fournie
    if (idempotencyKey) {
      await this.idempotencyService.saveRecord(idempotencyKey, path, 201, result);
    }

    return result;
  }

  /**
   * ÉTAPE 6 DU FLUX DE PAIEMENT : WEBHOOK FEDAPAY
   * - Vérification de la signature HMAC du Webhook (2e pilier)
   * - Vérification de l'idempotence pour prévenir le double traitement
   * - Mise à jour du statut de la commande en PAID + Crédit boutique + Notifications
   */
  async handleWebhook(rawBody: string | Buffer, signatureHeader?: string, bodyPayload?: any) {
    const webhookSecret = this.configService.get<string>('FEDAPAY_WEBHOOK_SECRET');
    const environment = this.configService.get<string>('FEDAPAY_ENVIRONMENT') ?? 'sandbox';

    // 1. Vérification stricte de la signature Webhook (E2EE & Authenticité)
    if (
      environment === 'live' ||
      (webhookSecret && webhookSecret.trim() !== '' && !webhookSecret.includes('YOUR_'))
    ) {
      if (!signatureHeader) {
        this.logger.error('[FedaPay Webhook] En-tête de signature manquant (x-fedapay-signature).');
        throw new BadRequestException('En-tête de signature FedaPay manquant (x-fedapay-signature).');
      }

      if (!webhookSecret || webhookSecret.includes('YOUR_')) {
        this.logger.error('[FedaPay Webhook] FEDAPAY_WEBHOOK_SECRET manquant en environnement de production.');
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

    // Identifiant d'événement unique strict pour l'idempotence du webhook (anti-rejeu)
    const eventId = event.id ?? event.transaction?.id;
    if (!eventId) {
      this.logger.warn('[FedaPay Webhook] Événement rejeté : aucun identifiant unique fourni.');
      throw new BadRequestException("Identifiant d'événement FedaPay requis");
    }
    const idempotencyKey = `fedapay_webhook_${eventId}`;

    const cached = await this.idempotencyService.getRecord(idempotencyKey, '/api/v1/payments/fedapay/webhook');
    if (cached) {
      this.logger.log(`[FedaPay Webhook] Événement ${eventId} déjà traité. Re-renvoi de la réponse 200.`);
      return cached.responseBody;
    }

    let responseResult = { received: true, status: 'ignored' };

    // Traitement de l'événement de validation de paiement
    if (eventType === 'transaction.approved' || eventType === 'transaction.paid' || event.status === 'approved') {
      const customMetadata = entity?.custom_metadata ?? {};
      const orderId = customMetadata.orderId ?? entity?.reference_id;
      const orderRef = customMetadata.orderReference ?? entity?.reference;
      const transactionId = String(entity?.id ?? 'FEDAPAY_TX');

      if (!orderId && !orderRef) {
        this.logger.warn('[FedaPay Webhook] Aucun orderId ni reference trouvé dans le payload du Webhook.');
      } else {
        const order = await this.prisma.order.findFirst({
          where: orderId ? { id: orderId } : { reference: orderRef },
          include: { boutique: true },
        });

        if (order) {
          if (order.status !== OrderStatus.PAID) {
            // Mise à jour de la commande en PAID
            await this.prisma.$transaction(async (tx) => {
              await tx.order.update({
                where: { id: order.id },
                data: {
                  status: OrderStatus.PAID,
                  paymentMethod: PaymentMethod.FEDAPAY,
                  paymentRef: `FEDAPAY-${transactionId}`,
                  paidAt: new Date(),
                },
              });

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
                if (userBoutiques.some(b => b.plan === 'enterprise')) {
                  userPlan = 'enterprise';
                  commissionRate = 1.5;
                } else if (userBoutiques.some(b => b.plan === 'business')) {
                  userPlan = 'business';
                  commissionRate = 2.0;
                }
              }

              const commissionAmount = Number((grossTotal * (commissionRate / 100)).toFixed(2));
              const netAmount = grossTotal - commissionAmount;

              await tx.order.update({
                where: { id: order.id },
                data: { commissionRate, commissionAmount, netAmount, planAtPurchase: userPlan }
              });

              // Crédit du solde NET de la boutique
              await tx.boutique.update({
                where: { id: order.boutiqueId },
                data: {
                  balance: { increment: netAmount },
                },
              });

              // === CASHBACK ET PARRAINAGE (0.5%) ===
              const pointsEarned = Math.floor(grossTotal * 0.005);
              if (order.userId && pointsEarned > 0) {
                const buyer = await tx.user.findUnique({ where: { id: order.userId } });
                if (buyer) {
                  // Acheteur
                  await tx.user.update({
                    where: { id: buyer.id },
                    data: { pointsBalance: { increment: pointsEarned } }
                  });
                  await tx.pointTransaction.create({
                    data: {
                      userId: buyer.id,
                      amount: pointsEarned,
                      reason: "CASHBACK_PURCHASE",
                      orderId: order.id
                    }
                  });
                  
                  // Parrain
                  if (buyer.referredById) {
                    await tx.user.update({
                      where: { id: buyer.referredById },
                      data: { pointsBalance: { increment: pointsEarned } }
                    });
                    await tx.pointTransaction.create({
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

              // Création d'une notification pour le vendeur
              await tx.notification.create({
                data: {
                  boutiqueId: order.boutiqueId,
                  type: 'order_paid',
                  title: `Paiement FedaPay reçu (${order.reference})`,
                  message: `La commande #${order.reference} d'un montant de ${order.total} FCFA a été payée avec succès via FedaPay.`,
                  orderReference: order.reference,
                },
              });
            });

            this.logger.log(`[FedaPay Webhook] Commande #${order.reference} marquée comme PAYÉE via FedaPay.`);
            responseResult = { received: true, status: 'order_paid_success' };
          } else {
            this.logger.log(`[FedaPay Webhook] La commande #${order.reference} était déjà marquée comme PAYÉE.`);
            responseResult = { received: true, status: 'order_already_paid' };
          }
        }
      }
    }

    // Sauvegarde de l'idempotence pour le Webhook
    await this.idempotencyService.saveRecord(idempotencyKey, '/api/v1/payments/fedapay/webhook', 200, responseResult);
    return responseResult;
  }

  /**
   * Vérifie la signature cryptographique du Webhook FedaPay (HMAC SHA-256)
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

      // 1. Calcul avec timestamp si présent (standard FedaPay / Stripe webhook format)
      const computedWithTimestamp = timestamp
        ? crypto.createHmac('sha256', secret).update(`${timestamp}.${bodyStr}`).digest('hex')
        : null;

      // 2. Calcul direct sur le corps brut
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
