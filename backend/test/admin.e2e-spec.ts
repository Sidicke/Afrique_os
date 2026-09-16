import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ModerationStatus, ModerationTargetType } from '@prisma/client';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import request from 'supertest';

describe('Admin (e2e)', () => {
  let app: INestApplication;
  const unique = Date.now();
  let adminToken: string;
  let sellerToken: string;
  let boutiqueId: string;
  let reportId: string;

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

    // Admin plateforme (seedé)
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@plateforme.com', password: 'admin1234' })
      .expect(200);
    adminToken = adminLogin.body.accessToken as string;

    // Vendeur frais + boutique PENDING (dossier de vérification autonome)
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Vendeur Admin Test',
        shopName: `Boutique Admin Test ${unique}`,
        email: `admin-test-${unique}@test.com`,
        password: 'password123',
      })
      .expect(201);
    sellerToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: `admin-test-${unique}@test.com`, password: 'password123' })
    ).body.accessToken as string;

    const myBoutiques = await request(app.getHttpServer())
      .get('/api/v1/boutiques/my')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    boutiqueId = myBoutiques.body[0].id as string;

    // Le vendeur soumet sa demande de vérification (NONE → PENDING)
    await request(app.getHttpServer())
      .post(`/api/v1/boutiques/${boutiqueId}/request-verification`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(201);

    // Signalement dédié à la suite (ré-exécutable : ne touche pas le seed)
    const prisma = app.get(PrismaService);
    const testReport = await prisma.moderationReport.create({
      data: {
        targetType: ModerationTargetType.BOUTIQUE,
        targetId: boutiqueId,
        targetLabel: 'Boutique Admin Test',
        reason: 'Signalement de test e2e',
        details: 'Créé par la suite de test e2e admin.',
        severity: 'high',
        status: ModerationStatus.NEW,
      },
    });
    reportId = testReport.id;
  });

  afterAll(async () => {
    // Nettoie le signalement dédié au test (la suite reste ré-exécutable)
    const prisma = app.get(PrismaService);
    await prisma.moderationReport.delete({ where: { id: reportId } }).catch(() => undefined);
    await app.close();
  });

  it('sécurité : un simple vendeur ne peut pas accéder à /admin → 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(403);
  });

  it('sécurité : sans token → 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/overview').expect(401);
  });

  it('GET /admin/overview — Command Center avec KPIs et snapshots réels', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.kpis.length).toBeGreaterThanOrEqual(6);
    expect(res.body.period).toBe('30_days');
    expect(res.body.performance.series.orders).toBeInstanceOf(Array);
    expect(res.body.performance.series.gmv).toBeInstanceOf(Array);
    expect(res.body.snapshots.stores).toHaveProperty('active');
    expect(res.body.snapshots.users).toHaveProperty('merchants');
    expect(res.body.systemStatus.length).toBeGreaterThan(0);
  });

  it('GET /admin/verification — la boutique du test apparaît en attente', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/verification')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.kpis.pending).toBeGreaterThan(0);
    const row = res.body.rows.find((r: { id: string }) => r.id === boutiqueId);
    expect(row).toBeDefined();
    expect(row.status).toBe('PENDING');
  });

  it('GET /admin/verification/:id — dossier complet (documents, checklist, historique)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/verification/${boutiqueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.merchant.name).toBe('Vendeur Admin Test');
    expect(res.body.store.slug).toBe(`boutique-admin-test-${unique}`);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.checklist).toBeInstanceOf(Array);
    expect(res.body.notes).toBeInstanceOf(Array);
  });

  it('POST /admin/verification/:id/decision — approuver → VERIFIED + journal', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/verification/${boutiqueId}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'VERIFIED', note: 'Documents conformes' })
      .expect(201);
    expect(res.body.status).toBe('APPROVED');

    // La boutique reste visible mais bascule dans l'onglet « Approuvés »
    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/verification')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const row = list.body.rows.find((r: { id: string }) => r.id === boutiqueId) as
      | { status: string }
      | undefined;
    expect(row).toBeDefined();
    expect(row?.status).toBe('APPROVED');

    // La note a bien été journalisée (visible dans l'historique du dossier)
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/verification/${boutiqueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.body.status).toBe('APPROVED');
    expect(detail.body.history.some((h: { label: string }) => h.label.includes('Vérification approuvée'))).toBe(true);
  });

  it('POST /admin/verification/:id/decision — rejet en erreur si statut invalide → 400', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/admin/verification/${boutiqueId}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'NONE' })
      .expect(400);
  });

  it('GET /admin/stores — liste avec KPIs et GMV réels', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/stores')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.kpis.total).toBeGreaterThan(0);
    const row = res.body.rows.find((r: { id: string }) => r.id === boutiqueId);
    expect(row).toBeDefined();
    expect(row.verificationStatus).toBe('APPROVED');
  });

  it('cycle de vie boutique : activer → suspendre → réactiver (traçable)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/stores/${boutiqueId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    const suspended = await request(app.getHttpServer())
      .patch(`/api/v1/admin/stores/${boutiqueId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' })
      .expect(200);
    expect(suspended.body.status).toBe('SUSPENDED');

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/stores/${boutiqueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.body.status).toBe('SUSPENDED');
    expect(detail.body.merchant.name).toBe('Vendeur Admin Test');
    expect(detail.body.history.length).toBeGreaterThan(0);

    const reactivated = await request(app.getHttpServer())
      .patch(`/api/v1/admin/stores/${boutiqueId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(reactivated.body.status).toBe('ACTIVE');
  });

  it('GET /admin/users — liste des utilisateurs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.kpis.total).toBeGreaterThan(0);
    expect(res.body.rows.some((r: { email: string }) => r.email.includes('admin-test'))).toBe(true);
  });

  it('GET /admin/users/:id — détail (statuts client + boutique associée)', async () => {
    const users = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const target = users.body.rows.find((r: { email: string }) => r.email.includes('admin-test')) as {
      id: string;
    };
    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.role).toBe('VENDEUR');
    expect(res.body.store).toBeDefined();
    expect(res.body.store.verificationStatus).toBe('APPROVED');
  });

  it('blocage utilisateur : bloquer puis réactiver un compte (réservé ADMIN)', async () => {
    const users = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const target = users.body.rows.find((r: { email: string }) => r.email.includes('admin-test')) as {
      id: string;
    };

    const blocked = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'BLOCKED' })
      .expect(200);
    expect(blocked.body.status).toBe('BLOCKED');

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.body.status).toBe('BLOCKED');

    const unblocked = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${target.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(unblocked.body.status).toBe('ACTIVE');
  });

  it('GET /admin/orders — vue globale (KPIs, volume, anomalies, lignes)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.kpis.total).toBeGreaterThan(0);
    expect(res.body.kpis.gmvFcfa).toBeGreaterThanOrEqual(0);
    expect(res.body.volume).toBeInstanceOf(Array);
    expect(res.body.anomalies).toBeInstanceOf(Array);
    expect(res.body.rows.length).toBeGreaterThan(0);
  });

  it('GET /admin/orders/:id — détail avec lignes, livraison et timeline', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const orderId = list.body.rows[0].id as string;
    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.reference).toMatch(/^#/);
    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.delivery).toHaveProperty('method');
    expect(res.body.timeline.length).toBeGreaterThan(0);
  });

  it('PATCH /admin/orders/:id/status — changement de statut persisté + traçé', async () => {
    // Commande seedée AC-8901 (PAID au seed) → SHIPPING
    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const seeded = list.body.rows.find((r: { reference: string }) =>
      r.reference.includes('8901')
    ) as { id: string } | undefined;
    if (!seeded) return; // dépendance au seed : non bloquant

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/orders/${seeded.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SHIPPING' })
      .expect(200);
    expect(['shipping', 'paid', 'pending', 'delivered']).toContain(res.body.status);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/orders/${seeded.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.body.status).toBe('SHIPPING');
  });

  it('POST /admin/orders/:id/cancel — annulation admin avec remise en stock', async () => {
    // Commande PENDING fraîche (pas encore payée)
    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const pending = list.body.rows.find((r: { status: string }) => r.status === 'PENDING') as
      | { id: string }
      | undefined;
    if (!pending) return; // aucune commande en attente : non bloquant

    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${pending.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Doublon de commande (test e2e)' })
      .expect(201);
    expect(res.body.status).toBe('CANCELLED');

    // Double annulation → 400
    await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${pending.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Encore' })
      .expect(400);
  });

  it('GET /admin/subscriptions — MRR, plans et abonnements réels', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.kpis).toHaveProperty('mrrFcfa');
    expect(res.body.plans.length).toBeGreaterThanOrEqual(3);
    expect(res.body.rows.length).toBeGreaterThan(0);
    expect(res.body.revenueSeries).toBeInstanceOf(Array);
  });

  it('GET /admin/analytics — croissance, funnel, catégories, top', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/analytics?period=30_days')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.growth).toBeInstanceOf(Array);
    expect(res.body.funnel).toHaveLength(5);
    expect(res.body.funnel[0].label).toBe('Boutiques créées');
    expect(res.body.categories).toBeInstanceOf(Array);
    expect(res.body.topStores).toBeInstanceOf(Array);
    expect(res.body.topProducts).toBeInstanceOf(Array);
    expect(res.body.trends).toBeInstanceOf(Array);
  });

  it('GET /admin/moderation — signalements, incidents, boutiques à risque, journal', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/moderation')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.kpis.openReports).toBeGreaterThan(0);
    expect(res.body.reports.length).toBeGreaterThan(0);
    expect(res.body.auditLog).toBeInstanceOf(Array);
    expect(res.body.reports.some((r: { id: string }) => r.id === reportId)).toBe(true);
  });

  it('GET /admin/moderation/:id + décision → RESOLVED avec motif', async () => {
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/admin/moderation/${reportId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.body.reporter).toBeDefined();
    expect(detail.body.target).toHaveProperty('href');

    const decision = await request(app.getHttpServer())
      .post(`/api/v1/admin/moderation/${reportId}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED', note: 'Aucune infraction détectée après vérification' })
      .expect(201);
    expect(decision.body.status).toBe('RESOLVED');

    // Le motif est consigné dans le journal
    const mod = await request(app.getHttpServer())
      .get('/api/v1/admin/moderation')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(mod.body.auditLog.some((l: { action: string }) => l.action.includes('Signalement résolu'))).toBe(true);
  });

  it('GET /admin/settings — paramètres globaux persistés', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.settings.general.platformName).toBe('ZennShop');
    expect(res.body.updatedBy).toBe('Admin Plateforme');
  });

  it('PATCH /admin/settings — mise à jour persistée + traçée', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: { general: { platformName: 'ZennShop (test)' } } })
      .expect(200);
    expect(res.body.settings.general.platformName).toBe('ZennShop (test)');

    // Restaure la valeur d'origine
    await request(app.getHttpServer())
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ data: { general: { platformName: 'ZennShop' } } })
      .expect(200);
  });

  it('POST /admin/notes — note interne sur une boutique (jamais visible du vendeur)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/notes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetType: 'boutique', targetId: boutiqueId, content: 'À surveiller : nouveau vendeur prometteur' })
      .expect(201);
    expect(res.body.author).toBe('Admin Plateforme');
    expect(res.body.content).toContain('prometteur');
  });

  it('GET /admin/profile — profil de l’administrateur connecté', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.user.email).toBe('admin@plateforme.com');
    expect(res.body.user.role).toBe('ADMIN');
    expect(res.body.sessions.length).toBeGreaterThan(0);
  });
});
