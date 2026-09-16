import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BoutiqueStatus } from '@prisma/client';
import request from 'supertest';

describe('🛡️ Audit de Sécurité & Résilience E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const unique = Date.now();

  let adminToken: string;
  let sellerAToken: string;
  let sellerBToken: string;
  let clientToken: string;

  let boutiqueAId: string;
  let testProductId: string;

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

    // 1. Admin login
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@plateforme.com', password: 'admin1234' });
    adminToken = adminLogin.body.accessToken;

    // 2. Création et Login Vendeur A
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Vendeur A',
        shopName: `Boutique Alpha ${unique}`,
        email: `seller-a-${unique}@test.com`,
        password: 'password123',
      });
    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `seller-a-${unique}@test.com`, password: 'password123' });
    sellerAToken = loginA.body.accessToken;

    // 3. Création et Login Vendeur B
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Vendeur B',
        shopName: `Boutique Beta ${unique}`,
        email: `seller-b-${unique}@test.com`,
        password: 'password123',
      });
    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `seller-b-${unique}@test.com`, password: 'password123' });
    sellerBToken = loginB.body.accessToken;

    // 4. Création et Login Client standard
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Client Test',
        email: `client-${unique}@test.com`,
        password: 'password123',
        role: 'CLIENT',
      });
    const loginClient = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `client-${unique}@test.com`, password: 'password123' });
    clientToken = loginClient.body.accessToken;

    // Récupérer les identifiants de boutique
    const myBoutiquesA = await request(app.getHttpServer())
      .get('/api/v1/boutiques/my')
      .set('Authorization', `Bearer ${sellerAToken}`);
    boutiqueAId = myBoutiquesA.body[0].id;

    // Activer boutique A via Admin
    await request(app.getHttpServer())
      .patch(`/api/v1/boutiques/${boutiqueAId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    // Créer une catégorie et un produit avec stock = 1 pour les tests de concurrence
    const cat = await prisma.category.findFirst({ where: { boutiqueId: boutiqueAId } });
    const catId = cat?.id ?? (await prisma.category.create({
      data: {
        name: `Cat ${unique}`,
        slug: `cat-${unique}`,
        boutiqueId: boutiqueAId,
      },
    })).id;

    const prodRes = await request(app.getHttpServer())
      .post(`/api/v1/products/boutique/${boutiqueAId}`)
      .set('Authorization', `Bearer ${sellerAToken}`)
      .send({
        name: 'Article Unique Concouru',
        description: 'Article pour test de survente',
        price: 1000,
        stock: 1,
        categoryId: catId,
      });
    testProductId = prodRes.body.id;
  });

  afterAll(async () => {
    if (testProductId) {
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }
    await app.close();
  });

  describe('1. 🔒 Contrôle d\'Accès & Isolation Multi-Tenants (BOLA / IDOR)', () => {
    it('Rejette la modification de la Boutique A par le Vendeur B → 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/boutiques/${boutiqueAId}`)
        .set('Authorization', `Bearer ${sellerBToken}`)
        .send({ tagline: 'Tentative usurpation de nom' });

      expect(res.status).toBe(403);
    });

    it('Rejette la lecture des paramètres de la Boutique A par le Vendeur B → 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/boutiques/${boutiqueAId}`)
        .set('Authorization', `Bearer ${sellerBToken}`);

      expect(res.status).toBe(403);
    });

    it('Rejette la création de produit sur la Boutique A par le Vendeur B → 403 Forbidden', async () => {
      const cat = await prisma.category.findFirst({ where: { boutiqueId: boutiqueAId } });
      const res = await request(app.getHttpServer())
        .post(`/api/v1/products/boutique/${boutiqueAId}`)
        .set('Authorization', `Bearer ${sellerBToken}`)
        .send({
          name: 'Produit Forgé',
          description: 'Tentative',
          price: 500,
          stock: 10,
          categoryId: cat?.id,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('2. 🛡️ Élévation de Privilèges & Protection RBAC', () => {
    it('Rejette l\'accès aux routes Super-Admin par un simple Client → 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(403);
    });

    it('Rejette l\'accès aux routes Super-Admin par un Vendeur → 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${sellerAToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('3. ⚡ Attaque par Concurrence / Race Condition (Double-Spend du Solde)', () => {
    it('Empêche le double retrait du solde lors de 10 requêtes simultanées (Atomic Lock)', async () => {
      // 1. On injecte un solde initial de 5 000 FCFA sur la boutique A
      await prisma.boutique.update({
        where: { id: boutiqueAId },
        data: { balance: 5000, status: BoutiqueStatus.ACTIVE },
      });

      // 2. On lance 10 demandes SIMULTANÉES de retrait de 5 000 FCFA chacune
      const withdrawalPayload = {
        amount: 5000,
        paymentInfo: 'Mobile Money Orange +2250102030405',
      };

      const requests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer())
          .post(`/api/v1/boutiques/${boutiqueAId}/withdraw`)
          .set('Authorization', `Bearer ${sellerAToken}`)
          .send(withdrawalPayload)
      );

      const responses = await Promise.all(requests);

      // Compter les succès (201 Created) et les rejets (400 Bad Request)
      const successCount = responses.filter((r) => r.status === 201).length;
      const failureCount = responses.filter((r) => r.status === 400).length;

      // Vérification essentielle : EXACTEMENT 1 seule requête a pu passer
      expect(successCount).toBe(1);
      expect(failureCount).toBe(9);

      // Vérification du solde final : le solde doit être exactement 0 FCFA (JAMAIS négatif)
      const finalBoutique = await prisma.boutique.findUnique({
        where: { id: boutiqueAId },
      });
      expect(Number(finalBoutique?.balance)).toBe(0);
    });
  });

  describe('4. 📦 Protection Anti-Survente / Race Condition sur le Stock', () => {
    it('Empêche l\'overselling quand 5 commandes concurrentes visent 1 unité restante', async () => {
      // Produit testProductId a un stock initial de 1
      await prisma.product.update({
        where: { id: testProductId },
        data: { stock: 1, isActive: true },
      });

      const orderPayload = {
        customerName: 'Client Concurrence',
        customerPhone: '+22507000000',
        address: 'Abidjan Cocody',
        city: 'Abidjan',
        country: 'Côte d\'Ivoire',
        paymentMethod: 'CASH_ON_DELIVERY',
        items: [{ productId: testProductId, quantity: 1 }],
      };

      // 5 requêtes de commande simultanées
      const orderRequests = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post(`/api/v1/orders/boutique/${boutiqueAId}`)
          .send(orderPayload)
      );

      const orderResponses = await Promise.all(orderRequests);

      const passedOrders = orderResponses.filter((r) => r.status === 201).length;
      const failedOrders = orderResponses.filter((r) => r.status === 400).length;

      expect(passedOrders).toBe(1);
      expect(failedOrders).toBe(4);

      // Stock final doit être 0
      const finalProd = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      expect(finalProd?.stock).toBe(0);
    });
  });

  describe('5. 🛡️ Protection Mass-Assignment & Rejet Strict (ValidationPipe)', () => {
    it('Rejette immédiatement les champs injectés non déclarés dans le DTO → 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Injecteur',
          email: `inject-${unique}@test.com`,
          password: 'password123',
          unauthorizedField: 'HACKED_PROPERTY',
          isAdmin: true,
          balance: 999999,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('property unauthorizedField should not exist'),
        ]),
      );
    });
  });

  describe('6. 🔐 Webhook FedaPay : Rejet de Signature Falsifiée', () => {
    it('Rejette un webhook avec signature invalide → 400 Bad Request', async () => {
      const fakePayload = {
        event: 'transaction.approved',
        entity: { id: 9999, reference: 'AC-FAKE', amount: 5000 },
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/fedapay/webhook')
        .set('x-fedapay-signature', 'invalidsignature1234567890abcdef')
        .send(fakePayload);

      expect(res.status).toBe(400);
    });
  });
});
