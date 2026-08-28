"use client";

import { useCallback, useEffect, useState } from "react";
import { catalogueApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CategoryChip {
  name: string;
  slug: string;
  count: number;
}

const CategoryIcon = ({ name, className }: { name: string; className?: string }) => {
  const n = name.toLowerCase();
  if (n.includes("électronique") || n.includes("téléphone") || n.includes("informatique")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  if (n.includes("mode") || n.includes("vêtement") || n.includes("chaussure")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    );
  }
  if (n.includes("maison") || n.includes("décoration")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    );
  }
  if (n.includes("santé") || n.includes("beauté")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    );
  }
  if (n.includes("alimentation") || n.includes("nourriture") || n.includes("épicerie")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
  }
  if (n.includes("sport") || n.includes("loisir")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (n.includes("bijou") || n.includes("montre")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  
  // Generic icon
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
};

export default function MarketplaceCategories({
  activeCategory,
  onChange,
}: {
  activeCategory: string | null;
  onChange: (category: string | null) => void;
}) {
  const [categories, setCategories] = useState<CategoryChip[] | null>(null);

  // Catégories RÉELLES du catalogue global : le backend agrège les comptes de
  // produits actifs sur toutes les boutiques ACTIVE (GET /products/public/categories).
  const load = useCallback(() => {
    catalogueApi
      .categoriesGlobal()
      .then((cats) => setCategories(cats.slice(0, 9)))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  if (categories === null || categories.length === 0) return null;

  return (
    <section id="marketplace-categories" aria-label="Filtrer par catégorie" className="scroll-mt-24">
      <div className="mb-4 flex flex-col items-center sm:items-start">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-700">
          Notre catalogue
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-midnight-950">
          Explorer par catégorie
        </h2>
      </div>

      <div className="flex overflow-x-auto pb-4 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 hide-scrollbar">
        {/* "Tout" Card */}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "group flex min-w-[140px] flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center transition-all cursor-pointer",
            activeCategory === null
              ? "border-midnight-950 bg-midnight-950 shadow-md"
              : "border-midnight-950/8 bg-white hover:-translate-y-0.5 hover:border-gold-400/50 hover:shadow-md"
          )}
        >
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            activeCategory === null ? "bg-white/10 text-gold-300" : "bg-gold-400/10 text-gold-600"
          )}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className={cn(
              "text-sm font-semibold",
              activeCategory === null ? "text-white" : "text-midnight-950"
            )}>
              Tout explorer
            </span>
            <span className={cn(
              "font-mono text-[10px]",
              activeCategory === null ? "text-gold-300" : "text-midnight-950/70"
            )}>
              ---
            </span>
          </div>
        </button>

        {/* Category Cards */}
        {categories.map((cat) => {
          const active = activeCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onChange(active ? null : cat.slug)}
              aria-pressed={active}
              className={cn(
                "group flex min-w-[140px] flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center transition-all cursor-pointer",
                active
                  ? "border-midnight-950 bg-midnight-950 shadow-md"
                  : "border-midnight-950/8 bg-white hover:-translate-y-0.5 hover:border-gold-400/50 hover:shadow-md"
              )}
            >
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                active ? "bg-white/10 text-gold-300" : "bg-gold-400/10 text-gold-600 group-hover:bg-gold-400/20"
              )}>
                <CategoryIcon name={cat.name} className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className={cn(
                  "text-sm font-semibold",
                  active ? "text-white" : "text-midnight-950"
                )}>
                  {cat.name}
                </span>
                <span className={cn(
                  "font-mono text-[10px]",
                  active ? "text-gold-300" : "text-midnight-950/70"
                )}>
                  {cat.count} produit{cat.count > 1 ? "s" : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
