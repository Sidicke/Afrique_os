import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/mail/mail.service';
import request from 'supertest';

describe('Confirmation de commande + e-mail au client (e2e)', () => {
  let app: INestApplication;
  let boutiqueId: string;
  let sellerToken: string;

  /** Mock du service mail : on vérifie les appels, rien n'est réellement envoyé */
  const mailMock = {
    sendOrderCancellation: jest.fn().mockResolvedValue(undefined),
    sendSellerCancellationNotice: jest.fn().mockResolvedValue(undefined),
    sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
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

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'vendeur@aziztech.com', password: 'vendeur1234' })
      .expect(200);
    sellerToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mailMock.sendOrderConfirmation.mockClear();
    mailMock.sendOrderCancellation.mockClear();
    mailMock.sendSellerCancellationNotice.mockClear();
  });

  /** Crée une commande (avec e-mail client optionnel) puis la confirme en tant que vendeur */
  async function createAndConfirmOrder(email?: string) {
    const list = await request(app.getHttpServer())
      .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
      .expect(200);
    const product = list.body.items[0];

    const created = await request(app.getHttpServer())
      .post(`/api/v1/orders/boutique/${boutiqueId}`)
      .send({
        customerName: 'Cliente Confirmation',
        customerPhone: '+2250700000077',
        customerEmail: email,
        paymentMethod: 'MOBILE_MONEY',
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    return request(app.getHttpServer())
      .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'PAID' });
  }

  it('envoie la confirmation au client quand le vendeur confirme la commande', async () => {
    const res = await createAndConfirmOrder('confirmation@example.com');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paid');

    expect(mailMock.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    const data = mailMock.sendOrderConfirmation.mock.calls[0][0];
    expect(data.customerEmail).toBe('confirmation@example.com');
    expect(data.orderNumber).toMatch(/^#AC-/);
    expect(data.boutiqueName).toBe('Aziz Tech');
    expect(data.boutiqueEmail).toBe('vendeur@aziztech.com'); // replyTo
    expect(data.customerName).toBe('Cliente Confirmation');
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0]).toHaveProperty('quantity');
    expect(data.items[0]).toHaveProperty('unitPrice');
    expect(typeof data.total).toBe('number');
    expect(typeof data.deliveryPrice).toBe('number');
    expect(typeof data.formatPrice).toBe('function');
  });

  it("n'envoie rien quand aucun e-mail n'a été fourni à la commande", async () => {
    const res = await createAndConfirmOrder(undefined);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paid');
    expect(mailMock.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('n’envoie pas de doublon si le statut est re-affecté à PAID', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
      .expect(200);
    const product = list.body.items[0];

    const created = await request(app.getHttpServer())
      .post(`/api/v1/orders/boutique/${boutiqueId}`)
      .send({
        customerName: 'Cliente Doublon',
        customerPhone: '+2250700000088',
        customerEmail: 'doublon@example.com',
        paymentMethod: 'MOBILE_MONEY',
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    const confirm = () =>
      request(app.getHttpServer())
        .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'PAID' });

    await confirm().expect(200);
    await confirm().expect(200);

    // Un seul e-mail : la transition ne s'est produite qu'une fois.
    expect(mailMock.sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it('n’envoie rien quand le statut change sans passer par le paiement validé', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
      .expect(200);
    const product = list.body.items[0];

    const created = await request(app.getHttpServer())
      .post(`/api/v1/orders/boutique/${boutiqueId}`)
      .send({
        customerName: 'Cliente Expédiée',
        customerPhone: '+2250700000099',
        customerEmail: 'expediee@example.com',
        paymentMethod: 'MOBILE_MONEY',
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'SHIPPING' })
      .expect(200);

    expect(mailMock.sendOrderConfirmation).not.toHaveBeenCalled();
  });
});
