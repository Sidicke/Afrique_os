import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderStatus, PaymentKind, Role } from '@prisma/client';
import request from 'supertest';

/**
 * Correctif C3 — Modèle de données de paiement et réconciliation.
 *
 * Ce test vérifie le comportement EN BOUT EN BOUT, contre une vraie base
 * PostgreSQL et de vrais appels HTTP :
 *
 *  1. Un règlement de commande produit une ligne `Payment` APPEND-ONLY et un
 *     journal comptable ÉQUILIBRÉ (total débit = total crédit).
 *  2. Le solde porté par le grand livre est IDENTIQUE à `Boutique.balance` :
 *     la réconciliation ne signale aucune anomalie.
 *  3. Un second règlement de la MÊME facture ne crédite pas deux fois — la
 *     contrainte UNIQUE (provider, providerRef, kind) l'interdit en base.
 *  4. Une divergence introduite en dehors du grand livre EST détectée par la
 *     réconciliation : c'est tout l'intérêt du contrôle.
 *  5. L'endpoint d'administration expose le rapport de réconciliation.
 */

describe('📒 Correctif C3 — Payment/Ledger et réconciliation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const unique = Date.now();

  const originalFetch = (global as any).fetch;
  const originalEnv = { ...process.env };

  let clientToken: string;
  let clientId: string;
  let adminToken: string;
  let boutiqueId: string;

  let order: any;

  beforeAll(async () => {
    process.env.PAYDUNYA_MASTER_KEY = 'master-key-e2e-c3';
    process.env.PAYDUNYA_PUBLIC_KEY = 'public-key-e2e-c3';
    process.env.PAYDUNYA_PRIVATE_KEY = 'private-key-e2e-c3';
    process.env.PAYDUNYA_TOKEN = 'token-e2e-c3';
    process.env.PAYDUNYA_ENVIRONMENT = 'sandbox';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);

    // --- Vendeur (crée sa boutique à l'inscription) ---
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Vendeur C3',
        shopName: `Boutique C3 ${unique}`,
        email: `seller-c3-${unique}@test.com`,
        password: 'Password123!',
      });
    const sellerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `seller-c3-${unique}@test.com`, password: 'Password123!' });
    const myBoutiques = await request(app.getHttpServer())
      .get('/api/v1/boutiques/my')
      .set('Authorization', `Bearer ${sellerLogin.body.accessToken}`);
    boutiqueId = myBoutiques.body[0].id;

    // --- Client ---
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Client C3',
        email: `client-c3-${unique}@test.com`,
        password: 'Password123!',
        role: 'CLIENT',
      });
    const clientLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `client-c3-${unique}@test.com`, password: 'Password123!' });
    clientToken = clientLogin.body.accessToken;
    clientId = clientLogin.body.user.id;

    // --- Administrateur (base de test non seedée : on crée le compte et on
    //     signe son jeton directement, sans passer par le formulaire de login) ---
    const adminEmail = `admin-c3-${unique}@test.com`;
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin C3',
        role: Role.ADMIN,
      },
    });
    const jwtService = new JwtService();
    adminToken = await jwtService.signAsync(
      { email: adminEmail, role: Role.ADMIN },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
        expiresIn: '15m',
        subject: adminUser.id,
      },
    );

    // --- Commande facturée 5 000 FCFA (token + montant figés, correctif C2) ---
    order = await prisma.order.create({
      data: {
        reference: `AC-C3-${unique}-1`,
        boutiqueId,
        userId: clientId,
        customerName: 'Client C3',
        customerPhone: '+2250700000001',
        total: 5000,
        paymentMethod: 'PAYDUNYA' as any,
        paydunyaToken: 'test_token_c3',
        paydunyaAmount: 5000,
      },
    });
  });

  afterAll(async () => {
    (global as any).fetch = originalFetch;
    process.env = { ...originalEnv };

    await prisma.ledgerEntry.deleteMany({
      where: {
        OR: [
          { orderId: order.id },
          { account: { boutiqueId } },
        ],
      },
    });
    await prisma.payment.deleteMany({ where: { orderId: order.id } });
    await prisma.ledgerAccount.deleteMany({ where: { code: `BOUTIQUE:${boutiqueId}` } });
    // Les comptes de la plateforme sont partagés : on remet leur solde à zéro
    // pour ne pas laisser de trace de ce test.
    await prisma.ledgerAccount.updateMany({
      where: {
        code: {
          in: [
            'PLATFORM_ESCROW',
            'PLATFORM_REVENUE',
            'PLATFORM_LOYALTY',
            'PLATFORM_CUSTOMER',
            'PLATFORM_PAYOUT',
          ],
        },
      },
      data: { balance: 0 },
    });
    await prisma.pointTransaction.deleteMany({ where: { orderId: order.id } });
    await prisma.settlementAllocation.deleteMany({ where: { orderId: order.id } });
    await prisma.notification.deleteMany({ where: { orderReference: order.reference } });
    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.user.deleteMany({ where: { email: { contains: `-c3-${unique}@test.com` } } });
    await app.close();
  });

  const mockConfirmApi = (payload: any) => {
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    }));
  };

  const paydunyaResponse = (token: string, total: any) => ({
    response_code: '00',
    response_text: 'Transaction Found',
    status: 'completed',
    invoice: { token, total_amount: total },
    custom_data: {
      orderId: order.id,
      orderReference: order.reference,
      boutiqueId,
    },
    receipt_url: `https://app.paydunya.com/sandbox-checkout/receipt/pdf/${token}.pdf`,
  });

  describe('1. Encaissement : Payment + journal équilibré', () => {
    it('règle la commande ET enregistre un Payment append-only', async () => {
      mockConfirmApi(paydunyaResponse('test_token_c3', '5000'));

      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/paydunya/confirm/test_token_c3`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.settlementStatus).toBe('order_paid_success');

      const updated = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updated!.status).toBe(OrderStatus.PAID);

      // Un Payment CAPTURE est enregistré, rattaché à la commande.
      const payments = await prisma.payment.findMany({ where: { orderId: order.id } });
      expect(payments).toHaveLength(1);
      expect(payments[0].kind).toBe(PaymentKind.CAPTURE);
      expect(payments[0].provider).toBe('PAYDUNYA');
      expect(payments[0].providerRef).toBe('test_token_c3');
      expect(Number(payments[0].grossAmount)).toBe(5000);
    });

    it('le journal comptable est ÉQUILIBRÉ (total débit = total crédit)', async () => {
      const entries = await prisma.ledgerEntry.findMany({
        where: { orderId: order.id },
        include: { account: true },
      });

      expect(entries.length).toBeGreaterThanOrEqual(3);

      const totalDebit = entries
        .filter((e) => e.direction === 'DEBIT')
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const totalCredit = entries
        .filter((e) => e.direction === 'CREDIT')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      expect(Math.abs(totalDebit - totalCredit)).toBeLessThanOrEqual(0.01);

      // Toutes les lignes du règlement partagent le même journal.
      expect(new Set(entries.map((e) => e.journalId)).size).toBe(1);

      // Le compte boutique porte exactement le net crédité.
      const boutiqueAccount = await prisma.ledgerAccount.findUnique({
        where: { code: `BOUTIQUE:${boutiqueId}` },
      });
      const orderAfter = await prisma.order.findUnique({ where: { id: order.id } });
      expect(Number(boutiqueAccount!.balance)).toBe(Number(orderAfter!.netAmount));
    });

    it('la réconciliation ne signale AUCUNE anomalie', async () => {
      const boutique = await prisma.boutique.findUnique({ where: { id: boutiqueId } });
      const account = await prisma.ledgerAccount.findUnique({
        where: { code: `BOUTIQUE:${boutiqueId}` },
      });

      expect(Number(account!.balance)).toBe(Number(boutique!.balance));
    });
  });

  describe('2. Double crédit impossible', () => {
    it('un second règlement de la MÊME facture ne crédite pas deux fois', async () => {
      const before = await prisma.boutique.findUnique({ where: { id: boutiqueId } });
      const balanceBefore = Number(before!.balance);

      mockConfirmApi(paydunyaResponse('test_token_c3', '5000'));

      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/paydunya/confirm/test_token_c3`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.settlementStatus).toBe('order_already_paid');

      const after = await prisma.boutique.findUnique({ where: { id: boutiqueId } });
      expect(Number(after!.balance)).toBe(balanceBefore);

      // Et surtout : toujours UN SEUL Payment pour cette facture.
      const payments = await prisma.payment.findMany({
        where: { provider: 'PAYDUNYA', providerRef: 'test_token_c3', kind: PaymentKind.CAPTURE },
      });
      expect(payments).toHaveLength(1);
    });

    it('la contrainte UNIQUE (provider, providerRef, kind) interdit le doublon en base', async () => {
      await expect(
        prisma.payment.create({
          data: {
            provider: 'PAYDUNYA',
            providerRef: 'test_token_c3',
            kind: PaymentKind.CAPTURE,
            direction: 'IN',
            grossAmount: 5000,
            netAmount: 5000,
            orderId: order.id,
            boutiqueId,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('3. La réconciliation détecte une divergence', () => {
    it('un solde modifié en dehors du grand livre est signalé', async () => {
      // Simulation d'une écriture directe en base (ou d'un flux non instrumenté).
      await prisma.boutique.update({
        where: { id: boutiqueId },
        data: { balance: { increment: 1234 } },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/reconciliation/boutique/${boutiqueId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(false);
      expect(Number(res.body.delta)).toBeCloseTo(1234, 2);

      // On rétablit l'état propre pour la suite.
      await prisma.boutique.update({
        where: { id: boutiqueId },
        data: { balance: { decrement: 1234 } },
      });
    });

    it('l\'endpoint admin renvoie le rapport global', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/reconciliation')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('balances');
      expect(res.body).toHaveProperty('payments');
      expect(res.body.payments).toHaveProperty('checkedOrders');
      expect(res.body.payments).toHaveProperty('missingCaptures');
    });

    it('l\'endpoint admin est réservé aux administrateurs', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/reconciliation')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);
    });
  });
});
