import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { FedaPayService } from '../src/fedapay/fedapay.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { IdempotencyService } from '../src/common/services/idempotency.service';
import { PaymentCryptoService } from '../src/common/crypto/payment-crypto.service';
import { BoutiquesService } from '../src/boutiques/boutiques.service';
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
    FEDAPAY_VENDOR_TRANSFER_FEE_FIXED: '150',
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
        findMany: jest.fn(),
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
      const validSig = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
      const validHeader = `t=${timestamp},s=${validSig}`;
      const fakeHeader = `t=${timestamp},s=0000000000000000000000000000000000000000000000000000000000000000`;

      // Fausse signature rejetée
      await expect(
        service.handleWebhook(rawBody, fakeHeader, payload),
      ).rejects.toThrow('Signature du Webhook FedaPay invalide.');
    });
  });

  describe('Pilier 4 : Vérification Zero-Trust, Frais Acheteur & Frais Vendeur', () => {
    it('MOBILE MONEY (2% acheteur) : panier 10 000 XOF -> acheteur paie 10 200 XOF, vendeur reçoit part nette déduite des frais fixes (150 XOF)', async () => {
      const orderAmount = 10000;
      const boutiqueCommissionRate = 5; // 5%
      const fixedTransferFee = 150; // 150 FCFA

      prisma.order.findUnique.mockResolvedValue({
        id: 'order-mm',
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
          fedapayCommissionRate: boutiqueCommissionRate,
          fedapayVendorFixedFee: fixedTransferFee,
        },
      });

      prisma.order.update.mockResolvedValue({ id: 'order-mm' });

      const response = await service.createCheckoutTransaction({
        orderId: 'order-mm',
        paymentChannel: 'MOBILE_MONEY',
      });

      // Vérifications Frais Acheteur : 2% de 10 000 = 200 FCFA -> Total débité = 10 200 FCFA
      expect(response.amount).toBe(orderAmount);
      expect(response.buyerFee).toBe(200);
      expect(response.buyerFeeRate).toBe(2);
      expect(response.totalChargedToBuyer).toBe(10200);
      expect(response.paymentChannel).toBe('MOBILE_MONEY');

      // Vérifications Marketplace & Frais Vendeur :
      // Commission 5% = 500 FCFA
      // Frais fixes de transfert vendeur = 150 FCFA
      // Part nette reversée au sous-compte = 10 000 - 500 - 150 = 9 350 FCFA
      expect(response.marketplaceSplit.hasSubAccount).toBe(true);
      expect(response.marketplaceSplit.subAccountRef).toBe('acc_cotonou_123');
      expect(response.marketplaceSplit.platformCommission).toBe(500);
      expect(response.marketplaceSplit.vendorFixedTransferFee).toBe(150);
      expect(response.marketplaceSplit.vendorNetShare).toBe(9350);

      // Vérification que la DB a enregistré le découpage exact
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-mm' },
          data: expect.objectContaining({
            buyerPaymentChannel: 'MOBILE_MONEY',
            buyerFeeRate: 2,
            buyerFeeAmount: 200,
            totalCharged: 10200,
            commissionRate: 5,
            commissionAmount: 500,
            vendorFixedFee: 150,
            netAmount: 9350,
          }),
        }),
      );
    });

    it('CARTE BANCAIRE (4% acheteur) : panier 10 000 XOF -> acheteur paie 10 400 XOF, vendeur reçoit part nette déduite des frais fixes (150 XOF)', async () => {
      const orderAmount = 10000;

      prisma.order.findUnique.mockResolvedValue({
        id: 'order-card',
        reference: 'CMD-CARD-002',
        total: orderAmount,
        status: OrderStatus.PENDING,
        customerName: 'Fatou Client',
        customerEmail: 'fatou@test.bj',
        customerPhone: '+22997223344',
        boutiqueId: 'btq-1',
        boutique: {
          id: 'btq-1',
          name: 'Boutique Cotonou',
          fedapaySubAccountRef: 'acc_cotonou_123',
          fedapaySubAccountStatus: 'ACTIVE',
          fedapayCommissionRate: 5,
          fedapayVendorFixedFee: 150,
        },
      });

      prisma.order.update.mockResolvedValue({ id: 'order-card' });

      const response = await service.createCheckoutTransaction({
        orderId: 'order-card',
        paymentChannel: 'CARD',
      });

      // Frais acheteur 4% sur carte : 400 FCFA -> total débité 10 400 FCFA
      expect(response.amount).toBe(orderAmount);
      expect(response.buyerFee).toBe(400);
      expect(response.buyerFeeRate).toBe(4);
      expect(response.totalChargedToBuyer).toBe(10400);
      expect(response.paymentChannel).toBe('CARD');

      // Part vendeur nette : 10 000 - 500 - 150 = 9 350 FCFA
      expect(response.marketplaceSplit.vendorNetShare).toBe(9350);
    });
  });

  describe('Demande de Retrait / Transfert Acompte Boutique (BoutiquesService)', () => {
    it('devrait déduire les frais fixes de transfert et chiffrer les coordonnées de paiement du vendeur', async () => {
      const mockBoutique = {
        id: 'btq-1',
        status: BoutiqueStatus.ACTIVE,
        balance: { toNumber: () => 50000 },
        fedapayVendorFixedFee: 150,
      };

      prisma.boutique.findUnique.mockResolvedValue(mockBoutique);
      prisma.boutique.updateMany.mockResolvedValue({ count: 1 });
      prisma.withdrawalRequest.create.mockImplementation((args: any) => Promise.resolve(args.data));

      const withdrawalAmount = 20000;
      const paymentDetails = 'Virement Moov Money: +22995001122';

      const result = await boutiquesService.requestWithdrawal(
        'btq-1',
        withdrawalAmount,
        paymentDetails,
      );

      // Frais fixes déduits : 150 FCFA -> Montant net versé = 19 850 FCFA
      expect(result.amount).toBe(20000);
      expect(result.fee).toBe(150);
      expect(result.netAmount).toBe(19850);

      // Coordonnées chiffrées en E2EE AES-256-GCM
      expect(result.paymentInfo).toMatch(/^pay_enc:v1:/);
      expect(result.paymentInfo).not.toContain('+22995001122');
    });
  });
});
