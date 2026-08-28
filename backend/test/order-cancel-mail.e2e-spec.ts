import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/mail/mail.service';
import request from 'supertest';

describe('Annulation + e-mail de confirmation (e2e)', () => {
  let app: INestApplication;
  let boutiqueId: string;

  /** Mock du service mail : on vérifie les appels, rien n'est réellement envoyé */
  const mailMock = {
    sendOrderCancellation: jest.fn().mockResolvedValue(undefined),
    sendSellerCancellationNotice: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mailMock)
      .compile();

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

    const boutique = await request(app.getHttpServer())
      .get('/api/v1/boutiques/public/aziz-tech')
      .expect(200);
    boutiqueId = boutique.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mailMock.sendOrderCancellation.mockClear();
    mailMock.sendSellerCancellationNotice.mockClear();
  });

  async function createAndCancelOrder(email?: string) {
    const list = await request(app.getHttpServer())
      .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
      .expect(200);
    const product = list.body.items[0];

    const created = await request(app.getHttpServer())
      .post(`/api/v1/orders/boutique/${boutiqueId}`)
      .send({
        customerName: 'Cliente Mail',
        customerPhone: '+2250700000033',
        customerEmail: email,
        paymentMethod: 'MOBILE_MONEY',
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    return request(app.getHttpServer())
      .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/cancel`)
      .send({ phone: '+2250700000033' });
  }

  it('envoie la confirmation quand le client a fourni un e-mail', async () => {
    const res = await createAndCancelOrder('awa@example.com');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');

    expect(mailMock.sendOrderCancellation).toHaveBeenCalledTimes(1);
    const data = mailMock.sendOrderCancellation.mock.calls[0][0];
    expect(data.customerEmail).toBe('awa@example.com');
    expect(data.orderNumber).toMatch(/^#AC-/);
    expect(data.boutiqueName).toBe('Aziz Tech');
    expect(data.boutiqueEmail).toBe('vendeur@aziztech.com'); // replyTo
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0]).toHaveProperty('quantity');
    expect(data.items[0]).toHaveProperty('unitPrice');
    expect(typeof data.total).toBe('number');
    expect(typeof data.deliveryPrice).toBe('number');
    expect(typeof data.formatPrice).toBe('function');
  });

  it("n'envoie rien quand aucun e-mail n'a été fourni", async () => {
    const res = await createAndCancelOrder(undefined);
    expect(res.status).toBe(200);
    expect(mailMock.sendOrderCancellation).not.toHaveBeenCalled();
  });

  it("une annulation ne bloque jamais sur l'envoi (fire-and-forget)", async () => {
    // L'envoi est différé : la réponse d'annulation ne dépend pas de lui.
    const res = await createAndCancelOrder('rapide@example.com');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('envoie une alerte au VENDEUR quand un client annule (boutique avec e-mail)', async () => {
    const res = await createAndCancelOrder('client-alerte@example.com');
    expect(res.status).toBe(200);

    expect(mailMock.sendSellerCancellationNotice).toHaveBeenCalledTimes(1);
    const data = mailMock.sendSellerCancellationNotice.mock.calls[0][0];
    expect(data.sellerEmail).toBe('vendeur@aziztech.com'); // e-mail de la boutique
    expect(data.orderNumber).toMatch(/^#AC-/);
    expect(data.boutiqueName).toBe('Aziz Tech');
    expect(data.customerName).toBe('Cliente Mail');
    expect(data.customerPhone).toBe('+2250700000033');
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
    expect(typeof data.formatPrice).toBe('function');
  });

  it("n'envoie PAS d'alerte vendeur quand la boutique n'a pas d'e-mail", async () => {
    // Crée un vendeur dont la boutique n'a pas d'e-mail (champ vidé)
    const email = `sansmail-${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Sans Mail', shopName: `Boutique Sans Mail ${Date.now()}`, email, password: 'password123' })
      .expect(201);
    const token = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'password123' })
    ).body.accessToken as string;

    const boutiques = await request(app.getHttpServer())
      .get('/api/v1/boutiques/my')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const otherBoutiqueId = boutiques.body[0].id;

    // Vide l'e-mail de la boutique (nullable en base)
    await request(app.getHttpServer())
      .patch(`/api/v1/boutiques/${otherBoutiqueId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: null })
      .expect(200);

    // Commande + annulation sur CETTE boutique (produit créé pour elle)
    const product = await request(app.getHttpServer())
      .post(`/api/v1/products/boutique/${otherBoutiqueId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Produit Sans Mail ${Date.now()}`, price: 2000, stock: 5 })
      .expect(201);
    const created = await request(app.getHttpServer())
      .post(`/api/v1/orders/boutique/${otherBoutiqueId}`)
      .send({
        customerName: 'Cliente Sans Mail',
        customerPhone: '+2250700000055',
        paymentMethod: 'MOBILE_MONEY',
        items: [{ productId: product.body.id, quantity: 1 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/boutique/${otherBoutiqueId}/${created.body.id}/cancel`)
      .send({ phone: '+2250700000055' })
      .expect(200);

    expect(mailMock.sendSellerCancellationNotice).not.toHaveBeenCalled();
  });

  it('l’alerte vendeur reprend le motif d’annulation saisi par le client', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
      .expect(200);
    const product = list.body.items[0];

    const created = await request(app.getHttpServer())
      .post(`/api/v1/orders/boutique/${boutiqueId}`)
      .send({
        customerName: 'Cliente Motif',
        customerPhone: '+2250700000044',
        customerEmail: 'motif@example.com',
        paymentMethod: 'MOBILE_MONEY',
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/cancel`)
      .send({ phone: '+2250700000044', reason: 'Commande passée par erreur' })
      .expect(200);

    expect(mailMock.sendSellerCancellationNotice).toHaveBeenCalledTimes(1);
    const data = mailMock.sendSellerCancellationNotice.mock.calls[0][0];
    expect(data.cancellationReason).toBe('Commande passée par erreur');
    expect(data.sellerEmail).toBe('vendeur@aziztech.com');
  });
});
