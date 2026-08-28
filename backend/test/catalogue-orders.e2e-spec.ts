import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import request from 'supertest';

describe('Catalogue & Commandes (e2e)', () => {
  let app: INestApplication;
  let sellerToken: string;
  let boutiqueId: string;
  let productId: string;

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

  describe('Catalogue public', () => {
    it('liste les produits actifs avec pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?limit=2')
        .expect(200);
      expect(res.body.items.length).toBe(2);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
      expect(res.body.items[0]).toHaveProperty('price');
    });

    it('filtre par recherche', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=smartphone')
        .expect(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].name).toContain('Smartphone');
    });

    it('filtre par prix minimum', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?minPrice=100000')
        .expect(200);
      for (const item of res.body.items) {
        expect(Number(item.price)).toBeGreaterThanOrEqual(100000);
      }
    });

    it('tri prix ascendant', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?sort=price_asc')
        .expect(200);
      const prices = res.body.items.map((i: { price: string }) => Number(i.price));
      const sorted = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sorted);
    });

    it('détail produit avec variantes et avis', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=smartphone')
        .expect(200);
      productId = list.body.items[0].id;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/public/boutique/aziz-tech/${productId}`)
        .expect(200);
      expect(res.body.variants.length).toBeGreaterThan(0);
      expect(res.body.reviews.length).toBeGreaterThan(0);
    });

    it('lien WhatsApp si le numéro est configuré', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=smartphone')
        .expect(200);
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/products/public/whatsapp-link?boutiqueSlug=aziz-tech&productId=${list.body.items[0].id}`,
        )
        .expect(200);
      expect(res.body.url).toContain('wa.me/2250700000000');
    });

    it('produit inexistant → 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech/inconnu')
        .expect(404);
    });
  });

  describe('Recherche globale (parité avec le catalogue public)', () => {
    it('renvoie des produits au MÊME format que le catalogue public', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/search?q=smartphone')
        .expect(200);
      expect(res.body.produits.length).toBeGreaterThan(0);

      const hit = res.body.produits[0];
      // images en ARRAY (et non plus un champ `image` isolé) — c'est ce que
      // ProductCard / publicProductImage consomment côté frontend
      expect(Array.isArray(hit.images)).toBe(true);
      expect(hit.images.length).toBeGreaterThan(0);
      // Marque + boutique avec statut de vérification (badge de confiance)
      expect(hit.brand).toHaveProperty('name');
      expect(hit.boutique).toHaveProperty('verificationStatus');
      // Enrichissements calculés comme sur l'accueil
      expect(hit).toHaveProperty('rating');
      expect(hit).toHaveProperty('salesCount');
      expect(Array.isArray(hit.variants)).toBe(true);
    });

    it('trouve un produit par sa marque (ex. samsung)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/search?q=samsung')
        .expect(200);
      const names = res.body.produits.map((p: { name: string }) => p.name);
      expect(names).toContain('Smartphone Pro');
    });

    it('les boutiques des résultats portent leur statut de vérification', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/search?q=aziz')
        .expect(200);
      expect(res.body.boutiques.length).toBeGreaterThan(0);
      for (const b of res.body.boutiques) {
        expect(b).toHaveProperty('verificationStatus');
        expect(b).toHaveProperty('productsCount');
      }
    });
  });

  describe('Commandes', () => {
    it('crée une commande publique avec total recalculé côté serveur', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=smartphone')
        .expect(200);
      const product = list.body.items[0];
      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/boutique/${boutiqueId}`)
        .send({
          customerName: 'Client Test',
          customerPhone: '+2250700000099',
          city: 'Abidjan',
          country: 'CI',
          paymentMethod: 'MOBILE_MONEY',
          deliveryName: 'Standard',
          deliveryPrice: 2000,
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(201);
      // Prix serveur : 350000 + 2000 de livraison — le client ne peut pas forcer le prix
      expect(res.body.totalPriceFcfa).toBe(352000);
      expect(res.body.status).toBe('pending');
      expect(res.body.paymentMethod).toBe('mobile_money');
    });

    it('refuse un panier vide → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/orders/boutique/${boutiqueId}`)
        .send({
          customerName: 'Client',
          customerPhone: '+2250700000098',
          paymentMethod: 'CASH_ON_DELIVERY',
          items: [],
        })
        .expect(400);
    });

    it('décrémente le stock à la commande', async () => {
      const before = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
        .expect(200);
      const product = before.body.items[0];
      const stockBefore = Number(product.stock);

      await request(app.getHttpServer())
        .post(`/api/v1/orders/boutique/${boutiqueId}`)
        .send({
          customerName: 'Client Stock',
          customerPhone: '+2250700000097',
          paymentMethod: 'WHATSAPP_DIRECT',
          items: [{ productId: product.id, quantity: 2 }],
        })
        .expect(201);

      const after = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
        .expect(200);
      expect(Number(after.body.items[0].stock)).toBe(stockBefore - 2);
    });

    it('retrouve une commande par numéro de commande (suivi client)', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
        .expect(200);
      const product = list.body.items[0];
      const created = await request(app.getHttpServer())
        .post(`/api/v1/orders/boutique/${boutiqueId}`)
        .send({
          customerName: 'Cliente Suivi',
          customerPhone: '+2250700000066',
          paymentMethod: 'WHATSAPP_DIRECT',
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(201);
      const ref = (created.body.orderNumber as string).replace('#', '');

      // Recherche par référence seule
      const found = await request(app.getHttpServer())
        .get(`/api/v1/orders/boutique/${boutiqueId}/reference/${ref}`)
        .expect(200);
      expect(found.body.id).toBe(created.body.id);
      expect(found.body.orderNumber).toBe(created.body.orderNumber);

      // Tolérant au '#' initial et à la casse
      const foundLoose = await request(app.getHttpServer())
        .get(`/api/v1/orders/boutique/${boutiqueId}/reference/%23${ref.toLowerCase()}`)
        .expect(200);
      expect(foundLoose.body.id).toBe(created.body.id);

      // Téléphone correct → trouvée ; téléphone erroné → 404 (aucune fuite)
      await request(app.getHttpServer())
        .get(
          `/api/v1/orders/boutique/${boutiqueId}/reference/${ref}?phone=${encodeURIComponent('+2250700000066')}`,
        )
        .expect(200);
      await request(app.getHttpServer())
        .get(
          `/api/v1/orders/boutique/${boutiqueId}/reference/${ref}?phone=${encodeURIComponent('+2250999999999')}`,
        )
        .expect(404);

      // Référence inconnue → 404
      await request(app.getHttpServer())
        .get(`/api/v1/orders/boutique/${boutiqueId}/reference/AC-INCONNU`)
        .expect(404);
    });

    it('le client annule sa commande (statut + remise en stock)', async () => {
      return (async () => {
        const list = await request(app.getHttpServer())
          .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
          .expect(200);
        const product = list.body.items[0];
        const stockBefore = Number(product.stock);

        const created = await request(app.getHttpServer())
          .post(`/api/v1/orders/boutique/${boutiqueId}`)
          .send({
            customerName: 'Cliente Annulation',
            customerPhone: '+2250700000088',
            paymentMethod: 'MOBILE_MONEY',
            items: [{ productId: product.id, quantity: 2 }],
          })
          .expect(201);

        const cancelled = await request(app.getHttpServer())
          .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/cancel`)
          .send({ phone: '+2250700000088' })
          .expect(200);
        expect(cancelled.body.status).toBe('cancelled');

        // Le stock est remonté (miroir de la décrémentation à la création)
        const after = await request(app.getHttpServer())
          .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
          .expect(200);
        expect(Number(after.body.items[0].stock)).toBe(stockBefore);
      })();
    });

    it('stocke et expose le motif d’annulation saisi par le client', async () => {
      return (async () => {
        const list = await request(app.getHttpServer())
          .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
          .expect(200);
        const product = list.body.items[0];

        const created = await request(app.getHttpServer())
          .post(`/api/v1/orders/boutique/${boutiqueId}`)
          .send({
            customerName: 'Cliente Motif',
            customerPhone: '+2250700000022',
            paymentMethod: 'MOBILE_MONEY',
            items: [{ productId: product.id, quantity: 1 }],
          })
          .expect(201);

        // Annulation AVEC motif
        const cancelled = await request(app.getHttpServer())
          .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/cancel`)
          .send({ phone: '+2250700000022', reason: 'Changement de projet' })
          .expect(200);
        expect(cancelled.body.status).toBe('cancelled');
        expect(cancelled.body.cancellationReason).toBe('Changement de projet');

        // Le vendeur voit le motif dans sa liste
        const sellerOrders = await request(app.getHttpServer())
          .get(`/api/v1/orders/boutique/${boutiqueId}`)
          .set('Authorization', `Bearer ${sellerToken}`)
          .expect(200);
        const sellerView = sellerOrders.body.find(
          (o: { id: string }) => o.id === created.body.id,
        );
        expect(sellerView.cancellationReason).toBe('Changement de projet');

        // Le client le voit aussi dans son historique
        const customerOrders = await request(app.getHttpServer())
          .get(`/api/v1/orders/boutique/${boutiqueId}/customer/+2250700000022`)
          .expect(200);
        const customerView = customerOrders.body.find(
          (o: { id: string }) => o.id === created.body.id,
        );
        expect(customerView.cancellationReason).toBe('Changement de projet');
      })();
    });

    it('annulation SANS motif → cancellationReason absent', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
        .expect(200);
      const product = list.body.items[0];
      const created = await request(app.getHttpServer())
        .post(`/api/v1/orders/boutique/${boutiqueId}`)
        .send({
          customerName: 'Cliente Sans Motif',
          customerPhone: '+2250700000011',
          paymentMethod: 'CASH_ON_DELIVERY',
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(201);
      const cancelled = await request(app.getHttpServer())
        .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/cancel`)
        .send({ phone: '+2250700000011' })
        .expect(200);
      expect(cancelled.body.cancellationReason).toBeUndefined();
    });

    it('annulation tolérante au format du téléphone (espaces ignorés)', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
        .expect(200);
      const product = list.body.items[0];
      const created = await request(app.getHttpServer())
        .post(`/api/v1/orders/boutique/${boutiqueId}`)
        .send({
          customerName: 'Cliente Format',
          customerPhone: '+2250700000044',
          paymentMethod: 'MOBILE_MONEY',
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(201);

      // Le client saisit un format différent (espaces) — la comparaison est
      // normalisée des deux côtés, l'annulation doit fonctionner.
      const cancelled = await request(app.getHttpServer())
        .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/cancel`)
        .send({ phone: '+225 07 00 00 00 44' })
        .expect(200);
      expect(cancelled.body.status).toBe('cancelled');
    });

    it('refuse l’annulation sans le bon téléphone → 404 (aucune fuite)', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
        .expect(200);
      const product = list.body.items[0];
      const created = await request(app.getHttpServer())
        .post(`/api/v1/orders/boutique/${boutiqueId}`)
        .send({
          customerName: 'Cliente Secrete',
          customerPhone: '+2250700000077',
          paymentMethod: 'CASH_ON_DELIVERY',
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/cancel`)
        .send({ phone: '+2250999999999' })
        .expect(404);
    });

    it('refuse l’annulation d’une commande déjà livrée → 400', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/products/public/boutique/aziz-tech?search=chargeur')
        .expect(200);
      const product = list.body.items[0];
      const created = await request(app.getHttpServer())
        .post(`/api/v1/orders/boutique/${boutiqueId}`)
        .send({
          customerName: 'Cliente Livree',
          customerPhone: '+2250700000066',
          paymentMethod: 'MOBILE_MONEY',
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(201);

      // Le vendeur livre la commande
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'DELIVERED' })
        .expect(200);

      // Le client ne peut plus l'annuler
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/orders/boutique/${boutiqueId}/${created.body.id}/cancel`)
        .send({ phone: '+2250700000066' })
        .expect(400);
      expect(res.body.message).toContain('ne peut plus être annulée');

      // Ni deux fois après annulation réussie
      const pending = await request(app.getHttpServer())
        .post(`/api/v1/orders/boutique/${boutiqueId}`)
        .send({
          customerName: 'Double',
          customerPhone: '+2250700000055',
          paymentMethod: 'WHATSAPP_DIRECT',
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/boutique/${boutiqueId}/${pending.body.id}/cancel`)
        .send({ phone: '+2250700000055' })
        .expect(200);
      const again = await request(app.getHttpServer())
        .patch(`/api/v1/orders/boutique/${boutiqueId}/${pending.body.id}/cancel`)
        .send({ phone: '+2250700000055' })
        .expect(400);
      expect(again.body.message).toContain('déjà annulée');
    });

    it('le vendeur liste ses commandes et change le statut', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/boutique/${boutiqueId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);
      expect(res.body.length).toBeGreaterThan(0);

      // Prend la première commande annulable (les tests précédents peuvent
      // avoir laissé des commandes CANCELLED / DELIVERED)
      const active = res.body.find(
        (o: { status: string }) =>
          o.status === 'pending' || o.status === 'paid',
      ) ?? res.body[0];
      const orderId = active.id;
      const updated = await request(app.getHttpServer())
        .patch(`/api/v1/orders/boutique/${boutiqueId}/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'SHIPPING' })
        .expect(200);
      expect(updated.body.status).toBe('shipping');
    });

    it('un autre vendeur ne peut pas voir les commandes → 403', async () => {
      const otherEmail = `autre-${Date.now()}@test.com`;
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
        .get(`/api/v1/orders/boutique/${boutiqueId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('dashboard : overview et stats accessibles au vendeur', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/dashboard/boutique/${boutiqueId}/overview`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/v1/dashboard/boutique/${boutiqueId}/stats?period=7_days`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/v1/dashboard/boutique/${boutiqueId}/customers`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);
    });
  });
});
