import {
  BoutiqueStatus,
  ModerationStatus,
  ModerationTargetType,
  OrderStatus,
  PaymentMethod,
  PrismaClient,
  Role,
  SubscriptionStatus,
  VerificationDocumentType,
  VerificationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed de la plateforme…');

  // ===== Admin plateforme =====
  const adminPassword = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@plateforme.com' },
    update: {},
    create: {
      email: 'admin@plateforme.com',
      password: adminPassword,
      name: 'Admin Plateforme',
      role: Role.ADMIN,
    },
  });
  console.log('✅ Admin plateforme :', admin.email, '/ admin1234');

  // ===== Vendeur + boutique active =====
  const sellerPassword = await bcrypt.hash('vendeur1234', 10);
  const seller = await prisma.user.upsert({
    where: { email: 'vendeur@aziztech.com' },
    update: {},
    create: {
      email: 'vendeur@aziztech.com',
      password: sellerPassword,
      name: 'Aziz Koné',
      phone: '+225 07 00 00 00 00',
      role: Role.VENDEUR,
    },
  });

  const boutique = await prisma.boutique.upsert({
    where: { slug: 'aziz-tech' },
    // Boutique de démo vérifiée : badge de confiance affiché sur la vitrine
    update: { verificationStatus: VerificationStatus.VERIFIED },
    create: {
      name: 'Aziz Tech',
      slug: 'aziz-tech',
      tagline: "Tout ce qu'il vous faut",
      description:
        "Aziz Tech, c'est l'essentiel de l'électronique et des accessoires, soigneusement sélectionnés pour votre quotidien.",
      status: BoutiqueStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      plan: 'starter',
      email: 'vendeur@aziztech.com',
      phone: '+225 07 00 00 00 00',
      whatsappNumber: '+2250700000000',
      city: "Côte d'Ivoire",
      country: "Côte d'Ivoire",
      ownerId: seller.id,
      deliveryShortLabel: 'Livraison 24-48h',
      deliveryNote: 'Livraison 24-48h à Abidjan et partout en Côte d’Ivoire',
      warrantyNote: 'Garantie 6 mois sur tous les appareils',
      paymentNote: 'Paiement en ligne : Mobile Money ou carte bancaire',
      socialLinks: { instagram: '', facebook: '', twitter: '', linkedin: '', tiktok: '' },
      deliveryPacks: [
        { id: 'standard', name: 'Standard', price: 2000, description: 'Livraison en 24-48h.' },
        { id: 'gratuite', name: 'Gratuite', price: 0, description: 'Offerte dès 50 000 FCFA.', badge: 'Économisez' },
        { id: 'premium', name: 'Premium', price: 5000, description: 'Express le jour même.', badge: 'Recommandé' },
      ],
      promotions: [{ productId: 'ecouteurs-sans-fil', discountPercent: 20 }],
      notifications: [
        { id: 'new_order', label: 'Nouvelle commande', description: 'À chaque commande reçue.', enabled: true },
        { id: 'order_paid', label: 'Paiement reçu', description: 'Quand un client confirme le paiement d’une commande.', enabled: true },
        { id: 'order_cancelled', label: 'Commande annulée', description: 'Quand un client annule sa commande.', enabled: true },
        { id: 'new_message', label: 'Nouveau message client', description: 'À chaque nouveau message.', enabled: true },
        { id: 'low_stock', label: 'Alerte stock faible', description: 'Quand un produit tombe à 0.', enabled: true },
      ],
    },
  });
  // Garantit que les 5 préférences de notification de base existent, sans
  // écraser les choix (activé/désactivé) déjà faits par le vendeur.
  const DEFAULT_NOTIF_PREFS = [
    { id: 'new_order', label: 'Nouvelle commande', description: 'À chaque commande reçue.', enabled: true },
    { id: 'order_paid', label: 'Paiement reçu', description: 'Quand un client confirme le paiement d’une commande.', enabled: true },
    { id: 'order_cancelled', label: 'Commande annulée', description: 'Quand un client annule sa commande.', enabled: true },
    { id: 'new_message', label: 'Nouveau message client', description: 'À chaque nouveau message.', enabled: true },
    { id: 'low_stock', label: 'Alerte stock faible', description: 'Quand un produit tombe à 0.', enabled: true },
  ] as const;
  const currentPrefs = (boutique.notifications ?? []) as { id: string; label?: string; description?: string; enabled?: boolean }[];
  const mergedPrefs = DEFAULT_NOTIF_PREFS.map((def) => {
    const existing = currentPrefs.find((p) => p.id === def.id);
    return existing ?? { ...def };
  });
  await prisma.boutique.update({
    where: { id: boutique.id },
    data: { notifications: mergedPrefs },
  });
  console.log('✅ Vendeur :', seller.email, '/ vendeur1234 — boutique :', boutique.slug);

  // ===== Catégories =====
  const catTelephone = await prisma.category.upsert({
    where: { boutiqueId_slug: { boutiqueId: boutique.id, slug: 'telephone' } },
    update: {},
    create: { boutiqueId: boutique.id, name: 'Téléphone', slug: 'telephone' },
  });
  const catAudio = await prisma.category.upsert({
    where: { boutiqueId_slug: { boutiqueId: boutique.id, slug: 'audio' } },
    update: {},
    create: { boutiqueId: boutique.id, name: 'Audio', slug: 'audio' },
  });
  const catAccessoires = await prisma.category.upsert({
    where: { boutiqueId_slug: { boutiqueId: boutique.id, slug: 'accessoires' } },
    update: {},
    create: { boutiqueId: boutique.id, name: 'Accessoires', slug: 'accessoires' },
  });

  // ===== Produits =====
  const products = [
    {
      slug: 'smartphone-pro',
      name: 'Smartphone Pro',
      description:
        'Un smartphone performant au design soigné : grand écran, double caméra et batterie qui tient toute la journée.',
      price: 350000,
      oldPrice: 400000,
      stock: 12,
      sku: 'SP-001',
      isFeatured: true,
      categoryId: catTelephone.id,
      images: ['/assets/boutique/smartphone-pro.jpg'],
      variants: [
        { name: 'Couleur', value: 'Noir', priceDelta: 0, stock: 6 },
        { name: 'Couleur', value: 'Bleu', priceDelta: 10000, stock: 6 },
      ],
      reviews: [
        { author: 'Awa D.', rating: 5, comment: 'Excellente qualité, livraison rapide.' },
        { author: 'Mamadou S.', rating: 4, comment: 'Très bon rapport qualité/prix.' },
      ],
    },
    {
      slug: 'ecouteurs-sans-fil',
      name: 'Écouteurs Sans Fil',
      description: 'Écouteurs Bluetooth avec réduction de bruit et étui de charge.',
      price: 45000,
      stock: 30,
      sku: 'EA-002',
      isFeatured: true,
      categoryId: catAudio.id,
      images: ['/assets/boutique/ecouteurs.jpg'],
      variants: [{ name: 'Couleur', value: 'Blanc', priceDelta: 0, stock: 30 }],
      reviews: [{ author: 'Fatou C.', rating: 5, comment: 'Son impeccable.' }],
    },
    {
      slug: 'chargeur-rapide',
      name: 'Chargeur Rapide 65W',
      description: 'Chargeur USB-C 65W compatible téléphones et ordinateurs portables.',
      price: 18000,
      oldPrice: 22000,
      stock: 45,
      sku: 'CR-003',
      categoryId: catAccessoires.id,
      images: ['/assets/produits/tech.jpg'],
      variants: [],
      reviews: [],
    },
  ];

  for (const p of products) {
    const { variants, reviews, ...data } = p;
    const product = await prisma.product.upsert({
      where: { boutiqueId_slug: { boutiqueId: boutique.id, slug: p.slug } },
      // Idempotent : remet TOUJOURS le stock, l'état actif et les images (les
      // tests e2e / commandes décrémentent la même base de dev — un re-seed
      // doit restaurer l'état de référence du catalogue).
      update: {
        stock: p.stock,
        isActive: true,
        images: p.images,
        // Restaure aussi la promo réelle (oldPrice) — alimente les deals marketplace
        oldPrice: p.oldPrice !== undefined ? p.oldPrice : undefined,
      },
      create: {
        ...data,
        boutiqueId: boutique.id,
        currency: 'XOF',
        variants: { create: variants },
        reviews: { create: reviews },
      },
    });
    // Restaure aussi le stock des variantes si le produit existait déjà.
    for (const v of variants) {
      await prisma.variant.updateMany({
        where: { productId: product.id, name: v.name, value: v.value },
        data: { stock: v.stock, priceDelta: v.priceDelta ?? null },
      });
    }
    // Promotion liée au slug réel du produit (le seed référence "ecouteurs-sans-fil")
    if (p.slug === 'ecouteurs-sans-fil') {
      await prisma.boutique.update({
        where: { id: boutique.id },
        data: { promotions: [{ productId: product.id, discountPercent: 20 }] },
      });
    }
  }

  // Marques de démo (classement des produits par marque dans la vitrine)
  const brandsAziz = [
    { slug: 'samsung', name: 'Samsung', products: ['smartphone-pro'] },
    { slug: 'apple', name: 'Apple', products: ['ecouteurs-sans-fil'] },
    { slug: 'anker', name: 'Anker', products: ['chargeur-rapide'] },
  ] as const;
  for (const b of brandsAziz) {
    const brand = await prisma.brand.upsert({
      where: { boutiqueId_slug: { boutiqueId: boutique.id, slug: b.slug } },
      update: {},
      create: { boutiqueId: boutique.id, name: b.name, slug: b.slug },
    });
    await prisma.product.updateMany({
      where: { boutiqueId: boutique.id, slug: { in: [...b.products] } },
      data: { brandId: brand.id },
    });
  }
  console.log('✅ Produits seedés :', products.length, '· marques :', brandsAziz.length);

  // ===== Commande de démo =====
  const demoProduct = await prisma.product.findFirst({
    where: { boutiqueId: boutique.id },
  });
  if (demoProduct) {
    const existing = await prisma.order.findFirst({ where: { boutiqueId: boutique.id } });
    if (!existing) {
      await prisma.order.create({
        data: {
          boutiqueId: boutique.id,
          reference: 'AC-8901',
          customerName: 'Awa Diallo',
          customerPhone: '+225 07 08 12 34 56',
          city: 'Abidjan (Cocody)',
          country: "Côte d'Ivoire",
          status: OrderStatus.PAID,
          paymentMethod: PaymentMethod.MOBILE_MONEY,
          deliveryName: 'Standard',
          deliveryPrice: 2000,
          total: demoProduct.price.toNumber() + 2000,
          items: {
            create: [
              {
                productId: demoProduct.id,
                productName: demoProduct.name,
                quantity: 1,
                unitPrice: demoProduct.price,
              },
            ],
          },
        },
      });
    }
  }

  // ===== Boutique 2 : Wax & Style (mode africaine) =====
  const waxPassword = await bcrypt.hash('vendeur1234', 10);
  const waxSeller = await prisma.user.upsert({
    where: { email: 'vendeur@waxstyle.com' },
    update: {},
    create: {
      email: 'vendeur@waxstyle.com',
      password: waxPassword,
      name: 'Aïcha Traoré',
      phone: '+225 07 11 22 33 44',
      role: Role.VENDEUR,
    },
  });

  const waxBoutique = await prisma.boutique.upsert({
    where: { slug: 'wax-style' },
    update: { verificationStatus: VerificationStatus.VERIFIED },
    create: {
      name: 'Wax & Style',
      slug: 'wax-style',
      tagline: 'L’élégance africaine, tissée avec passion',
      description:
        'Wax & Style met en lumière le savoir-faire africain : tissus wax et bazin, tenues sur mesure et accessoires qui célèbrent la beauté de nos cultures.',
      status: BoutiqueStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      plan: 'starter',
      email: 'vendeur@waxstyle.com',
      phone: '+225 07 11 22 33 44',
      whatsappNumber: '+2250711223344',
      city: 'Abidjan (Treichville)',
      country: "Côte d'Ivoire",
      ownerId: waxSeller.id,
      deliveryShortLabel: 'Livraison 48-72h',
      deliveryNote: 'Livraison 48-72h partout en Côte d’Ivoire',
      warrantyNote: 'Échange sous 7 jours si le tissu est intact',
      paymentNote: 'Paiement en ligne : Mobile Money ou carte bancaire',
      socialLinks: { instagram: '', facebook: '', twitter: '', linkedin: '', tiktok: '' },
      deliveryPacks: [
        { id: 'standard', name: 'Standard', price: 2000, description: 'Livraison en 48-72h.' },
        { id: 'express', name: 'Express', price: 4000, description: 'Livrée sous 24h à Abidjan.', badge: 'Recommandé' },
      ],
      promotions: [],
      notifications: [
        { id: 'new_order', label: 'Nouvelle commande', description: 'À chaque commande reçue.', enabled: true },
        { id: 'order_paid', label: 'Paiement reçu', description: 'Quand un client confirme le paiement d’une commande.', enabled: true },
        { id: 'order_cancelled', label: 'Commande annulée', description: 'Quand un client annule sa commande.', enabled: true },
        { id: 'new_message', label: 'Nouveau message client', description: 'À chaque nouveau message.', enabled: true },
        { id: 'low_stock', label: 'Alerte stock faible', description: 'Quand un produit tombe à 0.', enabled: true },
      ],
    },
  });

  // Fusionne les préférences de notification (nouveaux types ajoutés au fil
  // des versions) sans écraser les choix déjà faits par le vendeur.
  const currentWaxPrefs = (waxBoutique.notifications ?? []) as { id: string; label?: string; description?: string; enabled?: boolean }[];
  const mergedWaxPrefs = DEFAULT_NOTIF_PREFS.map((def) => {
    const existing = currentWaxPrefs.find((p) => p.id === def.id);
    return existing ?? { ...def };
  });
  await prisma.boutique.update({
    where: { id: waxBoutique.id },
    data: { notifications: mergedWaxPrefs },
  });

  const catTissus = await prisma.category.upsert({
    where: { boutiqueId_slug: { boutiqueId: waxBoutique.id, slug: 'tissus' } },
    update: {},
    create: { boutiqueId: waxBoutique.id, name: 'Tissus', slug: 'tissus' },
  });
  const catMode = await prisma.category.upsert({
    where: { boutiqueId_slug: { boutiqueId: waxBoutique.id, slug: 'mode' } },
    update: {},
    create: { boutiqueId: waxBoutique.id, name: 'Mode', slug: 'mode' },
  });

  const waxProducts = [
    {
      slug: 'tissu-wax-premium',
      name: 'Tissu Wax Premium (6 yards)',
      description: 'Véritable wax hollandais, motifs éclatants et couleurs qui ne fanent pas.',
      price: 25000,
      oldPrice: 30000,
      stock: 40,
      sku: 'WX-001',
      isFeatured: true,
      categoryId: catTissus.id,
      images: ['/assets/produits/wax.jpg'],
      variants: [{ name: 'Mètre', value: '6 yards', priceDelta: 0, stock: 40 }],
      reviews: [{ author: 'Nadège K.', rating: 5, comment: 'Couleurs magnifiques, tissu épais et de qualité.' }],
    },
    {
      slug: 'tissu-bazin-riche',
      name: 'Bazin Riche brodé',
      description: 'Bazin riche de grande qualité, idéal pour les grandes occasions.',
      price: 18000,
      stock: 25,
      sku: 'WX-002',
      categoryId: catTissus.id,
      images: ['/assets/produits/tissus.jpg'],
      variants: [],
      reviews: [],
    },
    {
      slug: 'robe-sur-mesure',
      name: 'Robe sur mesure',
      description: 'Robe coupée sur mesure par nos couturiers, à partir de votre tissu.',
      price: 35000,
      stock: 10,
      sku: 'WX-003',
      isFeatured: true,
      categoryId: catMode.id,
      images: ['/assets/produits/mode.jpg'],
      variants: [{ name: 'Taille', value: 'S', priceDelta: 0, stock: 4 }, { name: 'Taille', value: 'M', priceDelta: 0, stock: 3 }, { name: 'Taille', value: 'L', priceDelta: 0, stock: 3 }],
      reviews: [{ author: 'Mariam B.', rating: 5, comment: 'Coupe parfaite, finitions impeccables.' }],
    },
    {
      slug: 'ensemble-chemisier-pagne',
      name: 'Ensemble chemisier & jupe',
      description: 'Ensemble coordonné en pagne, confectionné à la main.',
      price: 45000,
      oldPrice: 55000,
      stock: 8,
      sku: 'WX-004',
      categoryId: catMode.id,
      images: ['/assets/produits/mode2.jpg'],
      variants: [{ name: 'Taille', value: 'M', priceDelta: 0, stock: 8 }],
      reviews: [],
    },
  ];
  for (const p of waxProducts) {
    const { variants, reviews, ...data } = p;
    const product = await prisma.product.upsert({
      where: { boutiqueId_slug: { boutiqueId: waxBoutique.id, slug: p.slug } },
      update: {
        stock: p.stock,
        isActive: true,
        images: p.images,
        // Restaure aussi la promo réelle (oldPrice) — alimente les deals marketplace
        oldPrice: p.oldPrice !== undefined ? p.oldPrice : undefined,
      },
      create: {
        ...data,
        boutiqueId: waxBoutique.id,
        currency: 'XOF',
        variants: { create: variants },
        reviews: { create: reviews },
      },
    });
    for (const v of variants) {
      await prisma.variant.updateMany({
        where: { productId: product.id, name: v.name, value: v.value },
        data: { stock: v.stock, priceDelta: v.priceDelta ?? null },
      });
    }
  }

  // Marques de démo (wax & bazin)
  const brandsWax = [
    { slug: 'vlisco', name: 'Vlisco', products: ['tissu-wax-premium'] },
    { slug: 'uniwax', name: 'Uniwax', products: ['tissu-bazin-riche'] },
  ] as const;
  for (const b of brandsWax) {
    const brand = await prisma.brand.upsert({
      where: { boutiqueId_slug: { boutiqueId: waxBoutique.id, slug: b.slug } },
      update: {},
      create: { boutiqueId: waxBoutique.id, name: b.name, slug: b.slug },
    });
    await prisma.product.updateMany({
      where: { boutiqueId: waxBoutique.id, slug: { in: [...b.products] } },
      data: { brandId: brand.id },
    });
  }
  console.log('✅ Boutique Wax & Style :', waxProducts.length, 'produits · marques :', brandsWax.length);

  // ===== Boutique 3 : Beauté Naturelle (cosmétiques) =====
  const beautePassword = await bcrypt.hash('vendeur1234', 10);
  const beauteSeller = await prisma.user.upsert({
    where: { email: 'vendeur@beautenaturelle.com' },
    update: {},
    create: {
      email: 'vendeur@beautenaturelle.com',
      password: beautePassword,
      name: 'Kadiatou Bamba',
      phone: '+225 05 55 66 77 88',
      role: Role.VENDEUR,
    },
  });

  const beauteBoutique = await prisma.boutique.upsert({
    where: { slug: 'beaute-naturelle' },
    update: { verificationStatus: VerificationStatus.VERIFIED },
    create: {
      name: 'Beauté Naturelle',
      slug: 'beaute-naturelle',
      tagline: 'Le pouvoir des plantes, pour une peau éclatante',
      description:
        'Cosmétiques naturels à base de karité, beurre de cacao et huiles végétales, préparés artisanalement en Côte d’Ivoire.',
      status: BoutiqueStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      plan: 'starter',
      email: 'vendeur@beautenaturelle.com',
      phone: '+225 05 55 66 77 88',
      whatsappNumber: '+2250555667788',
      city: 'Abidjan (Cocody)',
      country: "Côte d'Ivoire",
      ownerId: beauteSeller.id,
      deliveryShortLabel: 'Livraison 24-48h',
      deliveryNote: 'Livraison 24-48h à Abidjan et partout en Côte d’Ivoire',
      warrantyNote: 'Produits 100% naturels, sans conservateurs',
      paymentNote: 'Paiement en ligne : Mobile Money ou carte bancaire',
      socialLinks: { instagram: '', facebook: '', twitter: '', linkedin: '', tiktok: '' },
      deliveryPacks: [
        { id: 'standard', name: 'Standard', price: 1500, description: 'Livraison en 24-48h.' },
        { id: 'gratuite', name: 'Gratuite', price: 0, description: 'Offerte dès 30 000 FCFA.', badge: 'Économisez' },
      ],
      promotions: [],
      notifications: [
        { id: 'new_order', label: 'Nouvelle commande', description: 'À chaque commande reçue.', enabled: true },
        { id: 'order_paid', label: 'Paiement reçu', description: 'Quand un client confirme le paiement d’une commande.', enabled: true },
        { id: 'order_cancelled', label: 'Commande annulée', description: 'Quand un client annule sa commande.', enabled: true },
        { id: 'new_message', label: 'Nouveau message client', description: 'À chaque nouveau message.', enabled: true },
        { id: 'low_stock', label: 'Alerte stock faible', description: 'Quand un produit tombe à 0.', enabled: true },
      ],
    },
  });

  // Fusionne les préférences de notification (nouveaux types ajoutés au fil
  // des versions) sans écraser les choix déjà faits par le vendeur.
  const currentBeautePrefs = (beauteBoutique.notifications ?? []) as { id: string; label?: string; description?: string; enabled?: boolean }[];
  const mergedBeautePrefs = DEFAULT_NOTIF_PREFS.map((def) => {
    const existing = currentBeautePrefs.find((p) => p.id === def.id);
    return existing ?? { ...def };
  });
  await prisma.boutique.update({
    where: { id: beauteBoutique.id },
    data: { notifications: mergedBeautePrefs },
  });

  const catBeaute = await prisma.category.upsert({
    where: { boutiqueId_slug: { boutiqueId: beauteBoutique.id, slug: 'beaute' } },
    update: {},
    create: { boutiqueId: beauteBoutique.id, name: 'Beauté', slug: 'beaute' },
  });
  const catBijoux = await prisma.category.upsert({
    where: { boutiqueId_slug: { boutiqueId: beauteBoutique.id, slug: 'bijoux' } },
    update: {},
    create: { boutiqueId: beauteBoutique.id, name: 'Bijoux', slug: 'bijoux' },
  });

  const beauteProducts = [
    {
      slug: 'beurre-de-karite-pur',
      name: 'Beurre de Karité pur (200g)',
      description: 'Karité brut artisanal, non raffiné, nourrit et répare la peau et les cheveux.',
      price: 5000,
      oldPrice: 6500,
      stock: 60,
      sku: 'BN-001',
      isFeatured: true,
      categoryId: catBeaute.id,
      images: ['/assets/produits/karite.jpg'],
      variants: [],
      reviews: [{ author: 'Aminata D.', rating: 5, comment: 'Pureté incroyable, ma peau n’a jamais été aussi douce.' }],
    },
    {
      slug: 'gel-daloe-vera',
      name: 'Gel d’Aloe Vera naturel',
      description: 'Hydrate, apaise et répare — parfait après le soleil.',
      price: 4500,
      stock: 45,
      sku: 'BN-002',
      categoryId: catBeaute.id,
      images: ['/assets/produits/beaute.jpg'],
      variants: [],
      reviews: [],
    },
    {
      slug: 'collier-perles-africaines',
      name: 'Collier de perles africaines',
      description: 'Collier artisanal en perles, fait main — un bijou qui raconte une histoire.',
      price: 12000,
      stock: 20,
      sku: 'BN-003',
      isFeatured: true,
      categoryId: catBijoux.id,
      images: ['/assets/produits/bijoux.jpg'],
      variants: [{ name: 'Couleur', value: 'Doré', priceDelta: 0, stock: 10 }, { name: 'Couleur', value: 'Bleu', priceDelta: 0, stock: 10 }],
      reviews: [{ author: 'Fatou C.', rating: 4, comment: 'Très beau travail artisanal.' }],
    },
    {
      slug: 'boucles-oreilles-bois',
      name: 'Boucles d’oreilles en bois',
      description: 'Boucles légères et élégantes en bois sculpté, faites main.',
      price: 7000,
      stock: 30,
      sku: 'BN-004',
      categoryId: catBijoux.id,
      images: ['/assets/produits/local.jpg'],
      variants: [],
      reviews: [],
    },
  ];
  for (const p of beauteProducts) {
    const { variants, reviews, ...data } = p;
    const product = await prisma.product.upsert({
      where: { boutiqueId_slug: { boutiqueId: beauteBoutique.id, slug: p.slug } },
      update: {
        stock: p.stock,
        isActive: true,
        images: p.images,
        // Restaure aussi la promo réelle (oldPrice) — alimente les deals marketplace
        oldPrice: p.oldPrice !== undefined ? p.oldPrice : undefined,
      },
      create: {
        ...data,
        boutiqueId: beauteBoutique.id,
        currency: 'XOF',
        variants: { create: variants },
        reviews: { create: reviews },
      },
    });
    for (const v of variants) {
      await prisma.variant.updateMany({
        where: { productId: product.id, name: v.name, value: v.value },
        data: { stock: v.stock, priceDelta: v.priceDelta ?? null },
      });
    }
  }
  console.log('✅ Boutique Beauté Naturelle :', beauteProducts.length, 'produits');

  // ============================================================
  // Module admin plateforme (dashboard super admin)
  // ============================================================

  // ---- Plans d'abonnement (catalogue — PlansManager) ----
  const plans = [
    { slug: 'starter', name: 'Starter', description: 'Pour démarrer : catalogue, commandes et support standard.', price: 0, sortOrder: 1 },
    { slug: 'pro', name: 'Pro', description: 'Pour grandir : fonctionnalités avancées et support prioritaire.', price: 15000, sortOrder: 2 },
    { slug: 'business', name: 'Business', description: 'Pour les boutiques à fort volume : multi-boutiques et API.', price: 45000, sortOrder: 3 },
  ] as const;
  for (const p of plans) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      update: { name: p.name, description: p.description, price: p.price },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: p.price,
        interval: 'month',
        isDefault: p.slug === 'starter',
        sortOrder: p.sortOrder,
        features: [
          { label: 'Catalogue illimité', included: true },
          { label: 'Commandes', included: true },
          { label: 'Support prioritaire', included: p.slug !== 'starter' },
        ],
        limits: { products: p.slug === 'starter' ? 50 : 0 },
      },
    });
  }
  console.log('✅ Plans d’abonnement :', plans.map((p) => p.slug).join(', '));

  // ---- Client de démo (auteur des signalements) ----
  const clientPassword = await bcrypt.hash('client1234', 10);
  const client = await prisma.user.upsert({
    where: { email: 'client@demo.com' },
    update: {},
    create: {
      email: 'client@demo.com',
      password: clientPassword,
      name: 'Awa Diallo',
      phone: '+225 07 08 12 34 56',
      role: Role.CLIENT,
    },
  });

  // ---- Boutique 4 : Maison du Cuir (PENDING — dossier de vérification) ----
  const cuirPassword = await bcrypt.hash('vendeur1234', 10);
  const cuirSeller = await prisma.user.upsert({
    where: { email: 'vendeur@maisonducuir.com' },
    update: {},
    create: {
      email: 'vendeur@maisonducuir.com',
      password: cuirPassword,
      name: 'Yao Kouamé',
      phone: '+225 07 55 44 33 22',
      role: Role.VENDEUR,
    },
  });
  const cuirBoutique = await prisma.boutique.upsert({
    where: { slug: 'maison-du-cuir' },
    update: {},
    create: {
      name: 'Maison du Cuir',
      slug: 'maison-du-cuir',
      tagline: 'Maroquinerie artisanale',
      description: 'Sacs et ceintures en cuir véritable, fabriqués à la main en Côte d’Ivoire.',
      status: BoutiqueStatus.PENDING,
      verificationStatus: VerificationStatus.PENDING,
      plan: 'starter',
      email: 'vendeur@maisonducuir.com',
      phone: '+225 07 55 44 33 22',
      whatsappNumber: '+2250755443322',
      city: 'Abidjan (Yopougon)',
      country: "Côte d'Ivoire",
      ownerId: cuirSeller.id,
      socialLinks: { instagram: '', facebook: '', twitter: '', linkedin: '', tiktok: '' },
      deliveryPacks: [{ id: 'standard', name: 'Standard', price: 2000, description: 'Livraison 24-72h.' }],
      promotions: [],
      notifications: [],
    },
  });
  const cuirDocCount = await prisma.verificationDocument.count({ where: { boutiqueId: cuirBoutique.id } });
  if (cuirDocCount === 0) {
    await prisma.verificationDocument.create({
      data: {
        boutiqueId: cuirBoutique.id,
        type: VerificationDocumentType.IDENTITY,
        label: "Pièce d'identité",
        url: '/assets/verification/yao-identity.jpg',
      },
    });
  }
  console.log('✅ Boutique en attente de vérification : maison-du-cuir (Yao Kouamé)');

  // ---- Abonnements réels des boutiques ----
  const attachSubscription = async (
    boutiqueId: string | undefined,
    planSlug: string,
    status: SubscriptionStatus,
    opts?: { startsAt?: Date; trialEndsAt?: Date; currentPeriodEnd?: Date },
  ) => {
    if (!boutiqueId) return;
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) return;
    const data = {
      planId: plan.id,
      status,
      price: plan.price,
      startsAt: opts?.startsAt ?? new Date(),
      trialEndsAt: opts?.trialEndsAt ?? null,
      currentPeriodStart: opts?.startsAt ?? new Date(),
      currentPeriodEnd: opts?.currentPeriodEnd ?? null,
    };
    await prisma.subscription.upsert({
      where: { boutiqueId },
      update: data,
      create: { boutiqueId, ...data },
    });
    // Cohérence (doc 08/21) : la formule active de la boutique suit l'abonnement
    await prisma.boutique.update({ where: { id: boutiqueId }, data: { plan: planSlug } });
  };
  const azizTech = await prisma.boutique.findUnique({ where: { slug: 'aziz-tech' } });
  const waxStyle = await prisma.boutique.findUnique({ where: { slug: 'wax-style' } });
  const beauteNaturelle = await prisma.boutique.findUnique({ where: { slug: 'beaute-naturelle' } });
  const now = new Date();
  await attachSubscription(azizTech?.id, 'pro', SubscriptionStatus.ACTIVE, {
    startsAt: new Date(now.getTime() - 60 * 864e5),
    currentPeriodEnd: new Date(now.getTime() + 30 * 864e5),
  });
  await attachSubscription(waxStyle?.id, 'starter', SubscriptionStatus.TRIAL, {
    startsAt: new Date(now.getTime() - 20 * 864e5),
    trialEndsAt: new Date(now.getTime() + 6 * 864e5), // expire bientôt → alerte essai
  });
  await attachSubscription(beauteNaturelle?.id, 'starter', SubscriptionStatus.ACTIVE, {
    startsAt: new Date(now.getTime() - 45 * 864e5),
    currentPeriodEnd: new Date(now.getTime() + 15 * 864e5),
  });
  await attachSubscription(cuirBoutique.id, 'starter', SubscriptionStatus.TRIAL, {
    startsAt: new Date(now.getTime() - 2 * 864e5),
    trialEndsAt: new Date(now.getTime() + 12 * 864e5),
  });
  console.log('✅ Abonnements : Aziz Tech (Pro · actif), Wax & Style (essai), Beauté Naturelle (Starter), Maison du Cuir (essai)');

  // ---- Signalements de modération ----
  const reportCount = await prisma.moderationReport.count();
  if (reportCount === 0) {
    const waxProduct = await prisma.product.findFirst({
      where: { boutique: { slug: 'wax-style' } },
      select: { id: true, name: true },
    });
    await prisma.moderationReport.createMany({
      data: [
        {
          targetType: ModerationTargetType.BOUTIQUE,
          targetId: azizTech?.id ?? 'none',
          targetLabel: 'Aziz Tech',
          reason: 'Produit potentiellement contrefait',
          details: 'Un client signale un smartphone vendu comme original alors qu’il s’agirait d’une copie.',
          severity: 'high',
          status: ModerationStatus.NEW,
          reporterId: client.id,
        },
        {
          targetType: ModerationTargetType.PRODUCT,
          targetId: waxProduct?.id ?? 'none',
          targetLabel: waxProduct?.name ?? 'Produit Wax & Style',
          reason: 'Description trompeuse',
          details: 'Le tissu reçu ne correspond pas à la photo annoncée sur la fiche.',
          severity: 'medium',
          status: ModerationStatus.NEW,
          reporterId: client.id,
        },
        {
          targetType: ModerationTargetType.USER,
          targetId: beauteNaturelle?.ownerId ?? 'none',
          targetLabel: 'Kadiatou Bamba',
          reason: 'Comportement suspect',
          details: 'Réponses hostiles en messagerie envers une cliente.',
          severity: 'critical',
          status: ModerationStatus.IN_PROGRESS,
          reporterId: client.id,
        },
      ],
    });
  }
  console.log('✅ Signalements de modération créés');

  // ---- Journal administratif (audit trail) ----
  const logCount = await prisma.adminLog.count();
  if (logCount === 0 && azizTech) {
    await prisma.adminLog.createMany({
      data: [
        {
          adminId: admin.id,
          action: 'verification.approved',
          targetType: 'boutique',
          targetId: azizTech.id,
          targetLabel: 'Aziz Tech',
          details: { verificationStatus: 'VERIFIED' },
          createdAt: new Date(now.getTime() - 12 * 864e5),
        },
        {
          adminId: admin.id,
          action: 'store.activated',
          targetType: 'boutique',
          targetId: azizTech.id,
          targetLabel: 'Aziz Tech',
          details: { status: 'ACTIVE' },
          createdAt: new Date(now.getTime() - 12 * 864e5),
        },
        {
          adminId: admin.id,
          action: 'subscription.change_plan',
          targetType: 'subscription',
          targetId: azizTech.id,
          targetLabel: 'Aziz Tech',
          details: { plan: 'pro' },
          createdAt: new Date(now.getTime() - 10 * 864e5),
        },
      ],
    });
  }
  console.log('✅ Journal administratif initialisé');

  // ---- Paramètres globaux de la plateforme ----
  const defaultSettings = {
    general: {
      platformName: 'ZennShop',
      description: 'Plateforme e-commerce multi-vendeur',
      supportEmail: 'support@plateforme.com',
      contactPhone: '+225 07 00 00 00 00',
    },
    stores: {
      allowVendorCreation: true,
      maxStoresPerVendor: 5,
      newStoreStatus: 'PENDING',
      publicVisibility: 'active_verified',
      autoSuspendOnViolation: true,
    },
    verification: {
      verificationRequired: true,
      allowPublishBeforeVerified: false,
      documents: [
        { id: 'identity', label: "Pièce d'identité", required: true },
        { id: 'registre', label: 'Registre de commerce', required: true },
        { id: 'adresse', label: 'Justificatif d’adresse', required: false },
      ],
    },
    orders: {
      guestCheckoutEnabled: true,
      autoCancelAfterDays: 7,
      cancellationReasonRequired: false,
      requireAdminConfirmStatus: false,
    },
    subscriptions: {
      freeTrialEnabled: true,
      trialDays: 14,
      warnOnPlanChange: true,
      allowYearlyBilling: true,
    },
    catalog: {
      hideSuspendedStoreProducts: true,
      categories: [
        { id: 'mode', name: 'Mode & Textile', description: 'Vêtements, tissus et accessoires', active: true, productsCount: 4 },
        { id: 'tech', name: 'Électronique', description: 'Téléphones, audio et accessoires tech', active: true, productsCount: 3 },
        { id: 'beaute', name: 'Beauté & Bien-être', description: 'Cosmétiques et soins naturels', active: true, productsCount: 4 },
        { id: 'maison', name: 'Maison & Déco', description: 'À venir', active: false, productsCount: 0 },
      ],
    },
    roles: {
      defaultNewUserRole: 'VENDEUR',
      roles: [
        { id: 'super_admin', name: 'Super Admin', description: 'Accès complet à la plateforme', permissions: ['*'] },
        { id: 'moderator', name: 'Modérateur', description: 'Vérifications et modération', permissions: ['verification.*', 'moderation.*'] },
        { id: 'support', name: 'Support', description: 'Consultation et notes internes', permissions: ['stores.read', 'users.read', 'orders.read'] },
      ],
    },
    notifications: {
      system: [
        { id: 'new_store', label: 'Nouvelle boutique', description: 'Quand un vendeur crée une boutique', enabled: true },
        { id: 'verification_submitted', label: 'Vérification soumise', description: 'Quand un dossier arrive', enabled: true },
        { id: 'critical_event', label: 'Événements critiques', description: 'Signalements graves et incidents', enabled: true },
      ],
      adminAlerts: [
        { id: 'weekly_digest', label: 'Résumé hebdomadaire', description: 'Synthèse chaque lundi', enabled: true },
        { id: 'daily_anomalies', label: 'Anomalies quotidiennes', description: 'Paiements en attente, commandes bloquées', enabled: false },
      ],
    },
    security: {
      passwordMinLength: 8,
      maxLoginAttempts: 5,
      sessionTimeoutHours: 12,
      requireConfirmationSensitive: true,
      twoFactorForAdmins: false,
    },
    admins: [
      { id: 'admin-main', name: 'Admin Plateforme', email: 'admin@plateforme.com', role: 'Super Admin', lastActiveAt: new Date().toISOString(), active: true },
    ],
  };
  const existingSettings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
  if (existingSettings) {
    await prisma.platformSettings.update({
      where: { id: 'global' },
      data: { data: defaultSettings, updatedById: admin.id },
    });
  } else {
    await prisma.platformSettings.create({
      data: { id: 'global', data: defaultSettings, updatedById: admin.id },
    });
  }
  console.log('✅ Paramètres globaux initialisés');

  console.log('🎉 Seed terminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
