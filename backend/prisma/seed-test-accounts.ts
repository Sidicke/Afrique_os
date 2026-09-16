/**
 * Script de création de 2 comptes vendeurs de test ZennShop
 * - starter@zennshop.test  / starter1234  → plan Starter  (1 boutique, 20 produits)
 * - business@zennshop.test / business1234 → plan Business (3 boutiques, 150 produits)
 */

import { PrismaClient, BoutiqueStatus, VerificationStatus, Role, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Création des comptes de test ZennShop...\n');

  // ─── 1. Compte STARTER ────────────────────────────────────────────────────
  const starterPassword = await bcrypt.hash('starter1234', 10);
  const starterUser = await prisma.user.upsert({
    where: { email: 'starter@zennshop.test' },
    update: { password: starterPassword },
    create: {
      email: 'starter@zennshop.test',
      password: starterPassword,
      name: 'Thomas Dubois',
      phone: '+225 01 11 22 33 44',
      role: Role.VENDEUR,
    },
  });

  const starterBoutique = await prisma.boutique.upsert({
    where: { slug: 'thomas-mode-africaine' },
    update: {},
    create: {
      name: 'Thomas Mode Africaine',
      slug: 'thomas-mode-africaine',
      tagline: 'La mode africaine à votre portée',
      description: 'Boutique spécialisée en vêtements et accessoires africains authentiques.',
      status: BoutiqueStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      plan: 'starter',
      email: 'starter@zennshop.test',
      phone: '+225 01 11 22 33 44',
      city: 'Abidjan',
      country: "Côte d'Ivoire",
      ownerId: starterUser.id,
      deliveryShortLabel: 'Livraison 24-48h',
      deliveryNote: 'Livraison rapide sur Abidjan',
      warrantyNote: 'Retours acceptés sous 7 jours',
      paymentNote: 'Paiement Mobile Money ou à la livraison',
    },
  });

  // Abonnement Starter (plan gratuit par défaut)
  const starterPlan = await prisma.plan.findFirst({ where: { slug: 'starter' } });
  if (starterPlan) {
    await prisma.subscription.upsert({
      where: { boutiqueId: starterBoutique.id },
      update: {},
      create: {
        boutiqueId: starterBoutique.id,
        planId: starterPlan.id,
        status: SubscriptionStatus.ACTIVE,
        price: 0,
        startsAt: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Compte STARTER créé :');
  console.log('   📧 Email    : starter@zennshop.test');
  console.log('   🔑 Password : starter1234');
  console.log('   🏪 Boutique : Thomas Mode Africaine (slug: thomas-mode-africaine)');
  console.log('   📋 Plan     : Starter (1 boutique, 20 produits max, 5% commission)\n');

  // ─── 2. Compte BUSINESS ───────────────────────────────────────────────────
  const businessPassword = await bcrypt.hash('business1234', 10);
  const businessUser = await prisma.user.upsert({
    where: { email: 'business@zennshop.test' },
    update: { password: businessPassword },
    create: {
      email: 'business@zennshop.test',
      password: businessPassword,
      name: 'Aminata Traoré',
      phone: '+221 77 88 99 00',
      role: Role.VENDEUR,
    },
  });

  // Boutique principale Business
  const businessBoutique1 = await prisma.boutique.upsert({
    where: { slug: 'aminata-beaute-dakar' },
    update: {},
    create: {
      name: 'Aminata Beauté Dakar',
      slug: 'aminata-beaute-dakar',
      tagline: 'Cosmétiques naturels 100% africains',
      description: 'Produits de beauté naturels issus du savoir-faire africain : karité, huile de baobab, savons artisanaux.',
      status: BoutiqueStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      plan: 'business',
      email: 'business@zennshop.test',
      phone: '+221 77 88 99 00',
      city: 'Dakar',
      country: 'Sénégal',
      ownerId: businessUser.id,
      deliveryShortLabel: 'Livraison 48h',
      deliveryNote: 'Livraison sur tout le Sénégal en 48h',
      warrantyNote: 'Produits garantis 100% naturels',
      paymentNote: 'Wave, Orange Money, carte bancaire',
      deliveryPacks: [
        { id: 'standard', name: 'Standard', price: 1500, description: 'Livraison en 48h.' },
        { id: 'express', name: 'Express', price: 3500, description: 'Le jour même à Dakar.', badge: 'Rapide' },
      ],
    },
  });

  // 2e boutique Business
  const businessBoutique2 = await prisma.boutique.upsert({
    where: { slug: 'aminata-mode-senegal' },
    update: {},
    create: {
      name: 'Aminata Mode Sénégal',
      slug: 'aminata-mode-senegal',
      tagline: 'Prêt-à-porter et bazin brodé',
      description: 'Collection de vêtements en wax, bazin et tissu africain pour femmes et hommes.',
      status: BoutiqueStatus.ACTIVE,
      verificationStatus: VerificationStatus.NONE,
      plan: 'business',
      email: 'business@zennshop.test',
      phone: '+221 77 88 99 00',
      city: 'Dakar',
      country: 'Sénégal',
      ownerId: businessUser.id,
      deliveryShortLabel: 'Livraison 3-5j',
      deliveryNote: 'Livraison nationale 3-5 jours ouvrables',
      warrantyNote: 'Échange possible sous 48h',
      paymentNote: 'Tous moyens de paiement acceptés',
    },
  });

  // Abonnement Business
  const businessPlan = await prisma.plan.findFirst({ where: { slug: 'business' } });
  if (businessPlan) {
    await prisma.subscription.upsert({
      where: { boutiqueId: businessBoutique1.id },
      update: {},
      create: {
        boutiqueId: businessBoutique1.id,
        planId: businessPlan.id,
        status: SubscriptionStatus.ACTIVE,
        price: businessPlan.price,
        startsAt: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Compte BUSINESS créé :');
  console.log('   📧 Email    : business@zennshop.test');
  console.log('   🔑 Password : business1234');
  console.log('   🏪 Boutique 1 : Aminata Beauté Dakar (slug: aminata-beaute-dakar) — ACTIVE + VERIFIED');
  console.log('   🏪 Boutique 2 : Aminata Mode Sénégal (slug: aminata-mode-senegal) — ACTIVE');
  console.log('   📋 Plan     : Business (3 boutiques max, 150 produits max, 2% commission)\n');

  console.log('🎉 Comptes de test créés avec succès !\n');
  console.log('═══════════════════════════════════════');
  console.log('COMPTE STARTER  : starter@zennshop.test  / starter1234');
  console.log('COMPTE BUSINESS : business@zennshop.test / business1234');
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error('❌ Erreur :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
