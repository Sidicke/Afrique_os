import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Delivery System E2E (PostgreSQL réel + NestJS HTTP + Décisions D1–D5)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const validPass = 'Password123!';

  let adminToken: string;
  let sellerToken: string;
  let buyerToken: string;
  let indepCourierToken: string;
  let agencyOwnerToken: string;
  let agencyCourierToken: string;

  let boutiqueId: string;
  let productId: string;
  let orderId: string;
  let shipmentId: string;
  let buyerCode: string;
  let missionId: string;

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
    authService = app.get(AuthService);
    const passwordHash = await bcrypt.hash(validPass, 10);

    // 1. Créer un vendeur + boutique via HTTP /auth/register
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Vendeur E2E Livraison',
        shopName: `Boutique E2E Livraison ${unique}`,
        email: `seller-deliv-${unique}@test.com`,
        password: validPass,
      })
      .expect(201);

    sellerToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: `seller-deliv-${unique}@test.com`, password: validPass })
        .expect(200)
    ).body.accessToken;

    const myBoutiques = await request(app.getHttpServer())
      .get('/api/v1/boutiques/my')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    boutiqueId = myBoutiques.body[0].id;

    // Activer la boutique en base pour permettre la vente publique
    await prisma.boutique.update({
      where: { id: boutiqueId },
      data: { status: 'ACTIVE', city: 'Cotonou', country: 'Bénin' },
    });

    // Créer un produit actif dans la boutique
    const prodRes = await request(app.getHttpServer())
      .post(`/api/v1/products/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: `Produit Test Livraison ${unique}`,
        price: 20000,
        stock: 10,
        description: 'Produit test E2E livraison',
      })
      .expect(201);
    productId = prodRes.body.id;

    // 2. Créer les acteurs (Admin, Client, Livreurs, Agence) en base PostgreSQL et émettre leurs tokens JWT
    await prisma.user.createMany({
      data: [
        {
          name: 'Admin E2E Livraison',
          email: `admin-deliv-${unique}@test.com`,
          password: passwordHash,
          role: 'ADMIN',
        },
        {
          name: 'Client Acheteur E2E',
          email: `buyer-deliv-${unique}@test.com`,
          password: passwordHash,
          role: 'CLIENT',
        },
        {
          name: 'Livreur Indépendant E2E',
          email: `indep-deliv-${unique}@test.com`,
          password: passwordHash,
          role: 'CLIENT',
        },
        {
          name: 'Propriétaire Agence E2E',
          email: `agency-owner-${unique}@test.com`,
          password: passwordHash,
          role: 'CLIENT',
        },
        {
          name: 'Livreur Agence E2E',
          email: `agency-courier-${unique}@test.com`,
          password: passwordHash,
          role: 'CLIENT',
        },
      ],
    });

    adminToken = (
      await authService.login({ email: `admin-deliv-${unique}@test.com`, password: validPass })
    ).accessToken;

    buyerToken = (
      await authService.login({ email: `buyer-deliv-${unique}@test.com`, password: validPass })
    ).accessToken;

    indepCourierToken = (
      await authService.login({ email: `indep-deliv-${unique}@test.com`, password: validPass })
    ).accessToken;

    agencyOwnerToken = (
      await authService.login({ email: `agency-owner-${unique}@test.com`, password: validPass })
    ).accessToken;

    agencyCourierToken = (
      await authService.login({ email: `agency-courier-${unique}@test.com`, password: validPass })
    ).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /delivery/geography & POST /delivery/quote — retourne le référentiel Bénin et calcule un devis cohérent', async () => {
    const geo = await request(app.getHttpServer())
      .get('/api/v1/delivery/geography')
      .expect(200);
    expect(geo.body.country).toBe('Bénin');
    expect(geo.body.departments).toContain('Littoral');
    expect(geo.body.stations.length).toBeGreaterThan(0);

    const quote = await request(app.getHttpServer())
      .post('/api/v1/delivery/quote')
      .send({
        boutiqueId,
        destinationDepartment: 'Atlantique',
        destinationCommune: 'Abomey-Calavi',
        deliveryMode: 'HOME',
      })
      .expect(200);
    expect(quote.body.quotedFeeFcfa).toBe(1500);
  });

  it('Enregistre, vérifie le KYC des acteurs et bloque un livreur d’agence sur GET /delivery/missions/public (Règle 4)', async () => {
    // Enregistrer l'agence
    const agencyRes = await request(app.getHttpServer())
      .post('/api/v1/delivery/agencies/register')
      .set('Authorization', `Bearer ${agencyOwnerToken}`)
      .send({
        name: `Agence Express E2E ${unique}`,
        phone: '+2290197001122',
        department: 'Littoral',
        commune: 'Cotonou',
      })
      .expect(201);

    // Validation KYC de l'agence par l'Admin
    await request(app.getHttpServer())
      .patch(`/api/v1/delivery/admin/agencies/${agencyRes.body.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ verificationStatus: 'VERIFIED' })
      .expect(200);

    // Enregistrer le livreur d'agence + validation KYC + rattachement à l'agence
    const agCourierRes = await request(app.getHttpServer())
      .post('/api/v1/delivery/couriers/register')
      .set('Authorization', `Bearer ${agencyCourierToken}`)
      .send({
        displayName: 'Livreur Agence E2E',
        phone: '+2290197002233',
        department: 'Littoral',
        commune: 'Cotonou',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/delivery/admin/couriers/${agCourierRes.body.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ verificationStatus: 'VERIFIED' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/delivery/agencies/${agencyRes.body.id}/couriers`)
      .set('Authorization', `Bearer ${agencyOwnerToken}`)
      .send({ courierProfileId: agCourierRes.body.id })
      .expect(201);

    // Règle 4 : Le livreur d'agence reçoit 403 Forbidden sur /delivery/missions/public
    await request(app.getHttpServer())
      .get('/api/v1/delivery/missions/public')
      .set('Authorization', `Bearer ${agencyCourierToken}`)
      .expect(403);

    // Enregistrer et valider le KYC du livreur indépendant
    const indepRes = await request(app.getHttpServer())
      .post('/api/v1/delivery/couriers/register')
      .set('Authorization', `Bearer ${indepCourierToken}`)
      .send({
        displayName: 'Livreur Indépendant E2E',
        phone: '+2290197004455',
        department: 'Littoral',
        commune: 'Cotonou',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/delivery/admin/couriers/${indepRes.body.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ verificationStatus: 'VERIFIED' })
      .expect(200);
  });

  it('Cycle complet E2E : Commande prépayée -> Shipment -> Dispatch Pool Public (D3 non-rétroactif) -> Acceptation Atomique -> Chat Client-Livreur -> Code à usage unique -> Révocation Chat -> Blocage Retrait Vendeur avant conformité', async () => {
    // 1. Créer une commande par le client connecté
    const orderRes = await request(app.getHttpServer())
      .post(`/api/v1/orders/boutique/${boutiqueId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        customerName: 'Client Acheteur E2E',
        customerPhone: '+2290196001122',
        address: 'Haie Vive, 2e rue après Pharmacie',
        city: 'Cotonou',
        country: 'Bénin',
        paymentMethod: 'MOBILE_MONEY',
        deliveryName: 'Livraison Domicile Cotonou',
        deliveryPrice: 1000,
        items: [{ productId, quantity: 1 }],
      })
      .expect(201);
    orderId = orderRes.body.id;

    // 2. Créer le Shipment avec adresse structurée béninoise
    const shpRes = await request(app.getHttpServer())
      .post('/api/v1/delivery/shipments/from-order')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        orderId,
        deliveryMode: 'HOME',
        destinationAddress: {
          department: 'Littoral',
          commune: 'Cotonou',
          quartier: 'Haie Vive',
          streetOrLandmark: '2e rue après Pharmacie Camp Guezo',
          contactPhone: '+2290196001122',
          latitude: 6.359,
          longitude: 2.398,
          accuracyMeters: 15,
          locationSource: 'GPS_CONFIRMED',
        },
      })
      .expect(201);
    shipmentId = shpRes.body.id;
    buyerCode = shpRes.body.initialBuyerDeliveryCode;
    expect(buyerCode).toHaveLength(6);

    // 3. Décision D2 : Tant que la commande est PENDING (non payée), le dispatch vers PUBLIC_POOL est refusé (400)
    await request(app.getHttpServer())
      .post(`/api/v1/delivery/shipments/${shipmentId}/dispatch`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ dispatchMode: 'PUBLIC_POOL', agreedFeeFcfa: 1000 })
      .expect(400);

    // 4. Le vendeur valide le paiement de la commande (statut PAID)
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/boutique/${boutiqueId}/${orderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'PAID' })
      .expect(200);

    // 5. Protection Wallet : Le vendeur tente de retirer immédiatement les fonds alors que la livraison n'est pas encore vérifiée -> refusé (400) !
    await request(app.getHttpServer())
      .post(`/api/v1/boutiques/${boutiqueId}/withdraw`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ amount: 15000, paymentInfo: 'MTN MoMo +2290197001122' })
      .expect(400);

    // 6. Le vendeur publie la mission dans le pool public (taux par défaut D3 = 10%)
    const dispatchRes = await request(app.getHttpServer())
      .post(`/api/v1/delivery/shipments/${shipmentId}/dispatch`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ dispatchMode: 'PUBLIC_POOL', agreedFeeFcfa: 1000 })
      .expect(201);
    missionId = dispatchRes.body.mission.id;
    expect(Number(dispatchRes.body.mission.appliedCommissionRatePct)).toBe(10);

    // 7. Décision D3 : L'Admin change ensuite le taux des livreurs indépendants à 20% -> la mission déjà contractualisée conserve 10% !
    await request(app.getHttpServer())
      .patch('/api/v1/delivery/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ independentCourierCommissionRatePct: 20 })
      .expect(200);

    // 8. Le livreur indépendant accepte la mission publique
    await request(app.getHttpServer())
      .post(`/api/v1/delivery/missions/${missionId}/accept`)
      .set('Authorization', `Bearer ${indepCourierToken}`)
      .expect(200);

    // 9. Le livreur et le client échangent un message pendant la mission active
    await request(app.getHttpServer())
      .post(`/api/v1/delivery/shipments/${shipmentId}/messages`)
      .set('Authorization', `Bearer ${indepCourierToken}`)
      .send({ content: 'Bonjour, je suis devant le portail.' })
      .expect(201);

    // 10. Le livreur saisit le code de remise à usage unique du client -> DELIVERED_VERIFIED
    const verifyRes = await request(app.getHttpServer())
      .post(`/api/v1/delivery/shipments/${shipmentId}/verify-code`)
      .set('Authorization', `Bearer ${indepCourierToken}`)
      .send({ code: buyerCode })
      .expect(200);
    expect(verifyRes.body.status).toBe('DELIVERED_VERIFIED');

    // 11. Section 5 : Toute tentative d'écriture par le livreur après DELIVERED_VERIFIED est rejetée (403 Forbidden)
    await request(app.getHttpServer())
      .post(`/api/v1/delivery/shipments/${shipmentId}/messages`)
      .set('Authorization', `Bearer ${indepCourierToken}`)
      .send({ content: 'Message interdit après remise' })
      .expect(403);

    // 12. Le client accepte la conformité du produit -> BUYER_ACCEPTED et libération de la réserve sur le Wallet vendeur
    await request(app.getHttpServer())
      .post(`/api/v1/delivery/shipments/${shipmentId}/accept-conformity`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({})
      .expect(200);

    // 13. Le vendeur peut maintenant demander son retrait (soumis à validation manuelle Admin D1)
    const withdrawalRes = await request(app.getHttpServer())
      .post(`/api/v1/boutiques/${boutiqueId}/withdraw`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ amount: 15000, paymentInfo: 'MTN MoMo +2290197001122' })
      .expect(201);
    expect(withdrawalRes.body.status).toBe('PENDING');

    // Restaurer le taux par défaut 10%
    await request(app.getHttpServer())
      .patch('/api/v1/delivery/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ independentCourierCommissionRatePct: 10 })
      .expect(200);
  });

  it('Décisions D1, D4 et D5 via HTTP : approbation manuelle Admin du décaissement livreur (D1), traitement batch des règlements éligibles (D4) et remise interurbaine chauffeur occasionnel sans compte (D5)', async () => {
    // Vérifier la configuration globale D1–D5
    const cfgRes = await request(app.getHttpServer())
      .get('/api/v1/delivery/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(cfgRes.body.manualAdminPayoutApprovalRequired).toBe(true);
    expect(cfgRes.body.autoPspPayoutEnabled).toBe(false);
    expect(cfgRes.body.codAllowedForPublicMissions).toBe(false);
    expect(cfgRes.body.codAllowedForInterurban).toBe(false);
    expect(cfgRes.body.allowOccasionalInterurbanCarrierWithoutAccount).toBe(true);

    // D1 : Approbation manuelle par l'Admin du reversement livreur créé à l'étape précédente
    const courierAlloc = await prisma.settlementAllocation.findFirstOrThrow({
      where: {
        shipmentId,
        beneficiaryType: 'INDEPENDENT_COURIER',
      },
    });
    expect(courierAlloc.status).toBe('ELIGIBLE_FOR_RELEASE');
    expect(Number(courierAlloc.commissionRate)).toBe(10); // D3 non-rétroactif vérifié en base !

    const approveRes = await request(app.getHttpServer())
      .patch(`/api/v1/delivery/admin/settlements/${courierAlloc.id}/approve-payout`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(approveRes.body.status).toBe('RELEASED_TO_WALLET');

    // D4 : Appel de l'endpoint d'éligibilité post-24h
    const batchRes = await request(app.getHttpServer())
      .post('/api/v1/delivery/admin/settlements/process-eligible')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(typeof batchRes.body.releasedCount).toBe('number');

    // D5 : Remise interurbaine avec chauffeur occasionnel sans compte utilisateur
    const handoverRes = await request(app.getHttpServer())
      .post(`/api/v1/delivery/shipments/${shipmentId}/handover`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        step: 'HANDOVER_TO_CARRIER',
        carrierCompany: 'Baobab Express',
        driverName: 'Moussa Zinsou',
        driverPhone: '+2290195112233',
        vehicleIdentifier: 'BJ-4821-RB',
        receiptReference: 'WB-COT-PKO-991',
        notes: 'Colis intact déposé à la gare Jonquet Cotonou',
      })
      .expect(201);
    expect(handoverRes.body.evidence.carrierCompany).toBe('Baobab Express');
    expect(handoverRes.body.evidence.driverPhone).toBe('+2290195112233');
    expect(handoverRes.body.evidence.receiptReference).toBe('WB-COT-PKO-991');
  });
});
