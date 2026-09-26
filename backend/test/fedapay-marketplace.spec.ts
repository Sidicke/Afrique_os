import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { FedaPayService } from '../src/fedapay/fedapay.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { IdempotencyService } from '../src/common/services/idempotency.service';
import { PaymentCryptoService } from '../src/common/crypto/payment-crypto.service';
import { BoutiquesService } from '../src/boutiques/boutiques.service';
import { calculateFedaPayTransferFee } from '../src/fedapay/utils/transfer-fee.util';
import { BoutiqueStatus, OrderStatus, PaymentMethod } from '@prisma/client';

describe('FedaPay Marketplace & Sécurité des Transactions', () => {
  let service: FedaPayService;
  let boutiquesService: BoutiquesService;
  let paymentCrypto: PaymentCryptoService;
  let prisma: any;
  let configService: any;
  let idempotencyService: any;

  const mockConfig: Record<string, string> = {
    FEDAPAY_SECRET_KEY: 'YOUR_FEDAPAY_SECRET_KEY',
    FEDAPAY_ENVIRONMENT: 'sandbox',
    FEDAPAY_WEBHOOK_SECRET: 'whsec_test_secret_123456789',
    FEDAPAY_CALLBACK_URL: 'http://localhost:3001/checkout/success',
    PAYMENT_ENCRYPTION_KEY: 'test-payment-master-secret-key-32b!',
  };

  beforeEach(async () => {
    prisma = {
      boutique: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      withdrawalRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      refundRequest: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      plan: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      subscription: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      product: {
        update: jest.fn(),
      },
      variant: {
        update: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      pointTransaction: {
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    idempotencyService = {
      getRecord: jest.fn().mockResolvedValue(null),
      saveRecord: jest.fn().mockResolvedValue(true),
    };

    configService = {
      get: jest.fn((key: string) => mockConfig[key] ?? null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FedaPayService,
        BoutiquesService,
        PaymentCryptoService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: IdempotencyService, useValue: idempotencyService },
      ],
    }).compile();

    service = module.get<FedaPayService>(FedaPayService);
    boutiquesService = module.get<BoutiquesService>(BoutiquesService);
    paymentCrypto = module.get<PaymentCryptoService>(PaymentCryptoService);
  });

  describe('Barème Officiel des Frais Fixes de Transfert FedaPay', () => {
    it('devrait appliquer le barème par tranches de montant de l\'API FedaPay', () => {
      // 0 à 10 000 XOF -> 150 XOF
      expect(calculateFedaPayTransferFee(5000)).toBe(150);
      expect(calculateFedaPayTransferFee(10000)).toBe(150);

      // 10 001 à 50 000 XOF -> 300 XOF
      expect(calculateFedaPayTransferFee(10001)).toBe(300);
      expect(calculateFedaPayTransferFee(50000)).toBe(300);

      // 50 001 à 150 000 XOF -> 800 XOF
      expect(calculateFedaPayTransferFee(50001)).toBe(800);
      expect(calculateFedaPayTransferFee(150000)).toBe(800);

      // 150 001 à 500 000 XOF -> 2 000 XOF
      expect(calculateFedaPayTransferFee(150001)).toBe(2000);
      expect(calculateFedaPayTransferFee(500000)).toBe(2000);

      // 500 001 XOF et plus -> 2 500 XOF
      expect(calculateFedaPayTransferFee(500001)).toBe(2500);
      expect(calculateFedaPayTransferFee(1000000)).toBe(2500);
    });
  });

  describe('Pilier 1 : Idempotence des Transactions', () => {
    it('devrait retourner la réponse mise en cache pour une clé d\'idempotence déjà traitée', async () => {
      const cachedResponse = {
        success: true,
        mode: 'sandbox_mock',
        transactionId: 'mock_tx_cached_123',
        amount: 10000,
      };

      idempotencyService.getRecord.mockResolvedValue({
        responseBody: cachedResponse,
      });

      const result = await service.createCheckoutTransaction(
        { orderId: 'order-123' },
        'idemp-key-abc',
      );

      expect(result).toEqual(cachedResponse);
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
    });

    it('devrait dédupliquer les webhooks rejoués via la clé d\'événement FedaPay', async () => {
      idempotencyService.getRecord.mockResolvedValue({
        responseBody: { received: true, status: 'order_already_paid' },
      });

      const secret = 'whsec_test_secret_123456789';
      const payload = {
        name: 'transaction.approved',
        id: 'evt_duplicate_999',
        entity: { id: 'tx_999' },
      };
      const rawBody = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const validSig = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
      const validHeader = `t=${timestamp},s=${validSig}`;

      const result = await service.handleWebhook(rawBody, validHeader, payload);
      expect(result.status).toBe('order_already_paid');
      expect(prisma.order.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('Pilier 2 : Chiffrement E2EE & Signature HMAC', () => {
    it('devrait chiffrer en AES-256-GCM et déchiffrer les données sensibles de paiement', () => {
      const sensitiveData = 'MTN Mobile Money: +22997001122 (Titulaire: A. Sossa)';
      const encrypted = paymentCrypto.encrypt(sensitiveData);

      expect(encrypted).toMatch(/^pay_enc:v1:/);
      expect(encrypted).not.toContain('+22997001122');

      const decrypted = paymentCrypto.decrypt(encrypted);
      expect(decrypted).toBe(sensitiveData);
    });

    it('devrait valider la signature HMAC-SHA256 FedaPay et rejeter une fausse signature', async () => {
      const secret = 'whsec_test_secret_123456789';
      const payload = { name: 'transaction.approved', id: 'evt_sec_1', entity: { id: 'tx_sec' } };
      const rawBody = JSON.stringify(payload);

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const fakeHeader = `t=${timestamp},s=0000000000000000000000000000000000000000000000000000000000000000`;

      await expect(
        service.handleWebhook(rawBody, fakeHeader, payload),
      ).rejects.toThrow('Signature du Webhook FedaPay invalide.');
    });
  });

  describe('Pilier 4 : Frais Acheteur (2% MM / 4% Carte) & Frais Fixes Vendeur par Tranches (Sans Commission)', () => {
    it('MOBILE MONEY (2% acheteur) - Tranche 0 à 10 000 XOF (150 XOF frais fixe) : acheteur paie 10 200 XOF, vendeur reçoit 9 850 XOF', async () => {
      const orderAmount = 10000;

      prisma.order.findUnique.mockResolvedValue({
        id: 'order-mm-1',
        reference: 'CMD-MM-001',
        total: orderAmount,
        status: OrderStatus.PENDING,
        customerName: 'Ablam Client',
        customerEmail: 'ablam@test.bj',
        customerPhone: '+22997112233',
        boutiqueId: 'btq-1',
        boutique: {
          id: 'btq-1',
          name: 'Boutique Cotonou',
          fedapaySubAccountRef: 'acc_cotonou_123',
          fedapaySubAccountStatus: 'ACTIVE',
        },
      });

      prisma.order.update.mockResolvedValue({ id: 'order-mm-1' });

      const response = await service.createCheckoutTransaction({
        orderId: 'order-mm-1',
        paymentChannel: 'MOBILE_MONEY',
      });

      // 1. Frais acheteur 2% : 200 XOF -> Débit acheteur = 10 200 XOF
      expect(response.amount).toBe(orderAmount);
      expect(response.buyerFee).toBe(200);
      expect(response.buyerFeeRate).toBe(2);
      expect(response.totalChargedToBuyer).toBe(10200);
      expect(response.paymentChannel).toBe('MOBILE_MONEY');

      // 2. Frais fixes vendeur : Tranche <= 10 000 -> 150 XOF, AUCUNE commission marketplace (0 XOF)
      expect(response.marketplaceSplit.platformCommission).toBe(0);
      expect(response.marketplaceSplit.commissionRate).toBe(0);
      expect(response.marketplaceSplit.vendorFixedTransferFee).toBe(150);

      // 3. Part nette reversée au vendeur sur son sous-compte : 10 000 - 150 = 9 850 XOF
      expect(response.marketplaceSplit.vendorNetShare).toBe(9850);
      expect(response.marketplaceSplit.subAccountRef).toBe('acc_cotonou_123');

      // 4. Enregistrement strict en DB
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-mm-1' },
          data: expect.objectContaining({
            buyerPaymentChannel: 'MOBILE_MONEY',
            buyerFeeRate: 2,
            buyerFeeAmount: 200,
            totalCharged: 10200,
            commissionRate: 0,
            commissionAmount: 0,
            vendorFixedFee: 150,
            netAmount: 9850,
          }),
        }),
      );
    });

    it('MOBILE MONEY (2% acheteur) - Tranche 10 001 à 50 000 XOF (300 XOF frais fixe) : panier 40 000 XOF -> acheteur paie 40 800 XOF, vendeur reçoit 39 700 XOF', async () => {
      const orderAmount = 40000;

      prisma.order.findUnique.mockResolvedValue({
        id: 'order-mm-2',
        reference: 'CMD-MM-002',
        total: orderAmount,
        status: OrderStatus.PENDING,
        customerName: 'Koffi Client',
        boutiqueId: 'btq-1',
        boutique: {
          id: 'btq-1',
          name: 'Boutique Cotonou',
          fedapaySubAccountRef: 'acc_cotonou_123',
          fedapaySubAccountStatus: 'ACTIVE',
        },
      });

      prisma.order.update.mockResolvedValue({ id: 'order-mm-2' });

      const response = await service.createCheckoutTransaction({
        orderId: 'order-mm-2',
        paymentChannel: 'MOBILE_MONEY',
      });

      // Frais acheteur 2% de 40 000 = 800 XOF -> Débit total = 40 800 XOF
      expect(response.totalChargedToBuyer).toBe(40800);

      // Frais fixes FedaPay pour 40 000 XOF = 300 XOF
      expect(response.marketplaceSplit.vendorFixedTransferFee).toBe(300);

      // Part nette vendeur : 40 000 - 300 = 39 700 XOF
      expect(response.marketplaceSplit.vendorNetShare).toBe(39700);
    });

    it('CARTE BANCAIRE (4% acheteur) : panier 10 000 XOF -> acheteur paie 10 400 XOF, vendeur reçoit 9 850 XOF', async () => {
      const orderAmount = 10000;

      prisma.order.findUnique.mockResolvedValue({
        id: 'order-card',
        reference: 'CMD-CARD-002',
        total: orderAmount,
        status: OrderStatus.PENDING,
        customerName: 'Fatou Client',
        boutiqueId: 'btq-1',
        boutique: {
          id: 'btq-1',
          name: 'Boutique Cotonou',
          fedapaySubAccountRef: 'acc_cotonou_123',
          fedapaySubAccountStatus: 'ACTIVE',
        },
      });

      prisma.order.update.mockResolvedValue({ id: 'order-card' });

      const response = await service.createCheckoutTransaction({
        orderId: 'order-card',
        paymentChannel: 'CARD',
      });

      // Frais acheteur 4% sur carte : 400 XOF -> total débité 10 400 XOF
      expect(response.amount).toBe(orderAmount);
      expect(response.buyerFee).toBe(400);
      expect(response.buyerFeeRate).toBe(4);
      expect(response.totalChargedToBuyer).toBe(10400);
      expect(response.paymentChannel).toBe('CARD');

      // Frais fixe FedaPay pour 10 000 XOF = 150 XOF (sans commission) -> part vendeur nette = 9 850 XOF
      expect(response.marketplaceSplit.vendorFixedTransferFee).toBe(150);
      expect(response.marketplaceSplit.vendorNetShare).toBe(9850);
    });
  });

  describe('Demande de Retrait / Transfert Acompte Boutique (BoutiquesService)', () => {
    it('devrait appliquer le barème par tranches (300 XOF pour 20 000 XOF) et chiffrer les coordonnées de paiement', async () => {
      const mockBoutique = {
        id: 'btq-1',
        status: BoutiqueStatus.ACTIVE,
        balance: { toNumber: () => 50000 },
      };

      prisma.boutique.findUnique.mockResolvedValue(mockBoutique);
      prisma.boutique.updateMany.mockResolvedValue({ count: 1 });
      prisma.withdrawalRequest.create.mockImplementation((args: any) => Promise.resolve(args.data));

      const withdrawalAmount = 20000; // Tranche 10 001 à 50 000 -> frais 300 XOF
      const paymentDetails = 'Virement Moov Money: +22995001122';

      const result = await boutiquesService.requestWithdrawal(
        'btq-1',
        withdrawalAmount,
        paymentDetails,
      );

      // Frais fixes FedaPay déduits selon barème (300 XOF) -> Net versé = 19 700 XOF
      expect(result.amount).toBe(20000);
      expect(result.fee).toBe(300);
      expect(result.netAmount).toBe(19700);

      // Coordonnées chiffrées en E2EE AES-256-GCM
      expect(result.paymentInfo).toMatch(/^pay_enc:v1:/);
      expect(result.paymentInfo).not.toContain('+22995001122');
    });
  });

  describe('Système de Remboursement avec Motifs & Payouts Mobile Money', () => {
    it('devrait soumettre une demande de remboursement avec motif pour une commande payée', async () => {
      const mockOrder = {
        id: 'order-refund-1',
        reference: 'CMD-REFUND-001',
        total: 15000,
        status: OrderStatus.PAID,
        customerName: 'Amina Client',
        customerPhone: '61001122',
        boutiqueId: 'btq-1',
        boutique: { id: 'btq-1', ownerId: 'vendor-1' },
        refundRequest: null,
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue({ id: 'order-refund-1', status: 'REFUND_REQUESTED' });
      prisma.refundRequest.upsert.mockImplementation((args: any) => Promise.resolve({ id: 'ref-req-1', ...args.create }));
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.requestOrderRefund({
        orderId: 'order-refund-1',
        reason: 'ARTICLE_NON_CONFORME',
        details: 'La taille reçue ne correspond pas à la commande',
        customerPhone: '61001122',
      });

      expect(result.success).toBe(true);
      expect(result.refundRequest.reason).toBe('ARTICLE_NON_CONFORME');
      expect(result.refundRequest.status).toBe('PENDING');
      expect(result.refundRequest.amount).toBe(15000);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-refund-1' },
          data: expect.objectContaining({ status: 'REFUND_REQUESTED' }),
        }),
      );
    });

    it('devrait rejeter une demande de remboursement sur une commande non payée (PENDING)', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-pending-1',
        status: OrderStatus.PENDING,
        boutique: { ownerId: 'v-1' },
      });

      await expect(
        service.requestOrderRefund({
          orderId: 'order-pending-1',
          reason: 'CHANGEMENT_AVIS',
        }),
      ).rejects.toThrow('Seules les commandes payées sont éligibles.');
    });

    it('devrait approuver un remboursement, réintégrer les stocks, restituer les points et virer les fonds', async () => {
      const mockRefund = {
        id: 'ref-req-1',
        orderId: 'order-1',
        amount: 25000,
        customerPhone: '61002233',
        status: 'PENDING',
        boutique: { id: 'btq-1', ownerId: 'vendor-1', balance: { toNumber: () => 60000 } },
        order: {
          id: 'order-1',
          reference: 'CMD-PAID-001',
          total: 25000,
          customerName: 'Kofi Mensah',
          userId: 'user-client-1',
          pointsUsed: 500,
          fedapaySubAccountRef: null,
          items: [
            { productId: 'prod-1', variantId: 'var-1', quantity: 2 },
          ],
        },
      };

      prisma.refundRequest.findUnique.mockResolvedValue(mockRefund);
      prisma.refundRequest.update.mockResolvedValue({ id: 'ref-req-1', status: 'APPROVED' });
      prisma.order.update.mockResolvedValue({ id: 'order-1', status: 'REFUNDED' });
      prisma.product.update.mockResolvedValue({});
      prisma.variant.update.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});
      prisma.pointTransaction.create.mockResolvedValue({});
      prisma.boutique.update.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      const result = await service.approveRefund('ref-req-1', { id: 'vendor-1', role: 'VENDEUR' });

      expect(result.success).toBe(true);
      expect(result.refundRequest.status).toBe('APPROVED');

      // Remise en stock du produit et de sa variante
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: { stock: { increment: 2 } },
        }),
      );
      expect(prisma.variant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'var-1' },
          data: { stock: { increment: 2 } },
        }),
      );

      // Restitution des points fidélité
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-client-1' },
          data: { pointsBalance: { increment: 500 } },
        }),
      );

      // Payout simulé proprement en mode test sandbox
      expect(result.payout.reference).toBeDefined();
    });

    it('devrait rejeter un remboursement avec un motif justificatif et rétablir le statut PAID', async () => {
      const mockRefund = {
        id: 'ref-req-2',
        orderId: 'order-2',
        status: 'PENDING',
        boutique: { id: 'btq-1', ownerId: 'vendor-1' },
        order: { id: 'order-2', reference: 'CMD-PAID-002' },
      };

      prisma.refundRequest.findUnique.mockResolvedValue(mockRefund);
      prisma.refundRequest.update.mockResolvedValue({ id: 'ref-req-2', status: 'REJECTED' });
      prisma.order.update.mockResolvedValue({ id: 'order-2', status: OrderStatus.PAID });
      prisma.notification.create.mockResolvedValue({});

      const result = await service.rejectRefund('ref-req-2', { id: 'vendor-1', role: 'VENDEUR' }, {
        rejectionReason: 'Délai de rétractation de 7 jours dépassé.',
      });

      expect(result.success).toBe(true);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-2' },
          data: { status: OrderStatus.PAID },
        }),
      );
    });
  });

  describe('Paiement des Abonnements Boutiques via FedaPay', () => {
    it('devrait générer une session de paiement FedaPay pour un abonnement payant', async () => {
      const mockBoutique = {
        id: 'btq-sub-1',
        name: 'Boutique Wax',
        email: 'wax@afriqueos.com',
        phone: '61003344',
        ownerId: 'owner-sub-1',
        owner: { name: 'Aïcha Diallo', email: 'aicha@gmail.com' },
      };

      const mockPlan = {
        id: 'plan-pro',
        slug: 'pro',
        name: 'Forfait Pro',
        price: 9900,
      };

      prisma.boutique.findUnique.mockResolvedValue(mockBoutique);
      prisma.plan.findUnique.mockResolvedValue(mockPlan);
      prisma.subscription.upsert.mockResolvedValue({ id: 'sub-1' });

      const result = await service.createSubscriptionCheckout(
        { boutiqueId: 'btq-sub-1', planSlug: 'pro' },
        { id: 'owner-sub-1', role: 'VENDEUR' },
      );

      expect(result.success).toBe(true);
      expect(result.amount).toBe(9900);
      expect(result.checkoutUrl).toBeDefined();
      expect(prisma.subscription.upsert).toHaveBeenCalled();
    });

    it('devrait activer automatiquement un plan gratuit (0 FCFA) sans passerelle de paiement', async () => {
      const mockBoutique = {
        id: 'btq-free',
        name: 'Boutique Starter',
        ownerId: 'owner-free',
        owner: { name: 'Starter Owner' },
      };

      const freePlan = {
        id: 'plan-starter',
        slug: 'starter',
        name: 'Starter Gratuit',
        price: 0,
      };

      prisma.boutique.findUnique.mockResolvedValue(mockBoutique);
      prisma.plan.findUnique.mockResolvedValue(freePlan);
      prisma.subscription.upsert.mockResolvedValue({ id: 'sub-free', status: 'ACTIVE' });
      prisma.boutique.update.mockResolvedValue({});

      const result = await service.createSubscriptionCheckout(
        { boutiqueId: 'btq-free', planSlug: 'starter' },
        { id: 'owner-free', role: 'VENDEUR' },
      );

      expect(result.freePlan).toBe(true);
      expect(result.message).toContain('activée avec succès');
      expect(prisma.boutique.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'btq-free' },
          data: { plan: 'starter' },
        }),
      );
    });
  });

  describe('Traitement des Retraits Vendeurs via Payouts FedaPay (Admin)', () => {
    it('devrait déchiffrer paymentInfo E2EE et exécuter le virement Mobile Money', async () => {
      const plainPhone = '61998877';
      const encryptedPhone = paymentCrypto.encrypt(plainPhone);

      const mockWithdrawal = {
        id: 'wd-1',
        boutiqueId: 'btq-1',
        amount: 50000,
        fee: 300,
        netAmount: 49700,
        status: 'PENDING',
        paymentInfo: encryptedPhone,
        boutique: {
          id: 'btq-1',
          name: 'Wax Elegance',
          owner: { name: 'Salif Keita' },
        },
      };

      prisma.withdrawalRequest.findUnique.mockResolvedValue(mockWithdrawal);
      prisma.withdrawalRequest.update.mockResolvedValue({ id: 'wd-1', status: 'APPROVED' });
      prisma.notification.create.mockResolvedValue({});

      const result = await service.processWithdrawalPayout(
        { withdrawalId: 'wd-1' },
        { id: 'admin-1', role: 'ADMIN' },
      );

      expect(result.success).toBe(true);
      expect(prisma.withdrawalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wd-1' },
          data: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
      expect(prisma.notification.create).toHaveBeenCalled();
    });
  });
});
