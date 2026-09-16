import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import request from 'supertest';

describe('⚡ Tests de Résistance, Rate Limiting & Charge (DoS Applicatif)', () => {
  let app: INestApplication;
  const unique = Date.now();

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. 🛡️ Protection Anti-Bruteforce & Déclenchement du Rate Limiter (HTTP 429)', () => {
    it('Bloque avec HTTP 429 (Too Many Requests) lorsque le seuil du Throttler est dépassé sur une route protégée', async () => {
      // La route /payments/fedapay/create-transaction est configurée avec un seuil strict : limit=5 par minute
      const totalRequests = 10;
      const responses: request.Response[] = [];

      // Envoi séquentiel rapide de 10 requêtes
      for (let i = 0; i < totalRequests; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/payments/fedapay/create-transaction')
          .send({ orderId: '00000000-0000-0000-0000-000000000000' });
        responses.push(res);
      }

      const throttledCount = responses.filter((r) => r.status === 429).length;
      const nonThrottledCount = responses.filter((r) => r.status !== 429).length;

      // Les premières requêtes sont traitées normalement (<= 5), les suivantes sont bloquées en 429
      expect(throttledCount).toBeGreaterThan(0);
      expect(nonThrottledCount).toBeLessThanOrEqual(5);
    });
  });

  describe('2. ⚡ Résistance sous Forte Concurrence (Catalogue Public)', () => {
    it('Traite avec succès et rapidité une rafale concurrente de 30 requêtes sur le catalogue public sans crash', async () => {
      const concurrency = 30;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrency }, () =>
        request(app.getHttpServer()).get('/api/v1/products/public/boutique/aziz-tech')
      );

      const responses = await Promise.all(promises);
      const totalTimeMs = Date.now() - startTime;

      // Toutes les requêtes doivent répondre avec un code 200 OK
      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBe(concurrency);

      // Calcul de la latence moyenne par requête
      const avgLatency = totalTimeMs / concurrency;
      expect(avgLatency).toBeLessThan(100);
    });
  });

  describe('3. 🛡️ Robustesse aux Payloads Volumineux (Anti-Crash Mémoire)', () => {
    it('Rejette ou traite de manière sécurisée les requêtes avec payload JSON volumineux sans impacter la stabilité', async () => {
      // Payload JSON volumineux contenant 5 000 caractères dans chaque champ
      const largeString = 'A'.repeat(5000);
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: largeString,
          email: `large-${unique}@test.com`,
          password: 'password123',
          shopName: largeString,
        });

      // Le serveur ne doit jamais renvoyer 500 (erreur interne non gérée)
      expect(res.status).not.toBe(500);

      // Le serveur doit rester réactif
      const healthCheck = await request(app.getHttpServer()).get('/api/v1/boutiques/public/aziz-tech');
      expect(healthCheck.status).toBe(200);
    });
  });
});
