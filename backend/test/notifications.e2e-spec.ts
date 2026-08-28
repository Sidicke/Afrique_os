import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import request from 'supertest';

describe('Notifications vendeur (e2e)', () => {
  let app: INestApplication;
  let sellerToken: string;
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

    sellerToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'vendeur@aziztech.com', password: 'vendeur1234' })
    ).body.accessToken as string;

    const boutique = await request(app.getHttpServer())
      .get('/api/v1/boutiques/public/aziz-tech')
      .expect(200);
    boutiqueId = boutique.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('crée une notification vendeur quand un client annule une commande (avec motif)', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
      .expect(200);
    const product = list.body.items[0];

    const created = await request(app.getHttpServer())
      .post(`/api/v1/orders/boutique/${boutiqueId}`)
      .send({
        customerName: 'Cliente Notif',
        customerPhone: '+2250700000010',
        paymentMethod: 'MOBILE_MONEY',
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/cancel`)
      .send({ phone: '+2250700000010', reason: 'Changement de projet' })
      .expect(200);

    // Attendre la création async de la notification (fire-and-forget)
    await new Promise((r) => setTimeout(r, 600));

    // Le vendeur voit la notification dans sa liste
    const notifs = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const match = notifs.body.find(
      (n: { type: string; orderReference: string }) =>
        n.type === 'order_cancelled' &&
        n.orderReference === created.body.orderNumber,
    );
    expect(match).toBeDefined();
    expect(match.title).toContain('annulée');
    expect(match.message).toContain('Changement de projet');
    expect(match.readAt).toBeNull();
  });

  it('unread-count reflète les non-lues et markAsRead les marque lues', async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}/unread-count`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(before.body.count).toBeGreaterThan(0);

    // Marque la première non-lue comme lue
    const notifs = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const unread = notifs.body.find((n: { readAt: string | null }) => n.readAt === null);
    expect(unread).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/v1/notifications/boutique/${boutiqueId}/${unread.id}/read`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(201)
      .expect((res) => expect(res.body.success).toBe(true));

    const after = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}/unread-count`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(after.body.count).toBe(before.body.count - 1);
  });

  it('markAllAsRead remet le compteur à zéro', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/notifications/boutique/${boutiqueId}/read-all`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(201);

    const after = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}/unread-count`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(after.body.count).toBe(0);
  });

  it("un autre vendeur ne peut pas voir les notifications → 403 (isolation)", async () => {
    const otherEmail = `autre-notif-${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Autre',
        shopName: `Boutique Autre ${Date.now()}`,
        email: otherEmail,
        password: 'password123',
      })
      .expect(201);
    const otherToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: otherEmail, password: 'password123' })
    ).body.accessToken as string;

    await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('crée une notification « nouvelle commande » quand un client commande', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
      .expect(200);
    const product = list.body.items[0];

    const created = await request(app.getHttpServer())
      .post(`/api/v1/orders/boutique/${boutiqueId}`)
      .send({
        customerName: 'Cliente Nouvelle Commande',
        customerPhone: '+2250700000020',
        paymentMethod: 'MOBILE_MONEY',
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    // Attendre la création async de la notification
    await new Promise((r) => setTimeout(r, 600));
    const notifs = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const match = notifs.body.find(
      (n: { type: string; orderReference: string }) =>
        n.type === 'new_order' &&
        n.orderReference === created.body.orderNumber,
    );
    expect(match).toBeDefined();
    expect(match.title).toContain('Nouvelle commande');
    expect(match.message).toContain('Cliente Nouvelle Commande');
    expect(match.readAt).toBeNull();
  });

  it('crée une notification « nouveau message » quand un CLIENT écrit au vendeur', async () => {
    // Un compte client
    const clientEmail = `client-msg-${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Client Messagerie',
        role: 'CLIENT',
        email: clientEmail,
        password: 'password123',
      })
      .expect(201);
    const clientToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: clientEmail, password: 'password123' })
    ).body.accessToken as string;

    // Le client ouvre une conversation avec un premier message
    await request(app.getHttpServer())
      .post(`/api/v1/conversations/start/${boutiqueId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        clientName: 'Client Messagerie',
        clientPhone: '+2250700000030',
        firstMessage: 'Bonjour, ce produit est-il disponible ?',
      })
      .expect(201);

    await new Promise((r) => setTimeout(r, 600));
    const notifs = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const match = notifs.body.find(
      (n: { type: string; message: string }) =>
        n.type === 'new_message' && n.message.includes('produit est-il disponible'),
    );
    expect(match).toBeDefined();
    expect(match.title).toContain('Client Messagerie');
  });

  it('ne notifie PAS le vendeur quand il écrit lui-même (pas d’auto-notification)', async () => {
    // Compter les notifications « new_message » avant
    const before = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const msgBefore = before.body.filter(
      (n: { type: string }) => n.type === 'new_message',
    ).length;

    // Une conversation existe déjà (créée par le test précédent) → le vendeur écrit
    const convs = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const conv = convs.body.find(
      (c: { clientName: string }) => c.clientName === 'Client Messagerie',
    );
    expect(conv).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conv.id}/messages`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ content: 'Oui, il est disponible !' })
      .expect(201);

    await new Promise((r) => setTimeout(r, 600));
    const after = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const msgAfter = after.body.filter(
      (n: { type: string }) => n.type === 'new_message',
    ).length;
    expect(msgAfter).toBe(msgBefore);
  });

  it("n'envoie pas de notification quand le type est désactivé dans les préférences", async () => {
    // Désactive « nouvelle commande » sur la boutique (via PATCH /boutiques)
    const shop = await request(app.getHttpServer())
      .get(`/api/v1/boutiques/my`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const myBoutique = shop.body.find((b: { id: string }) => b.id === boutiqueId);
    expect(myBoutique).toBeDefined();
    const originalPrefs = myBoutique.notifications ?? [];

    try {
      const prefs = originalPrefs.map((n: { id: string; enabled?: boolean }) => ({
        ...n,
        enabled: n.id === 'new_order' ? false : (n.enabled ?? true),
      }));
      await request(app.getHttpServer())
        .patch(`/api/v1/boutiques/${boutiqueId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ notifications: prefs })
        .expect(200);

      // Une commande est créée → new_order est désactivé → AUCUNE notification
      const list = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
        .expect(200);
      const product = list.body.items[0];
      const created = await request(app.getHttpServer())
        .post(`/api/v1/orders/boutique/${boutiqueId}`)
        .send({
          customerName: 'Cliente Prefs',
          customerPhone: '+2250700000060',
          paymentMethod: 'MOBILE_MONEY',
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(201);

      await new Promise((r) => setTimeout(r, 600));
      const notifs = await request(app.getHttpServer())
        .get(`/api/v1/notifications/boutique/${boutiqueId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);
      const match = notifs.body.find(
        (n: { type: string; orderReference: string }) =>
          n.type === 'new_order' && n.orderReference === created.body.orderNumber,
      );
      expect(match).toBeUndefined();
    } finally {
      // Restaure TOUJOURS les préférences d'origine, même si une assertion
      // échoue (ré-exécutabilité sur la base de dev partagée).
      await request(app.getHttpServer())
        .patch(`/api/v1/boutiques/${boutiqueId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ notifications: originalPrefs })
        .expect(200);
    }
  });

  it("une préférence ABSENTE est traitée comme activée (rétrocompatibilité)", async () => {
    // La boutique seed a les 4 types : on retire « new_message » de la liste
    const shop = await request(app.getHttpServer())
      .get(`/api/v1/boutiques/my`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const myBoutique = shop.body.find((b: { id: string }) => b.id === boutiqueId);
    const withoutMessage = (myBoutique.notifications ?? [])
      .filter((n: { id: string }) => n.id !== 'new_message')
      .map((n: { id: string; enabled?: boolean }) => ({ ...n, enabled: n.enabled ?? true }));
    await request(app.getHttpServer())
      .patch(`/api/v1/boutiques/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ notifications: withoutMessage })
      .expect(200);

    // Un client écrit → new_message n'est PAS listé → notification créée
    const clientEmail = `client-prefs-${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Client Prefs', role: 'CLIENT', email: clientEmail, password: 'password123' })
      .expect(201);
    const clientToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: clientEmail, password: 'password123' })
    ).body.accessToken as string;

    await request(app.getHttpServer())
      .post(`/api/v1/conversations/start/${boutiqueId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        clientName: 'Client Prefs',
        clientPhone: '+2250700000070',
        firstMessage: 'Bonjour préférences',
      })
      .expect(201);

    await new Promise((r) => setTimeout(r, 600));
    const notifs = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const match = notifs.body.find(
      (n: { type: string; message: string }) =>
        n.type === 'new_message' && n.message.includes('Bonjour préférences'),
    );
    expect(match).toBeDefined();

    // Restaure la liste complète
    await request(app.getHttpServer())
      .patch(`/api/v1/boutiques/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ notifications: (myBoutique.notifications ?? []).map((n: { id: string; enabled?: boolean }) => ({ ...n, enabled: n.enabled ?? true })) })
      .expect(200);
  });

  it('crée une notification « rupture de stock » quand un produit tombe à 0', async () => {
    // Produit dédié avec stock 1 → une seule commande l'épuise
    const product = await request(app.getHttpServer())
      .post(`/api/v1/products/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: `Produit Rupture ${Date.now()}`,
        price: 1000,
        stock: 1,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/orders/boutique/${boutiqueId}`)
      .send({
        customerName: 'Cliente Rupture',
        customerPhone: '+2250700000040',
        paymentMethod: 'MOBILE_MONEY',
        items: [{ productId: product.body.id, quantity: 1 }],
      })
      .expect(201);

    await new Promise((r) => setTimeout(r, 600));
    const notifs = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const match = notifs.body.find(
      (n: { type: string; message: string }) =>
        n.type === 'low_stock' &&
        n.message.includes('Produit Rupture'),
    );
    expect(match).toBeDefined();
    expect(match.title).toContain('Rupture de stock');
  });

  it('purge automatiquement les notifications de plus de 30 jours (lors de l’accès)', async () => {
    const prisma = app.get(PrismaService);
    const now = Date.now();
    const DAY = 86_400_000;

    // Notification EXPIRÉE (31 jours) — insérée directement en base (elle ne
    // passe pas par le service, donc pas de purge au create) + une récente.
    const expired = await prisma.notification.create({
      data: {
        boutiqueId,
        type: 'low_stock',
        title: 'Ancienne notification expirée',
        createdAt: new Date(now - 31 * DAY),
      },
    });
    const recent = await prisma.notification.create({
      data: {
        boutiqueId,
        type: 'low_stock',
        title: 'Notification récente conservée',
      },
    });

    // Une simple LECTURE (findAll) purge les expirées
    const notifs = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(
      notifs.body.some((n: { id: string }) => n.id === expired.id),
    ).toBe(false);
    expect(
      notifs.body.some((n: { id: string }) => n.id === recent.id),
    ).toBe(true);

    // Nettoyage de la notification de test
    await prisma.notification.delete({ where: { id: recent.id } });
  });

  it('« tout supprimer » vide le panneau et remet le compteur à zéro', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deleted).toBeGreaterThan(0);

    const after = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(after.body.length).toBe(0);

    const unread = await request(app.getHttpServer())
      .get(`/api/v1/notifications/boutique/${boutiqueId}/unread-count`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(unread.body.count).toBe(0);
  });

  it('un autre vendeur ne peut PAS tout supprimer → 403 (isolation)', async () => {
    const otherEmail = `autre-delete-${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Autre Delete',
        shopName: `Boutique Autre Delete ${Date.now()}`,
        email: otherEmail,
        password: 'password123',
      })
      .expect(201);
    const otherToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: otherEmail, password: 'password123' })
    ).body.accessToken as string;

    await request(app.getHttpServer())
      .delete(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('« tout supprimer » sur un panneau vide est sans effet (deleted 0)', async () => {
    // Le test précédent a vidé la boutique aziz-tech → la liste est vide
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/notifications/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deleted).toBe(0);
  });
});
