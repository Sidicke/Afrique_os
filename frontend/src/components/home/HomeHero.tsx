"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { catalogueApi, shopsApi } from "@/lib/api";
import type { ApiCategoryCount } from "@/lib/api/types";
import SearchAutocomplete from "@/components/search/SearchAutocomplete";
import {
  IconZap,
  IconPackage,
  IconCreditCard,
  IconGlobe,
  IconCheck,
} from "@/components/client/icons";
import { useTranslation } from "@/lib/i18n";

const TRUST_ITEMS = [
  { icon: IconZap, label: "Boutique en ligne en 5 min" },
  { icon: IconPackage, label: "Gestion commandes & stock" },
  { icon: IconCreditCard, label: "Mobile Money & Cartes" },
  { icon: IconGlobe, label: "Marketplace connecté" },
];

export default function HomeHero() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<ApiCategoryCount[]>([]);
  const [stats, setStats] = useState<{ shops: number; products: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    catalogueApi
      .categoriesGlobal()
      .then((cats) => { if (!cancelled) setCategories(cats.slice(0, 7)); })
      .catch(() => { if (!cancelled) setCategories([]); });
    Promise.all([shopsApi.publicList(), catalogueApi.allProducts({ limit: 1 })])
      .then(([shops, page]) => {
        if (!cancelled) setStats({ shops: shops.length, products: page.pagination.total });
      })
      .catch(() => { if (!cancelled) setStats(null); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-midnight-950 pb-12 pt-24 sm:pb-16 sm:pt-32"
    >
      {/* Halo or + grille d'ambiance purement CSS (performant, 0 lag sur mobile) */}
      <div className="gold-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-gold-400/18 via-gold-300/6 to-transparent blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-40 top-1/2 h-[350px] w-[350px] -translate-y-1/2 rounded-full bg-blue-600/5 blur-[90px]" aria-hidden="true" />

      <Container size="wide" className="relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          {/* Headline principale */}
          <h1 className="font-display text-4xl min-[400px]:text-5xl sm:text-6xl lg:text-[82px] font-bold leading-[1.08] tracking-tight text-ivory-50 drop-shadow-[0_4px_30px_rgba(212,175,55,0.15)]">
            <span className="block">
              {t.hero.titleLine1}
            </span>
            <span className="block bg-gradient-to-r from-gold-300 via-gold-400 to-gold-200 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(212,175,55,0.4)]">
              {t.hero.titleLine2}
            </span>
          </h1>

          {/* Sous-titre percutant */}
          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-2xl leading-relaxed text-ivory-50/75 px-2 font-normal">
            {t.hero.subtitle}
          </p>

          {/* Barre de recherche */}
          <div className="mx-auto mt-8 max-w-2xl">
            <SearchAutocomplete
              variant="hero"
              placeholder={t.hero.searchPlaceholder}
            />
          </div>

          {/* Catégories chips */}
          {categories.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/recherche?category=${encodeURIComponent(cat.slug)}`}
                  className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-medium text-ivory-50/85 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-400/60 hover:bg-gold-400/10 hover:text-gold-300"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          {/* CTAs principaux */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/inscription?role=seller"
              className="group relative inline-flex min-h-[58px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-gold-400 to-gold-300 px-10 text-lg font-extrabold text-midnight-950 shadow-[0_8px_32px_rgba(212,175,55,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(212,175,55,0.45)] active:scale-[0.98] sm:w-auto"
            >
              <span className="relative z-10 flex items-center gap-2.5">
                {t.hero.ctaOpenStore}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {/* Shimmer animé */}
              <span className="absolute inset-0 -translate-x-full skew-x-[-15deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Link>

            <Link
              href="/marketplace"
              className="inline-flex min-h-[58px] w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-9 text-base font-bold text-ivory-50/90 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-400/50 hover:bg-gold-400/8 active:scale-[0.98] sm:w-auto"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M3 9l1.5-5h15L21 9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v9h14v-9" />
              </svg>
              {t.hero.ctaExplore}
            </Link>
          </div>

          {/* Rassurances micro-texte */}
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 font-mono text-xs sm:text-sm uppercase tracking-[0.14em] text-ivory-50/60 animate-in fade-in duration-300 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <IconCheck className="h-4 w-4 text-gold-400" />
              {t.hero.trust2}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheck className="h-4 w-4 text-gold-400" />
              {t.hero.trust1}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheck className="h-4 w-4 text-gold-400" />
              {t.hero.trust3}
            </span>
          </p>

          {/* Bande de preuves — 4 items */}
          <div className="mt-12 sm:mt-14 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4 animate-in fade-in duration-300">
            {TRUST_ITEMS.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 sm:gap-3 rounded-xl border border-white/8 bg-white/4 px-3.5 py-3 sm:px-4 sm:py-3.5 backdrop-blur-sm min-w-0 transition-colors duration-150 hover:border-gold-400/20 hover:bg-white/6"
                >
                  <IconComp className="h-5 w-5 text-gold-400 shrink-0" />
                  <span className="text-left text-xs sm:text-sm font-semibold leading-tight text-ivory-50/85 truncate sm:whitespace-normal">{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* Stats réelles */}
          {stats && (stats.shops > 0 || stats.products > 0) && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 font-mono text-xs sm:text-sm uppercase tracking-[0.14em] text-ivory-50/60 animate-in fade-in duration-300 font-medium">
              <span className="flex items-center gap-2.5 rounded-full border border-gold-400/15 bg-gold-400/8 px-5 py-2 backdrop-blur-md">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" aria-hidden="true" />
                <span className="text-ivory-50 font-semibold">
                  {stats.shops} {t.hero.activeShops}
                </span>
              </span>
              <span className="flex items-center gap-2.5 rounded-full border border-gold-400/15 bg-gold-400/8 px-5 py-2 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                <span className="text-ivory-50 font-semibold">
                  {stats.products.toLocaleString()} {t.hero.products}
                </span>
              </span>
            </div>
          )}
        </div>
      </Container>

      {/* Ligne de transition vers le marketplace */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-400/25 to-transparent" />
    </section>
  );
}
