"use client";

import { useState } from "react";
import Container from "@/components/ui/Container";
import MarketplaceHero from "./MarketplaceHero";
import TrustBar from "./TrustBar";
import MarketplaceDailyDeals from "./MarketplaceDailyDeals";
import PromoBanner from "./PromoBanner";
import MarketplaceCategories from "./MarketplaceCategories";
import MarketplaceLatestProducts from "./MarketplaceLatestProducts";
import MarketplaceShops from "./MarketplaceShops";
import MarketplaceCatalogue from "./MarketplaceCatalogue";

/**
 * Accueil du Marketplace : espace commercial public de la plateforme.
 * 
 * Structure épurée et 100% dynamique :
 *   1. Hero (recherche, catégories réelles du backend, métriques en direct)
 *   2. Barre de confiance souveraine (Mobile Money, boutiques vérifiées, WhatsApp direct)
 *   3. Offres et sélections réelles (promotions authentiques du backend)
 *   4. Catégories visuelles dynamiques
 *   5. Catalogue interactif et boutiques partenaires
 *   6. Bannière commerçant (0 FCFA pour démarrer)
 */
export default function MarketplaceHome({
  hideSellerBanner = false,
}: {
  hideSellerBanner?: boolean;
}) {
  const [category, setCategory] = useState<string | null>(null);

  const handleCategorySelect = (slug: string) => {
    setCategory(slug);
    const el = document.getElementById("marketplace-catalogue");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col bg-paper min-h-screen">
      {/* 1. Hero : recherche, catégories réelles et métriques DB */}
      <MarketplaceHero onSelectCategory={handleCategorySelect} />

      {/* 2. Barre de réassurance souveraine : Mobile Money, contact direct, boutiques vérifiées */}
      <TrustBar />

      {/* 3. Offres et sélections réelles */}
      <MarketplaceDailyDeals />

      <Container size="wide" className="flex flex-col gap-12 py-10">
        {/* 4. Catégories visuelles réelles */}
        <MarketplaceCategories
          activeCategory={category}
          onChange={setCategory}
        />

        {/* 5. Layout Catalogue : Sidebar derniers ajouts + Catalogue principal + Boutiques */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Sidebar : Derniers produits réels (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3">
            <MarketplaceLatestProducts />
          </aside>

          {/* Zone principale : Catalogue avec filtres et Boutiques partenaires */}
          <main className="col-span-12 lg:col-span-9 flex flex-col gap-12">
            <MarketplaceCatalogue
              category={category}
              onClearCategory={() => setCategory(null)}
            />
            
            <MarketplaceShops />
          </main>
        </div>

        {/* 6. Bannière Vendeur : masquée pour un utilisateur qui a déjà une boutique */}
        {!hideSellerBanner && <PromoBanner variant="seller" />}
      </Container>
    </div>
  );
}
