"use client";

import { useState } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import MarketplaceCategories from "@/components/marketplace/MarketplaceCategories";
import MarketplaceCatalogue from "@/components/marketplace/MarketplaceCatalogue";
import MarketplaceLatestProducts from "@/components/marketplace/MarketplaceLatestProducts";
import MarketplaceShops from "@/components/marketplace/MarketplaceShops";

/**
 * Bloc « Marketplace vivante » de la homepage.
 * Réutilise les blocs data réels (catégories globales, catalogue trié,
 * derniers produits, boutiques) — aucune donnée décorative. Les états vides
 * et skeletons sont gérés par chaque composant enfant.
 */
export default function LiveMarketplace() {
  const [category, setCategory] = useState<string | null>(null);

  return (
    <section id="marketplace" className="relative bg-paper py-12 sm:py-16 border-y border-stone-200/60 overflow-hidden">
      {/* Estompage subtil de transition haut et bas */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-stone-200/25 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-stone-300/20 to-transparent" aria-hidden="true" />

      <Container size="wide" className="relative z-10 flex flex-col gap-10">
        {/* En-tête du bloc */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold text-gold-strong">
              Le marketplace en direct
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-midnight-950 sm:text-5xl">
              De vrais commerces, de vrais produits.
            </h2>
            <p className="mt-3 text-base sm:text-lg leading-relaxed text-ink-600">
              Parcourez les catégories, les nouveautés et les boutiques partenaires. Ouvrez un produit ou une boutique en un clic.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-midnight-950 px-6 text-base font-bold text-gold-300 transition-all duration-200 hover:bg-midnight-800 active:scale-[0.98]"
          >
            Tout explorer
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>

        {/* Catégories visuelles réelles */}
        <MarketplaceCategories activeCategory={category} onChange={setCategory} />

        {/* Rangées de produits + boutiques */}
        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <MarketplaceLatestProducts />
          </aside>
          <div className="col-span-12 flex flex-col gap-12 lg:col-span-9">
            <MarketplaceCatalogue category={category} onClearCategory={() => setCategory(null)} />
            <MarketplaceShops />
          </div>
        </div>
      </Container>
    </section>
  );
}
