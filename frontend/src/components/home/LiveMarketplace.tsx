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
    <section id="marketplace" className="bg-paper py-14 sm:py-20">
      <Container size="wide" className="flex flex-col gap-10">
        {/* En-tête du bloc */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold-strong">
              Le marketplace, en direct
            </span>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-midnight-950 sm:text-4xl">
              De vrais commerces, de vrais produits.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">
              Parcourez les catégories, les nouveautés et les boutiques
              partenaires. Ouvrez un produit ou une boutique en un clic.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-midnight-950 px-5 text-sm font-semibold text-gold-300 transition-colors hover:bg-midnight-800"
          >
            Tout explorer
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
