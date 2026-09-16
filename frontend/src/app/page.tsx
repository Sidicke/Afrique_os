import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Navbar from "@/components/sections/Navbar";
import HomeHero from "@/components/home/HomeHero";
import LiveMarketplace from "@/components/home/LiveMarketplace";
import UnifiedValueProp from "@/components/sections/UnifiedValueProp";
import MobileCTA from "@/components/ui/MobileCTA";
import StructuredData from "@/components/seo/StructuredData";

// Lazy loading des sections below-the-fold
const FinalCTA = dynamic(() => import('@/components/sections/FinalCTA'), { ssr: true });
const VisionFAQ = dynamic(() => import('@/components/sections/VisionFAQ'), { ssr: true, loading: () => <div className="py-28" /> });
const Footer = dynamic(() => import('@/components/sections/Footer'), { ssr: true });

export const metadata: Metadata = {
  title: 'ZennShop | Votre commerce en pleine lumière',
  description: 'Créez votre boutique en ligne en 10 minutes. Gérez catalogue, commandes et discussions clients. Rejoignez le marketplace africain connecté. ',
  keywords: ['e-commerce Afrique', 'boutique en ligne', 'marketplace africain', 'FCFA', 'mobile money'],
  openGraph: {
    title: 'ZennShop | Votre commerce en pleine lumière',
    description: 'Créez votre boutique en ligne en 10 minutes. Marketplace multi-vendeur pour le commerce africain.',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'ZennShop',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZennShop',
    description: 'Votre boutique en ligne en 10 minutes. Commerce connecté pour l\'Afrique.',
  },
};

/**
 * Homepage `/` — Plateforme e-commerce multi-vendeur ultra fluide.
 * 5 sections optimisées : Hero compact avec recherche · Marketplace vivant avec données réelles ·
 * Proposition de valeur unifiée (cockpit interactif) · FAQ · CTA final + Footer.
 * Focus : rapidité, fluidité, conversion. « Votre commerce, en pleine lumière. »
 */
export default function Home() {
  return (
    <>
      <StructuredData />
      <Navbar />
      <main id="main-content" className="relative overflow-hidden bg-gradient-to-b from-midnight-950 via-[#0f1116] to-midnight-900">
        {/* 1 — Hero compact : recherche réelle + stats dynamiques + CTA séparés */}
        <HomeHero />

        {/* 2 — Marketplace vivant : produits réels, catégories, boutiques */}
        <LiveMarketplace />

        {/* 3 — Proposition de valeur unifiée : cockpit interactif (vitrine, catalogue, messagerie) */}
        <UnifiedValueProp />

        {/* 5 — CTA final (lazy loaded) */}
        <FinalCTA />

        {/* 6 — Vision & Compréhension (storytelling final, remplace FAQ répétée) */}
        <VisionFAQ />

        {/* CTA sticky mobile */}
        <MobileCTA />
      </main>
      <Footer />
    </>
  );
}
