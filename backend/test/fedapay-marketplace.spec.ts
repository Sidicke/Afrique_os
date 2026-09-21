import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { FedaPayService } from '../src/fedapay/fedapay.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { IdempotencyService } from '../src/common/services/idempotency.service';
import { OrderStatus, PaymentMethod } from '@prisma/client';

describe('FedaPay Marketplace & Sub-accounts Service', () => {
  let service: FedaPayService;
  let prisma: any;
  let configService: any;
  let idempotencyService: any;

  const mockConfig: Record<string, string> = {
    FEDAPAY_SECRET_KEY: 'YOUR_FEDAPAY_SECRET_KEY',
    FEDAPAY_ENVIRONMENT: 'sandbox',
    FEDAPAY_WEBHOOK_SECRET: 'whsec_test_secret_123456789',
    FEDAPAY_CALLBACK_URL: 'http://localhost:3001/checkout/success',
  };

  beforeEach(async () => {
    prisma = {
      boutique: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
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
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: IdempotencyService, useValue: idempotencyService },
      ],
    }).compile();

    service = module.get<FedaPayService>(FedaPayService);
  });

  describe('Sub-accounts Management', () => {
    it('devrait envoyer une invitation de sous-compte FedaPay en mode sandbox simulation', async () => {
      prisma.boutique.findUnique.mockResolvedValue({
        id: 'btq-1',
        name: 'Tech Store Cotonou',
        ownerId: 'user-1',
        email: 'vendeur@techstore.bj',
      });

      prisma.boutique.update.mockResolvedValue({
        id: 'btq-1',
        fedapaySubAccountStatus: 'INVITED',
      });

      const result = await service.inviteSubAccount(
        {
          boutiqueId: 'btq-1',
          email: 'vendeur@techstore.bj',
          fullName: 'Koffi Vendeur',
        },
        { id: 'user-1', role: 'VENDEUR' },
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('INVITED');
      expect(result.invitation.mode).toBe('sandbox_mock');
      expect(prisma.boutique.update).toHaveBeenCalledWith({
        where: { id: 'btq-1' },
        data: { fedapaySubAccountStatus: 'INVITED' },
      });
    });

    it('devrait lier une référence de sous-compte validée (acc_xxxxxxxxx)', async () => {
      prisma.boutique.findUnique.mockResolvedValue({
        id: 'btq-1',
        ownerId: 'user-1',
      });

      prisma.boutique.update.mockResolvedValue({
        id: 'btq-1',
        fedapaySubAccountRef: 'acc_cotonou_987654',
        fedapaySubAccountStatus: 'ACTIVE',
      });

      const result = await service.linkSubAccount(
        {
          boutiqueId: 'btq-1',
          subAccountRef: 'acc_cotonou_987654',
        },
        { id: 'user-1', role: 'VENDEUR' },
      );

      expect(result.success).toBe(true);
      expect(result.fedapaySubAccountRef).toBe('acc_cotonou_987654');
      expect(result.fedapaySubAccountStatus).toBe('ACTIVE');
    });
  });

  describe('Marketplace Checkout & Commissions Distribution', () => {
    it('devrait calculer la commission marketplace et la part vendeur avec sous-compte actif', async () => {
      const orderAmount = 50000;
      const commissionRate = 5; // 5%
      const expectedCommission = 2500; // 50000 * 0.05
      const expectedVendorShare = 47500; // 50000 - 2500

      prisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        reference: 'CMD-2026-999',
        total: orderAmount,
        status: OrderStatus.PENDING,
        customerName: 'Amina Client',
        customerEmail: 'amina@client.com',
        customerPhone: '+22997000000',
        boutiqueId: 'btq-1',
        boutique: {
          id: 'btq-1',
          name: 'Tech Store Cotonou',
          fedapaySubAccountRef: 'acc_cotonou_987654',
          fedapaySubAccountStatus: 'ACTIVE',
          fedapayCommissionRate: commissionRate,
        },
      });

      prisma.order.update.mockResolvedValue({ id: 'order-123' });

      const response = await service.createCheckoutTransaction({
        orderId: 'order-123',
      });

      expect(response.success).toBe(true);
      expect(response.amount).toBe(orderAmount);
      expect(response.marketplaceSplit).toBeDefined();
      expect(response.marketplaceSplit?.hasSubAccount).toBe(true);
      expect(response.marketplaceSplit?.subAccountRef).toBe('acc_cotonou_987654');
      expect(response.marketplaceSplit?.platformCommission).toBe(expectedCommission);
      expect(response.marketplaceSplit?.vendorShare).toBe(expectedVendorShare);

      // Vérifie que la commande en base a bien enregistré la répartition
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-123' },
          data: expect.objectContaining({
            commissionRate: 5,
            commissionAmount: 2500,
            netAmount: 47500,
            fedapaySubAccountRef: 'acc_cotonou_987654',
          }),
        }),
      );
    });
  });

  describe('Webhook & Signature HMAC Security', () => {
    it('devrait valider la signature HMAC-SHA256 et traiter la commande payée', async () => {
      const secret = 'whsec_test_secret_123456789';
      const webhookPayload = {
        name: 'transaction.approved',
        id: 'evt_1234567',
        entity: {
          id: 'fedapay_tx_5555',
          reference: 'CMD-2026-999',
          custom_metadata: {
            orderId: 'order-123',
            orderReference: 'CMD-2026-999',
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

      const signatureHeader = `t=${timestamp},s=${signature}`;

      prisma.order.findFirst.mockResolvedValue({
        id: 'order-123',
        reference: 'CMD-2026-999',
        total: 50000,
        netAmount: 47500,
        commissionAmount: 2500,
        fedapaySubAccountRef: 'acc_cotonou_987654',
        boutiqueId: 'btq-1',
        status: OrderStatus.PENDING,
      });

      prisma.order.update.mockResolvedValue({ id: 'order-123' });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.handleWebhook(
        rawBody,
        signatureHeader,
        webhookPayload,
      );

      expect(result.received).toBe(true);
      expect(result.status).toBe('order_paid_success');

      // Vérification que le statut de la commande passe à PAID
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-123' },
          data: expect.objectContaining({
            status: OrderStatus.PAID,
            paymentMethod: PaymentMethod.FEDAPAY,
            paymentRef: 'FEDAPAY-fedapay_tx_5555',
          }),
        }),
      );

      // Notification au vendeur avec détails commissions
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            boutiqueId: 'btq-1',
            type: 'order_paid',
          }),
        }),
      );
    });

    it('devrait rejeter une requête Webhook si la signature est frauduleuse', async () => {
      const invalidSignatureHeader = 't=123456,s=deadbeefinvalidchecksum';
      const rawBody = JSON.stringify({ name: 'transaction.approved' });

      await expect(
        service.handleWebhook(rawBody, invalidSignatureHeader, {}),
      ).rejects.toThrow('Signature du Webhook FedaPay invalide.');
    });
  });
});
