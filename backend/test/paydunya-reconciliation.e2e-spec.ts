import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import request from 'supertest';

/**
 * Correctif C2 — Réconciliation de la facture PayDunya avec la commande attendue.
 *
 * Ce test vérifie le comportement EN BOUT EN BOUT, contre une vraie base
 * PostgreSQL et de vrais appels HTTP :
 *
 *  1. `GET /payments/paydunya/confirm/:token` exige une SESSION AUTHENTIFIÉE
 *     (401 sinon) et le contrôle de PROPRIÉTÉ de la commande (403 sinon).
 *  2. Le `?orderId=` fourni par l'appelant est IGNORÉ : la commande provient
 *     des données serveur de la facture. Une commande arbitraire ne peut donc
 *     plus être soldée avec un token devinable.
 *  3. Le montant ENCAISSÉ (`invoice.total_amount`) est comparé au montant
 *     ATTENDU : un sous-paiement est refusé et la commande reste PENDING.
 */

describe('🛡️ Correctif C2 — Réconciliation facture ↔ commande (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const unique = Date.now();

  const originalFetch = (global as any).fetch;
  const originalEnv = { ...process.env };

  let clientToken: string;
  let clientId: string;
  let intruderToken: string;
  let intruderId: string;
  let sellerToken: string;
  let boutiqueId: string;

  let orderClient: any;
  let orderUnderpaid: any;
  let orderAttacker: any;
  let orderVictim: any;

  const CONFIRM_PATH = '/api/v1/payments/paydunya/confirm';

  beforeAll(async () => {
    // Clés PayDunya de test : l'endpoint « confirm » refuse de vérifier une
    // facture si les 4 clés ne sont pas configurées. `ConfigService.get()`
    // retombe sur `process.env` au moment de l'appel → le set suffit.
    process.env.PAYDUNYA_MASTER_KEY = 'master-key-e2e-c2';
    process.env.PAYDUNYA_PUBLIC_KEY = 'public-key-e2e-c2';
    process.env.PAYDUNYA_PRIVATE_KEY = 'private-key-e2e-c2';
    process.env.PAYDUNYA_TOKEN = 'token-e2e-c2';
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

    // --- Vendeur (propriétaire de la boutique) ---
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Vendeur C2',
        shopName: `Boutique C2 ${unique}`,
        email: `seller-c2-${unique}@test.com`,
        password: 'Password123!',
      });
    const sellerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `seller-c2-${unique}@test.com`, password: 'Password123!' });
    sellerToken = sellerLogin.body.accessToken;

    const myBoutiques = await request(app.getHttpServer())
      .get('/api/v1/boutiques/my')
      .set('Authorization', `Bearer ${sellerToken}`);
    boutiqueId = myBoutiques.body[0].id;

    // --- Client (acheteur) ---
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Client C2',
        email: `client-c2-${unique}@test.com`,
        password: 'Password123!',
        role: 'CLIENT',
      });
    const clientLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `client-c2-${unique}@test.com`, password: 'Password123!' });
    clientToken = clientLogin.body.accessToken;
    clientId = clientLogin.body.user.id;

    // --- Intrus (ni client de la commande, ni propriétaire de la boutique) ---
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Intrus C2',
        email: `intruder-c2-${unique}@test.com`,
        password: 'Password123!',
        role: 'CLIENT',
      });
    const intruderLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `intruder-c2-${unique}@test.com`, password: 'Password123!' });
    intruderToken = intruderLogin.body.accessToken;
    intruderId = intruderLogin.body.user.id;

    const baseOrder = {
      boutiqueId,
      customerName: 'Client C2',
      customerPhone: '+2250700000001',
      paymentMethod: 'PAYDUNYA' as any,
    };

    // Commande du client, facturée 5 000 FCFA (token + montant figés = correctif C2)
    orderClient = await prisma.order.create({
      data: {
        ...baseOrder,
        reference: `AC-C2-${unique}-CLIENT`,
        userId: clientId,
        total: 5000,
        paydunyaToken: 'test_token_c2_client',
        paydunyaAmount: 5000,
      },
    });

    // Commande du client facturée 5 000 FCFA, mais payée 100 FCFA
    orderUnderpaid = await prisma.order.create({
      data: {
        ...baseOrder,
        reference: `AC-C2-${unique}-UNDERPAID`,
        userId: clientId,
        total: 5000,
        paydunyaToken: 'test_token_c2_underpaid',
        paydunyaAmount: 5000,
      },
    });

    // Commande de l'intrus : 100 FCFA, c'est SA facture
    orderAttacker = await prisma.order.create({
      data: {
        ...baseOrder,
        reference: `AC-C2-${unique}-ATTACKER`,
        userId: intruderId,
        total: 100,
        paydunyaToken: 'test_token_c2_attacker',
        paydunyaAmount: 100,
      },
    });

    // Commande victime : 50 000 FCFA, jamais facturée chez nous
    orderVictim = await prisma.order.create({
      data: {
        ...baseOrder,
        reference: `AC-C2-${unique}-VICTIM`,
        userId: clientId,
        total: 50000,
      },
    });
  });

  afterAll(async () => {
    (global as any).fetch = originalFetch;
    process.env = { ...originalEnv };

    await prisma.order.deleteMany({
      where: { reference: { contains: `AC-C2-${unique}` } },
    });
    await prisma.pointTransaction.deleteMany({
      where: { orderId: { in: [orderClient.id, orderUnderpaid.id] } },
    });
    await prisma.settlementAllocation.deleteMany({
      where: { orderId: { in: [orderClient.id, orderUnderpaid.id] } },
    });
    await prisma.notification.deleteMany({
      where: { orderReference: { contains: `AC-C2-${unique}` } },
    });
    await prisma.idempotencyKey.deleteMany({ where: { key: `paydunya_webhook_c2_${unique}` } });
    // Correctif C3 — traces comptables produites par les règlements de ce test.
    // Les écritures sont supprimées AVANT leur compte (clé étrangère), et
    // l'ensemble des lignes du journal est visé (et pas seulement celles
    // rattachées aux commandes listées : le règlement de la commande de
    // l'intrus écrit aussi sur le même compte boutique).
    const boutiqueAccount = await prisma.ledgerAccount.findUnique({
      where: { code: `BOUTIQUE:${boutiqueId}` },
      select: { id: true },
    });
    await prisma.ledgerEntry.deleteMany({
      where: {
        OR: [
          { accountId: boutiqueAccount?.id ?? '__inexistant__' },
          { orderId: { in: [orderClient.id, orderUnderpaid.id, orderAttacker.id] } },
        ],
      },
    });
    await prisma.payment.deleteMany({ where: { boutiqueId } });
    await prisma.ledgerAccount.deleteMany({ where: { code: `BOUTIQUE:${boutiqueId}` } });
    // Comptes de la plateforme partagés : on remet leur solde à zéro.
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
    // Comptes de test (la cascade User → Boutique nettoie la boutique).
    await prisma.user.deleteMany({ where: { email: { contains: `-c2-${unique}@test.com` } } });
    await app.close();
  });

  /** Simule la réponse HTTP « confirm » de l'API PayDunya. */
  const mockConfirmApi = (payload: any) => {
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    }));
  };

  const paydunyaResponse = (token: string, total: any, orderId: string, orderRef: string) => ({
    response_code: '00',
    response_text: 'Transaction Found',
    status: 'completed',
    invoice: { token, total_amount: total },
    custom_data: { orderId, orderReference: orderRef, boutiqueId },
    receipt_url: `https://app.paydunya.com/sandbox-checkout/receipt/pdf/${token}.pdf`,
  });

  describe('1. Contrôle d\'accès sur confirm/:token', () => {
    it('refuse une requête SANS session authentifiée → 401', async () => {
      mockConfirmApi(
        paydunyaResponse(
          orderClient.paydunyaToken,
          '5000',
          orderClient.id,
          orderClient.reference,
        ),
      );

      const res = await request(app.getHttpServer()).get(
        `${CONFIRM_PATH}/${orderClient.paydunyaToken}`,
      );

      expect(res.status).toBe(401);

      // Et surtout : aucun règlement.
      const order = await prisma.order.findUnique({ where: { id: orderClient.id } });
      expect(order?.status).toBe(OrderStatus.PENDING);
    });

    it('refuse un appelant qui ne possède PAS la commande → 403', async () => {
      mockConfirmApi(
        paydunyaResponse(
          orderClient.paydunyaToken,
          '5000',
          orderClient.id,
          orderClient.reference,
        ),
      );

      const res = await request(app.getHttpServer())
        .get(`${CONFIRM_PATH}/${orderClient.paydunyaToken}`)
        .set('Authorization', `Bearer ${intruderToken}`);

      expect(res.status).toBe(403);

      const order = await prisma.order.findUnique({ where: { id: orderClient.id } });
      expect(order?.status).toBe(OrderStatus.PENDING);
    });
  });

  describe('2. Le ?orderId= de l\'appelant est IGNORÉ', () => {
    it('un token devinable ne solde plus une commande arbitraire', async () => {
      // L'intrus possesseur d'une facture de 100 FCFA tente de solder la
      // commande victime de 50 000 FCFA via `?orderId=`.
      mockConfirmApi(
        paydunyaResponse(
          orderAttacker.paydunyaToken,
          '100',
          orderAttacker.id,
          orderAttacker.reference,
        ),
      );

      const res = await request(app.getHttpServer())
        .get(`${CONFIRM_PATH}/${orderAttacker.paydunyaToken}?orderId=${orderVictim.id}`)
        .set('Authorization', `Bearer ${intruderToken}`);

      expect(res.status).toBe(200);

      // La commande VICTIME n'a pas été touchée.
      const victim = await prisma.order.findUnique({ where: { id: orderVictim.id } });
      expect(victim?.status).toBe(OrderStatus.PENDING);
      expect(victim?.paidAt).toBeNull();
      expect(victim?.paymentRef).toBeNull();
    });
  });

  describe('3. Comparaison du montant payé au montant attendu', () => {
    it('règle la commande quand le montant encaissé est EXACTEMENT le montant facturé', async () => {
      mockConfirmApi(
        paydunyaResponse(
          orderClient.paydunyaToken,
          '5000',
          orderClient.id,
          orderClient.reference,
        ),
      );

      const res = await request(app.getHttpServer())
        .get(`${CONFIRM_PATH}/${orderClient.paydunyaToken}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.settlementStatus).toBe('order_paid_success');

      const order = await prisma.order.findUnique({ where: { id: orderClient.id } });
      expect(order?.status).toBe(OrderStatus.PAID);
      expect(order?.paymentMethod).toBe('PAYDUNYA');
      expect(order?.paymentRef).toBe(`PAYDUNYA-${orderClient.paydunyaToken}`);
    });

    it('refuse un SOUS-paiement : la commande reste PENDING', async () => {
      mockConfirmApi(
        paydunyaResponse(
          orderUnderpaid.paydunyaToken,
          '100',
          orderUnderpaid.id,
          orderUnderpaid.reference,
        ),
      );

      const res = await request(app.getHttpServer())
        .get(`${CONFIRM_PATH}/${orderUnderpaid.paydunyaToken}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(400);
      expect(String(res.body.message)).toContain('incohérent');

      const order = await prisma.order.findUnique({ where: { id: orderUnderpaid.id } });
      expect(order?.status).toBe(OrderStatus.PENDING);
      expect(order?.paidAt).toBeNull();
    });

    it('refuse un règlement si le montant de la facture est absent de la réponse PayDunya', async () => {
      const payload = paydunyaResponse(
        orderUnderpaid.paydunyaToken,
        '5000',
        orderUnderpaid.id,
        orderUnderpaid.reference,
      );
      delete (payload as any).invoice.total_amount;
      mockConfirmApi(payload);

      const res = await request(app.getHttpServer())
        .get(`${CONFIRM_PATH}/${orderUnderpaid.paydunyaToken}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(400);

      const order = await prisma.order.findUnique({ where: { id: orderUnderpaid.id } });
      expect(order?.status).toBe(OrderStatus.PENDING);
    });

    it('refuse une facture qui n\'est pas celle émise pour la commande', async () => {
      // La commande est liée au token `test_token_c2_underpaid`, mais le token
      // encaissé est un autre (facture d'une autre commande).
      mockConfirmApi(
        paydunyaResponse(
          'test_token_c2_autre',
          '5000',
          orderUnderpaid.id,
          orderUnderpaid.reference,
        ),
      );

      const res = await request(app.getHttpServer())
        .get(`${CONFIRM_PATH}/test_token_c2_autre`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(400);
      expect(String(res.body.message)).toContain('rattachée');

      const order = await prisma.order.findUnique({ where: { id: orderUnderpaid.id } });
      expect(order?.status).toBe(OrderStatus.PENDING);
    });
  });

  describe('4. Le propriétaire de la boutique peut confirmer', () => {
    it('le vendeur légitime déclenche le règlement de la commande de son client', async () => {
      mockConfirmApi(
        paydunyaResponse(
          orderUnderpaid.paydunyaToken,
          '5000',
          orderUnderpaid.id,
          orderUnderpaid.reference,
        ),
      );

      const res = await request(app.getHttpServer())
        .get(`${CONFIRM_PATH}/${orderUnderpaid.paydunyaToken}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);

      const order = await prisma.order.findUnique({ where: { id: orderUnderpaid.id } });
      expect(order?.status).toBe(OrderStatus.PAID);
    });
  });
});
