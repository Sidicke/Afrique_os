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
 * Accueil du Marketplace — l'espace commercial PUBLIC de la plateforme
 * (aucun compte requis pour découvrir).
 *
 * Hiérarchie enrichie (inspirée eMarket) :
 *   1. Hero (recherche + sidebar catégories + visuels)
 *   2. Barre de confiance (trust)
 *   3. Offres du jour (daily deals avec countdown)
 *   4. Bannière promo (coupon)
 *   5. Catégories visuelles (cartes avec icônes)
 *   6. Derniers ajouts (latest products)
 *   7. Boutiques partenaires
 *   8. Bannière vendeur (CTA ouvrir sa boutique)
 *   9. Catalogue trending (produits avec tri)
 *
 * Toutes les données viennent du backend (boutiques ACTIVE, produits actifs).
 *
 * `hideSellerBanner` : masque le CTA « Ouvrez votre boutique gratuitement »
 * dans les espaces connectés (ex. accueil client) où le recrutement de
 * vendeurs n'a pas sa place.
 */
export default function MarketplaceHome({
  hideSellerBanner = false,
}: {
  hideSellerBanner?: boolean;
}) {
  const [category, setCategory] = useState<string | null>(null);

  return (
    <div className="flex flex-col bg-paper min-h-screen">
      {/* 1. Hero eMarket (Menu catégories + Banner central + Bannières promos droites) */}
      <MarketplaceHero />

      {/* 2. Banner Coupon Gift Special */}
      <div className="py-2">
        <Container size="wide">
          <PromoBanner variant="coupon" />
        </Container>
      </div>

      {/* 3. Offres du Jour (Daily Deals avec Countdown) */}
      <MarketplaceDailyDeals />

      {/* 4. Barre de Confiance / Réassurance */}
      <TrustBar />

      <Container size="wide" className="flex flex-col gap-10 py-8">
        {/* 5. Catégories Visuelles */}
        <MarketplaceCategories
          activeCategory={category}
          onChange={setCategory}
        />

        {/* 6 & 7. Layout 2 Colonnes eMarket : Sidebar + Main Catalogue */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Sidebar : Derniers produits + Bannières (Visible uniquement sur Desktop) */}
          <aside className="hidden lg:block lg:col-span-3">
            <MarketplaceLatestProducts />
          </aside>

          {/* Zone principale : Produits Tendance & Boutiques (Prend tout l'espace 12 cols sur Mobile/Tablette, 9 cols sur Desktop) */}
          <main className="col-span-12 lg:col-span-9 flex flex-col gap-10">
            <MarketplaceCatalogue
              category={category}
              onClearCategory={() => setCategory(null)}
            />
            
            <MarketplaceShops />
          </main>
        </div>

        {/* 8. Bannière Vendeur — masquée pour un utilisateur qui a déjà une boutique */}
        {!hideSellerBanner && <PromoBanner variant="seller" />}
      </Container>
    </div>
  );
}
