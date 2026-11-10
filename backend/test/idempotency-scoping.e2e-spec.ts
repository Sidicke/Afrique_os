import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import request from 'supertest';

/**
 * Correctif C1 — Non-collision des clés d'idempotence au niveau HTTP.
 *
 * Ce test vérifie le comportement EN BOUT EN BOUT, contre une vraie base
 * PostgreSQL : la clé d'idempotence est désormais scopée par endpoint
 * (couple (key, path)), et non plus globellement sur la seule `key`.
 *
 * Scénarios couverts :
 *  1. La MÊME clé envoyée sur deux endpoints distincts ne doit jamais faire
 *     fuiter la réponse d'un endpoint vers l'autre. C'est exactement le bug
 *     C1 : la création de facture PayDunya récupérait la réponse de la
 *     création de commande et ne créait AUCUNE facture.
 *  2. La MÊME clé rejouée sur le MÊME endpoint doit renvoyer la réponse
 *     mémorisée (l'idempotence reste garantie).
 *  3. La contrainte UNIQUE (key, path) est bien appliquée en base.
 */
describe('🔑 Correctif C1 — Idempotence scopée par endpoint (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const SHARED_KEY = `uuid-partage-e2e-${Date.now()}`;
  const ORDER_PATH = '/orders/create';
  const PAYDUNYA_PATH = '/api/v1/payments/paydunya/create-transaction';

  beforeAll(async () => {
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
  });

  afterAll(async () => {
    // Nettoyage des enregistrements créés par ce test.
    await prisma.idempotencyKey.deleteMany({ where: { key: SHARED_KEY } });
    await app.close();
  });

  describe('1. Non-collision entre endpoints distincts', () => {
    it('la réponse de la commande N\'est PAS réutilisée par la création de facture', async () => {
      // On simule l'enregistrement issu de la création de commande en
      // écrivant directement l'enregistrement d'idempotence, avec une charge
      // utile de type « commande » (ce que renvoie POST /orders/...).
      await prisma.idempotencyKey.create({
        data: {
          key: SHARED_KEY,
          path: ORDER_PATH,
          statusCode: 201,
          responseBody: {
            id: 'order_factice',
            orderNumber: '#AC-FACTICE',
            reference: 'AC-FACTICE',
            status: 'PENDING',
            total: 5000,
          },
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });

      // Appel HTTP réel sur l'endpoint de création de facture PayDunya avec
      // la MÊME clé. La commande n'existe pas en base : on s'attend à un
      // 404 « commande introuvable » — et surtout PAS à un retour de la
      // charge utile en cache de la commande.
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/paydunya/create-transaction')
        .set('Idempotency-Key', SHARED_KEY)
        .send({ orderId: 'order_inexistante_000000000000' });

      // ⚠️ AVANT le correctif, la réponse aurait été le 200/201 contenant
      // l'objet de commande mémorisé (checkoutUrl absent). On vérifie donc
      // que la réponse n'est PAS la commande mémorisée.
      expect(res.body).not.toHaveProperty('orderNumber', '#AC-FACTICE');
      expect(res.body).not.toHaveProperty('id', 'order_factice');
      expect(res.body.checkoutUrl).toBeUndefined();

      // Et l'enregistrement de la commande doit être INTACT : l'endpoint
      // PayDunya n'a pas écrasé le cache d'un autre endpoint.
      const orderRecord = await prisma.idempotencyKey.findUnique({
        where: { key_path: { key: SHARED_KEY, path: ORDER_PATH } },
      });
      expect(orderRecord).not.toBeNull();
      expect((orderRecord?.responseBody as any).orderNumber).toBe('#AC-FACTICE');
    });

    it('les deux endpoints peuvent cohabiter avec la même clé (2 enregistrements distincts)', async () => {
      const key = `uuid-cohabitation-${Date.now()}`;

      await prisma.idempotencyKey.create({
        data: {
          key,
          path: ORDER_PATH,
          statusCode: 201,
          responseBody: { id: 'order_factice', total: 5000 },
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
      await prisma.idempotencyKey.create({
        data: {
          key,
          path: PAYDUNYA_PATH,
          statusCode: 201,
          responseBody: {
            success: true,
            mode: 'sandbox_mock',
            transactionId: 'mock_pd_1',
            reference: 'AC-FACTICE',
            amount: 5000,
            currency: 'XOF',
            checkoutUrl: 'https://paydunya.com/sandbox-checkout/invoice/mock_pd_1',
            token: 'mock_pd_1',
          },
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });

      const rows = await prisma.idempotencyKey.findMany({ where: { key } });
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.path).sort()).toEqual([ORDER_PATH, PAYDUNYA_PATH].sort());

      await prisma.idempotencyKey.deleteMany({ where: { key } });
    });
  });

  describe('2. Idempotence conservée sur un même endpoint', () => {
    it('rejouer la même clé sur le même endpoint renvoie la réponse mémorisée', async () => {
      const key = `uuid-meme-endpoint-${Date.now()}`;
      const body = {
        success: true,
        mode: 'sandbox_mock',
        transactionId: 'mock_pd_replay',
        reference: 'AC-REPLAY',
        amount: 7500,
        currency: 'XOF',
        checkoutUrl: 'https://paydunya.com/sandbox-checkout/invoice/mock_pd_replay',
        token: 'mock_pd_replay',
      };

      await prisma.idempotencyKey.create({
        data: {
          key,
          path: PAYDUNYA_PATH,
          statusCode: 201,
          responseBody: body,
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });

      // Relit via l'API HTTP : le service doit servir la réponse en cache
      // pour ce couple (key, path).
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/paydunya/create-transaction')
        .set('Idempotency-Key', key)
        .send({ orderId: 'order_inexistante_000000000000' });

      // La réponse mémorisée est renvoyée telle quelle (idemprise) : on
      // retrouve le token et l'URL mémorisés, sans jamais créer de facture.
      expect(res.body.token).toBe('mock_pd_replay');
      expect(res.body.checkoutUrl).toBe(
        'https://paydunya.com/sandbox-checkout/invoice/mock_pd_replay',
      );
      expect(res.body.amount).toBe(7500);

      await prisma.idempotencyKey.deleteMany({ where: { key } });
    });

    it('la contrainte UNIQUE (key, path) interdit les doublons sur un même endpoint', async () => {
      const key = `uuid-doublon-${Date.now()}`;

      await prisma.idempotencyKey.create({
        data: {
          key,
          path: PAYDUNYA_PATH,
          statusCode: 201,
          responseBody: { token: 'a' },
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });

      // Le même couple (key, path) doit être refusé par la base.
      await expect(
        prisma.idempotencyKey.create({
          data: {
            key,
            path: PAYDUNYA_PATH,
            statusCode: 201,
            responseBody: { token: 'b' },
            expiresAt: new Date(Date.now() + 3600_000),
          },
        }),
      ).rejects.toThrow();

      await prisma.idempotencyKey.deleteMany({ where: { key } });
    });
  });
});
