"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { catalogueApi, shopsApi } from "@/lib/api";
import type { ApiCategoryCount } from "@/lib/api/types";
import Container from "@/components/ui/Container";
import { cn } from "@/lib/utils";

export default function MarketplaceHero() {
  const router = useRouter();
  const [stats, setStats] = useState<{ shops: number; products: number } | null>(null);
  // Menu « Toutes les catégories » — catégories RÉELLES du catalogue global
  // (nom + slug + nombre de produits actifs), jamais de comptes codés en dur.
  const [categories, setCategories] = useState<ApiCategoryCount[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([shopsApi.publicList(), catalogueApi.allProducts({ limit: 1 })])
      .then(([shops, page]) => {
        if (!cancelled) setStats({ shops: shops.length, products: page.pagination.total });
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    catalogueApi
      .categoriesGlobal()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="bg-paper pb-8 pt-20 sm:pt-24">
      <Container size="wide">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          
          {/* LEFT SIDEBAR: MENU DÉPARTEMENTS (Desktop only — catégories réelles du backend) */}
          {categoriesLoading || categories.length > 0 ? (
            <div className="hidden lg:block lg:col-span-3">
              <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
                <div className="flex items-center gap-2.5 bg-midnight-950 px-4 py-3 text-white">
                  <svg className="h-5 w-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-gold-300">
                    TOUTES LES CATÉGORIES
                  </span>
                </div>
                {categoriesLoading ? (
                  <ul className="divide-y divide-line/60">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <li key={i} className="flex items-center justify-between px-3.5 py-3">
                        <span className="h-3 w-24 animate-pulse rounded bg-ink-100" />
                        <span className="h-3 w-3 animate-pulse rounded bg-ink-100" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="divide-y divide-line/60">
                    {categories.map((cat) => (
                      <li key={cat.slug}>
                        <button
                          type="button"
                          onClick={() => router.push(`/recherche?category=${encodeURIComponent(cat.slug)}`)}
                          className="group flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-gold-wash/60"
                        >
                          <span className="text-xs font-medium text-ink-800 group-hover:text-midnight-950">
                            {cat.name}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-semibold text-ink-600">
                              {cat.count}
                            </span>
                            <span className="text-[10px] font-mono font-semibold text-ink-600 group-hover:text-gold-strong">
                              ›
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          {/* CENTER HERO MAIN BANNER (Like eMarket Office Furniture Banner) */}
          <div className={cn("flex flex-col gap-4", categoriesLoading || categories.length > 0 ? "lg:col-span-6" : "lg:col-span-9")}>
            <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-line bg-gradient-to-r from-[#fef5e7] via-[#fffdf9] to-[#f9ede1] p-6 shadow-sm min-h-[360px]">
              <div className="absolute right-0 top-0 h-full w-1/2 opacity-25 pointer-events-none bg-[radial-gradient(#c4b697_1px,transparent_1px)] [background-size:16px_16px]" />
              
              <div className="relative z-10 max-w-md">
                <span className="inline-block rounded-md bg-gold-400/20 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-gold-strong mb-2">
                  Mobilier &amp; Décoration d&apos;Intérieur
                </span>
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-midnight-950 sm:text-4xl">
                  SOLDE JUSQU&apos;À <span className="text-terracotta">50% DE RÉDUCTION</span>
                </h1>
                <p className="mt-2 text-xs leading-relaxed text-ink-600 sm:text-sm">
                  Découvrez la meilleure sélection de meubles et produits haut de gamme pour équiper vos bureaux et espaces de travail.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <Link
                    href="/marketplace#boutiques"
                    className="inline-flex items-center justify-center rounded-lg bg-midnight-950 px-6 py-2.5 text-xs font-bold text-gold-300 shadow-md transition-all hover:bg-midnight-800 hover:shadow-lg"
                  >
                    ACHETER MAINTENANT
                  </Link>
                  <span className="text-[11px] font-semibold text-ink-500">
                    Offre limitée
                  </span>
                </div>
              </div>

              {/* Stat footer badge inside hero */}
              {stats && (
                <div className="relative z-10 mt-6 border-t border-line/80 pt-3 flex items-center justify-between text-[11px] font-mono text-ink-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-african-green" aria-hidden="true" />
                    {stats.shops} Boutiques Actives
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />
                    {stats.products.toLocaleString("fr-FR")} Produits Disponibles
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PROMO CARDS (2 Stacked banners like eMarket image) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Card 1: Colorful Pillows */}
            <div className="flex flex-1 flex-col justify-between overflow-hidden rounded-xl border border-line bg-gradient-to-br from-[#ebf5fb] to-[#e8f8f5] p-4 shadow-sm">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  Coussins & Textiles
                </span>
                <h3 className="font-display text-sm font-bold text-midnight-950 mt-0.5">
                  Coussins Colorés Design
                </h3>
                <p className="mt-1 font-mono text-xs font-bold text-terracotta">
                  À partir de <span className="text-sm font-extrabold">15.000 FCFA</span>
                </p>
              </div>
              <button
                onClick={() => router.push('/recherche?q=Coussin')}
                className="mt-3 w-fit text-[11px] font-bold text-midnight-950 underline decoration-gold-400 underline-offset-4 hover:text-gold-strong"
              >
                Découvrir →
              </button>
            </div>

            {/* Card 2: Interior Design Sofa */}
            <div className="flex flex-1 flex-col justify-between overflow-hidden rounded-xl border border-line bg-gradient-to-br from-[#fef5e7] to-[#fdedec] p-4 shadow-sm">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  Architecture d&apos;Intérieur
                </span>
                <h3 className="font-display text-sm font-bold text-midnight-950 mt-0.5">
                  Salons & Canapés Modernes
                </h3>
                <p className="mt-1 font-mono text-xs font-bold text-gold-strong">
                  Collection Exclusive 2026
                </p>
              </div>
              <button
                onClick={() => router.push('/recherche?q=Salon')}
                className="mt-3 w-fit text-[11px] font-bold text-midnight-950 underline decoration-terracotta underline-offset-4 hover:text-terracotta"
              >
                Voir le catalogue →
              </button>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}

