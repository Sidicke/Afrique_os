import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import request from 'supertest';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const base = '/api/v1/auth';
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

  it('refuse un DTO invalide (champ inconnu) → 400', async () => {
    await request(app.getHttpServer())
      .post(`${base}/register`)
      .send({ name: 'X', shopName: 'Y', email: 'a@b.fr', password: 'pass123', hacker: true })
      .expect(400);
  });

  it('inscrit un vendeur et crée sa boutique en PENDING', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base}/register`)
      .send({
        name: 'Vendeur E2E',
        shopName: `Boutique E2E ${unique}`,
        email: `vendeur-${unique}@test.com`,
        phone: '+2250700000000',
        password: 'password123',
      })
      .expect(201);
    expect(res.body.user.role).toBe('VENDEUR');
    expect(res.body.boutique.status).toBe('PENDING');
    expect(res.body.boutique.slug).toContain('boutique-e2e');
  });

  it('refuse un email déjà utilisé → 409', async () => {
    await request(app.getHttpServer())
      .post(`${base}/register`)
      .send({
        name: 'Doublon',
        shopName: 'Doublon Shop',
        email: `vendeur-${unique}@test.com`,
        password: 'password123',
      })
      .expect(409);
  });

  it('connecte le vendeur seedé, pose le cookie httpOnly et renvoie l’access token', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email: 'vendeur@aziztech.com', password: 'vendeur1234' })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.boutiqueSlug).toBe('aziz-tech');

    // Cookie httpOnly présent
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const refreshCookie = setCookie.find((c) => c.startsWith('refresh_token='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
  });

  it('renouvelle la session via le cookie refresh → 200', async () => {
    const login = await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email: 'vendeur@aziztech.com', password: 'vendeur1234' })
      .expect(200);

    // Récupère le cookie httpOnly posé par le serveur
    const refreshCookie = extractRefreshCookie(login);
    expect(refreshCookie).toBeTruthy();

    const res = await request(app.getHttpServer())
      .post(`${base}/refresh`)
      .set('Cookie', refreshCookie)
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('refuse un refresh sans cookie → 401', async () => {
    await request(app.getHttpServer()).post(`${base}/refresh`).expect(401);
  });

  it('déconnecte : le cookie est effacé et le refresh échoue ensuite → 401', async () => {
    const login = await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email: 'vendeur@aziztech.com', password: 'vendeur1234' })
      .expect(200);
    const token = login.body.accessToken as string;
    const refreshCookie = extractRefreshCookie(login);

    await request(app.getHttpServer())
      .post(`${base}/logout`)
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', refreshCookie)
      .expect(200);

    // Le refresh token a été révoqué côté serveur (rotation)
    await request(app.getHttpServer())
      .post(`${base}/refresh`)
      .set('Cookie', refreshCookie)
      .expect(401);
  });

  it('bloque une route protégée sans token → 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('mauvais mot de passe → 401', async () => {
    await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ email: 'vendeur@aziztech.com', password: 'mauvais' })
      .expect(401);
  });
});

/** Extrait le cookie refresh_token (nom=valeur) d'une réponse login */
function extractRefreshCookie(
  res: { headers: Record<string, string | string[] | undefined> },
): string {
  const raw = res.headers['set-cookie'];
  const setCookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = setCookies.find((c) => c.startsWith('refresh_token='));
  if (!cookie) throw new Error('refresh_token absent des set-cookie');
  return cookie.split(';')[0];
}
