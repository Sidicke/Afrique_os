"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { catalogueApi, shopsApi } from "@/lib/api";
import type { ApiCategoryCount } from "@/lib/api/types";
import Container from "@/components/ui/Container";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface MarketplaceHeroProps {
  onSelectCategory?: (category: string) => void;
}

export default function MarketplaceHero({ onSelectCategory }: MarketplaceHeroProps = {}) {
  const { t } = useTranslation();
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
                          onClick={() => {
                            if (onSelectCategory) {
                              onSelectCategory(cat.slug);
                            } else {
                              router.push(`/recherche?category=${encodeURIComponent(cat.slug)}`);
                            }
                          }}
                          className="group flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-gold-wash/60 cursor-pointer"
                        >
                          <span className="text-sm font-medium text-ink-800 group-hover:text-midnight-950">
                            {cat.name}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-ink-600">
                              {cat.count}
                            </span>
                            <span className="text-xs font-mono font-semibold text-ink-600 group-hover:text-gold-strong">
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

          {/* CENTER HERO MAIN BANNER */}
          <div className={cn("flex flex-col gap-4", categoriesLoading || categories.length > 0 ? "lg:col-span-6" : "lg:col-span-9")}>
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#fbf8f2] via-[#fffdfa] to-[#f4ede3] p-6 sm:p-8 shadow-sm min-h-[380px]">
              <div className="absolute right-0 top-0 h-full w-1/2 opacity-25 pointer-events-none bg-[radial-gradient(#c4b697_1px,transparent_1px)] [background-size:16px_16px]" />
              
              <div className="relative z-10 max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-african-green/25 bg-african-green/5 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-african-green mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-african-green" aria-hidden="true" />
                  {t.marketplace.heroTag}
                </span>
                <h1 className="font-display text-2xl sm:text-4xl lg:text-[36px] font-extrabold tracking-tight text-midnight-950 leading-tight">
                  {t.marketplace.heroTitleAlt} <span className="text-terracotta">{t.marketplace.heroTitleHighlight}</span>
                </h1>
                <p className="mt-3 text-sm sm:text-base leading-relaxed text-midnight-950/80">
                  {t.marketplace.heroDesc}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="#marketplace-catalogue"
                    className="inline-flex items-center justify-center rounded-xl bg-midnight-950 px-6 py-3 text-sm font-bold text-gold-300 shadow-md transition-all hover:bg-midnight-800 active:scale-[0.98]"
                  >
                    {t.marketplace.heroExplore}
                  </Link>
                  <Link
                    href="#boutiques"
                    className="inline-flex items-center justify-center rounded-xl border border-midnight-950/15 bg-white/90 backdrop-blur-sm px-5 py-3 text-sm font-bold text-midnight-950 transition-all hover:bg-white hover:border-gold-400/50 active:scale-[0.98]"
                  >
                    {t.marketplace.heroSeeShops}
                  </Link>
                </div>
              </div>

              {/* Stat footer badge inside hero */}
              {stats && (
                <div className="relative z-10 mt-6 border-t border-line/80 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-mono text-midnight-950/75">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-african-green" aria-hidden="true" />
                    {stats.shops} {stats.shops > 1 ? t.marketplace.heroPartnerShops : t.marketplace.heroPartnerShops}
                  </span>
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-gold-500" aria-hidden="true" />
                    {stats.products.toLocaleString("fr-FR")} {t.marketplace.heroAvailableProducts}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT ACTION CARDS (Authentic platform shortcuts) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Card 1: Verified Boutiques */}
            <div className="flex flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#ebf5fb] to-[#f4fbf7] p-5 shadow-sm">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-african-green">
                  {t.marketplace.cardCertified}
                </span>
                <h3 className="font-display text-base font-bold text-midnight-950 mt-1">
                  {t.marketplace.cardVerifiedShops}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-midnight-950/75 leading-relaxed">
                  {t.marketplace.cardVerifiedDesc}
                </p>
              </div>
              <Link
                href="#boutiques"
                className="mt-4 inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-midnight-950 underline decoration-gold-400 underline-offset-4 hover:text-gold-strong"
              >
                {t.marketplace.cardDiscoverShops}
              </Link>
            </div>

            {/* Card 2: Mobile Money Sovereign Payments */}
            <div className="flex flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#fef5e7] to-[#fdf2e9] p-5 shadow-sm">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-terracotta">
                  {t.marketplace.cardSecurePayment}
                </span>
                <h3 className="font-display text-base font-bold text-midnight-950 mt-1">
                  {t.marketplace.cardMobileMoney}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-midnight-950/75 leading-relaxed">
                  {t.marketplace.cardPaymentDesc}
                </p>
              </div>
              <Link
                href="#marketplace-catalogue"
                className="mt-4 inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-midnight-950 underline decoration-terracotta underline-offset-4 hover:text-terracotta"
              >
                {t.marketplace.cardSeeAll}
              </Link>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}

