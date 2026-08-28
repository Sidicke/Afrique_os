import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import request from 'supertest';

describe('Boutiques (e2e)', () => {
  let app: INestApplication;
  const unique = Date.now();
  let ownerToken: string;
  let intruderToken: string;
  let boutiqueId: string;

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

    // Deux vendeurs pour tester l'isolation
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Propriétaire',
        shopName: `Boutique Owner ${unique}`,
        email: `owner-${unique}@test.com`,
        password: 'password123',
      })
      .expect(201);
    ownerToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: `owner-${unique}@test.com`, password: 'password123' })
    ).body.accessToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Intrus',
        shopName: `Boutique Intrus ${unique}`,
        email: `intrus-${unique}@test.com`,
        password: 'password123',
      })
      .expect(201);
    intruderToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: `intrus-${unique}@test.com`, password: 'password123' })
    ).body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('la boutique créée à l’inscription est en PENDING', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/boutiques/my')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('PENDING');
    boutiqueId = res.body[0].id;
  });

  it('un vendeur peut créer une boutique supplémentaire', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/boutiques')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Boutique Créée ${unique}` })
      .expect(201);
  });

  it('met à jour sa boutique (propriétaire) → 200', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/boutiques/${boutiqueId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ tagline: 'Nouveau slogan', city: 'Abidjan', deliveryPacks: [
        { id: 'std', name: 'Standard', price: 1500, description: '24-48h' },
      ] })
      .expect(200);
    expect(res.body.tagline).toBe('Nouveau slogan');
  });

  it('isolation : un autre vendeur ne peut pas accéder à la boutique → 403', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/boutiques/${boutiqueId}`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .expect(403);
  });

  it('isolation : un autre vendeur ne peut pas modifier la boutique → 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/boutiques/${boutiqueId}`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ name: 'Vol' })
      .expect(403);
  });

  it('isolation : l’intrus ne voit pas la boutique de l’autre dans /my', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/boutiques/my')
      .set('Authorization', `Bearer ${intruderToken}`)
      .expect(200);
    const ids = res.body.map((b: { id: string }) => b.id);
    expect(ids).not.toContain(boutiqueId);
  });

  it('vitrine publique : la boutique seedée aziz-tech est visible et complète', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/boutiques/public/aziz-tech')
      .expect(200);
    expect(res.body.name).toBe('Aziz Tech');
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.deliveryPacks).toBeInstanceOf(Array);
    expect(res.body.products.length).toBeGreaterThan(0);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  it('vitrine : une boutique PENDING n’est pas exposée publiquement → 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/boutiques/public/boutique-owner-${unique}`)
      .expect(404);
  });

  it('cycle de vie : seul un ADMIN peut activer une boutique', async () => {
    // Un simple vendeur est refusé
    await request(app.getHttpServer())
      .patch(`/api/v1/boutiques/${boutiqueId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'ACTIVE' })
      .expect(403);

    // L'admin plateforme active la boutique
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@plateforme.com', password: 'admin1234' })
      .expect(200);
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/boutiques/${boutiqueId}/status`)
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(res.body.status).toBe('ACTIVE');
  });

  it('cycle de vie : transition invalide ACTIVE → PENDING → 400', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@plateforme.com', password: 'admin1234' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/boutiques/${boutiqueId}/status`)
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send({ status: 'PENDING' })
      .expect(400);
  });
});
