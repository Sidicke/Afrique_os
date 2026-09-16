"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

const TRUST_ITEMS = [
  { icon: IconZap, label: "Boutique en ligne en 10 min" },
  { icon: IconPackage, label: "Gestion commandes & stock" },
  { icon: IconCreditCard, label: "Mobile Money intégré" },
  { icon: IconGlobe, label: "Marketplace africain" },
];



export default function HomeHero() {
  const [categories, setCategories] = useState<ApiCategoryCount[]>([]);
  const [stats, setStats] = useState<{ shops: number; products: number } | null>(null);


  useEffect(() => {
    // Particules lumineuses légères
    const container = document.getElementById("hero-particles");
    if (!container) return;
    for (let i = 0; i < 18; i++) {
      const dot = document.createElement("div");
      dot.className = "absolute rounded-full bg-gradient-to-br from-gold-300/50 to-transparent blur-[2px]";
      const size = 4 + Math.random() * 16;
      dot.style.width = size + "px";
      dot.style.height = size + "px";
      dot.style.left = Math.random() * 100 + "%";
      dot.style.top = Math.random() * 100 + "%";
      dot.style.animation = `floaty ${5 + Math.random() * 8}s ease-in-out infinite alternate`;
      dot.style.animationDelay = Math.random() * 4 + "s";
      container.appendChild(dot);
    }
  }, []);

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
      className="relative overflow-hidden bg-midnight-950 pb-20 pt-28 sm:pt-36"
    >
      {/* Particules */}
      <div id="hero-particles" aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" />

      {/* Halo or + grille */}
      <div className="gold-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-b from-gold-400/22 via-gold-300/8 to-transparent blur-[130px]" aria-hidden="true" />
      {/* Halo latéral gauche */}
      <div className="pointer-events-none absolute -left-40 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-blue-600/5 blur-[100px]" aria-hidden="true" />

      <Container size="wide" className="relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          {/* Headline principale — impact maximal */}
          <h1 className="font-display text-3xl min-[400px]:text-4xl sm:text-6xl lg:text-[88px] font-bold leading-[1.04] tracking-tight text-ivory-50 drop-shadow-[0_4px_40px_rgba(212,175,55,0.2)]">
            <span className="block animate-in slide-in-from-bottom-6 duration-700">
              Donnez à votre commerce
            </span>
            <span className="block animate-in slide-in-from-bottom-8 duration-700 delay-100 bg-gradient-to-r from-gold-300 via-gold-400 to-gold-200 bg-clip-text text-transparent drop-shadow-[0_0_50px_rgba(212,175,55,0.5)]">
              la vitrine qu&apos;il mérite.
            </span>
          </h1>

          {/* Sous-titre percutant */}
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-xl leading-relaxed text-ivory-50/65 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-200 px-2">
            Créez votre boutique professionnelle en <strong className="text-ivory-50/90 font-semibold">quelques minutes</strong>. Présentez vos articles, encaissez par Mobile Money et développez vos ventes en toute simplicité.
          </p>



          {/* Barre de recherche */}
          <div className="mx-auto mt-10 max-w-2xl animate-in fade-in zoom-in-95 duration-700 delay-300">
            <SearchAutocomplete
              variant="hero"
              placeholder="Rechercher un produit, une boutique, une catégorie…"
            />
          </div>

          {/* Catégories chips */}
          {categories.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 animate-in fade-in duration-500 delay-500">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/recherche?category=${encodeURIComponent(cat.slug)}`}
                  className="rounded-full border border-white/10 bg-white/8 px-4 py-1.5 text-xs font-medium text-ivory-50/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/60 hover:bg-gold-400/10 hover:text-gold-300"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          {/* CTAs principaux */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-3 duration-700 delay-500">
            <Link
              href="/inscription"
              className="group relative inline-flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-gold-400 to-gold-300 px-9 text-base font-extrabold text-midnight-950 shadow-[0_8px_32px_rgba(212,175,55,0.4)] transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_14px_44px_rgba(212,175,55,0.5)] sm:w-auto"
            >
              <span className="relative z-10 flex items-center gap-2.5">
                Lancer ma boutique en ligne
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {/* Shimmer animé */}
              <span className="absolute inset-0 -translate-x-full skew-x-[-15deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Link>

            <Link
              href="/marketplace"
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-8 text-sm font-semibold text-ivory-50/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/50 hover:bg-gold-400/8 sm:w-auto"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M3 9l1.5-5h15L21 9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v9h14v-9" />
              </svg>
              Explorer le marketplace
            </Link>
          </div>

          {/* Rassurances micro-texte */}
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ivory-50/50 animate-in fade-in duration-700 delay-700">
            <span className="inline-flex items-center gap-1.5">
              <IconCheck className="h-3.5 w-3.5 text-gold-400" />
              Sans carte bancaire
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheck className="h-3.5 w-3.5 text-gold-400" />
              Sans engagement
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheck className="h-3.5 w-3.5 text-gold-400" />
              0 FCFA pour commencer
            </span>
          </p>

          {/* Bande de preuves — 4 items */}
          <div className="mt-14 grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-700">
            {TRUST_ITEMS.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 sm:gap-2.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 sm:px-4 sm:py-3 backdrop-blur-sm min-w-0"
                >
                  <IconComp className="h-4 w-4 sm:h-5 sm:w-5 text-gold-400 shrink-0" />
                  <span className="text-left text-[10px] sm:text-[11px] font-medium leading-tight text-ivory-50/80 truncate sm:whitespace-normal">{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* Stats réelles */}
          {stats && (stats.shops > 0 || stats.products > 0) && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ivory-50/50 animate-in fade-in duration-700 delay-1000">
              <span className="flex items-center gap-2.5 rounded-full border border-gold-400/12 bg-gold-400/6 px-4 sm:px-5 py-1.5 sm:py-2 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" aria-hidden="true" />
                <span className="text-ivory-50/80 font-semibold">{stats.shops} boutiques actives</span>
              </span>
              <span className="flex items-center gap-2.5 rounded-full border border-gold-400/12 bg-gold-400/6 px-4 sm:px-5 py-1.5 sm:py-2 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                {stats.products.toLocaleString("fr-FR")} produits
              </span>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
