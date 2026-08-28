"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { catalogueApi, shopsApi } from "@/lib/api";
import type { ApiCategoryCount } from "@/lib/api/types";
import { IconSearch } from "@/components/client/icons";

/**
 * Hero compact de la homepage — expression de marque + phrase produit courte
 * + barre de recherche RÉELLE (vers /recherche) + accès catégories réelles.
 * CTA séparés : « Explorer le marketplace » (acheteur) / « Devenir partenaire ».
 * Aucun chiffre inventé : les stats ne s'affichent que si le backend répond.
 */
export default function HomeHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<ApiCategoryCount[]>([]);
  const [stats, setStats] = useState<{ shops: number; products: number } | null>(null);

  useEffect(() => {
    // Particules lumineuses légères (CSS-in-JS via DOM Node)
    const container = document.getElementById("hero-particles");
    if (!container) return;
    for (let i = 0; i < 12; i++) {
      const dot = document.createElement("div");
      dot.className = "absolute rounded-full bg-gradient-to-br from-gold-300/60 to-transparent blur-[2px]";
      const size = 6 + Math.random() * 14;
      dot.style.width = size + "px";
      dot.style.height = size + "px";
      dot.style.left = Math.random() * 100 + "%";
      dot.style.top = Math.random() * 100 + "%";
      dot.style.animation = `floaty ${5 + Math.random() * 7}s ease-in-out infinite alternate`;
      dot.style.animationDelay = Math.random() * 3 + "s";
      container.appendChild(dot);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    catalogueApi
      .categoriesGlobal()
      .then((cats) => { if (!cancelled) setCategories(cats.slice(0, 8)); })
      .catch(() => { if (!cancelled) setCategories([]); });
    Promise.all([shopsApi.publicList(), catalogueApi.allProducts({ limit: 1 })])
      .then(([shops, page]) => {
        if (!cancelled) setStats({ shops: shops.length, products: page.pagination.total });
      })
      .catch(() => { if (!cancelled) setStats(null); });
    return () => { cancelled = true; };
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/recherche?q=${encodeURIComponent(q)}` : "/marketplace");
  };

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-midnight-950 pb-16 pt-28 sm:pt-32"
    >
      {/* Particules lumineuses animées (CSS + JS léger) */}
      <div id="hero-particles" aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" />

      {/* Halo or massif + texture améliorée */}
      <div className="gold-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[640px] w-[980px] -translate-x-1/2 rounded-full bg-gradient-to-b from-gold-400/25 via-gold-300/10 to-transparent blur-[120px]" aria-hidden="true" />

      <Container size="wide" className="relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-300" aria-hidden="true" />
            Marketplace multi-vendeur · Afrique
          </span>

          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-ivory-50 sm:text-7xl lg:text-8xl drop-shadow-[0_4px_30px_rgba(212,175,55,0.25)]">
            <span className="block animate-in slide-in-from-bottom-5 duration-700">Votre commerce,</span>
            <span className="block animate-in slide-in-from-bottom-8 duration-700 delay-150 text-gold-300 drop-shadow-[0_0_40px_rgba(212,175,55,0.6)]">en pleine lumière.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ivory-50/70 sm:text-lg">
            Trouvez des produits, découvrez des boutiques et commandez en quelques clics, sans inscription obligatoire.
          </p>

          {/* Barre de recherche RÉELLE — Glassmorphism + glow */}
          <form onSubmit={submitSearch} className="mx-auto mt-10 flex max-w-2xl items-center gap-2 animate-in fade-in zoom-in-95 duration-700 delay-300">
            <div className="flex h-14 flex-1 items-center overflow-hidden rounded-2xl border border-gold-400/20 bg-white shadow-xl shadow-black/20">
              <span className="pl-4 text-ink-400">
                <IconSearch className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un produit, une boutique, une catégorie…"
                aria-label="Rechercher sur le marketplace"
                className="h-full flex-1 bg-transparent px-3 text-sm text-midnight-950 placeholder:text-ink-400 focus:outline-none focus:ring-0 sm:text-base"
              />
              <button
                type="submit"
                className="m-1.5 hidden h-11 items-center rounded-xl bg-gradient-to-r from-gold-400 to-gold-300 px-6 text-sm font-bold text-midnight-950 shadow-lg shadow-gold-400/30 transition-all duration-300 hover:scale-105 hover:shadow-gold-400/50 sm:flex"
              >
                Rechercher
              </button>
            </div>
            <button
              type="submit"
              aria-label="Rechercher"
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-500 text-midnight-950 shadow-xl shadow-gold-400/30 transition-all duration-300 hover:scale-110 hover:shadow-gold-400/60 sm:hidden"
            >
              <IconSearch className="h-5 w-5" />
            </button>
          </form>

          {/* Catégories réelles — chips glass interactifs */}
          {categories.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 animate-in fade-in duration-500 delay-500">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/recherche?category=${encodeURIComponent(cat.slug)}`}
                  className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-ivory-50/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/60 hover:bg-gold-400/10 hover:text-gold-300 hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          {/* CTA séparés — acheteur vs vendeur | Effet 3D hover */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-3 duration-700 delay-700">
            <Link
              href="/marketplace"
              className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-gold-400 to-gold-300 px-8 text-base font-extrabold text-midnight-950 shadow-[0_8px_30px_rgba(212,175,55,0.35)] transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(212,175,55,0.45)] sm:w-auto"
            >
              Explorer le marketplace
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link
              href="/inscription"
              className="inline-flex h-14 w-full items-center justify-center rounded-2xl border-2 border-gold-400/30 bg-white/5 px-8 text-base font-extrabold text-ivory-50 transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:border-gold-400/80 hover:bg-gold-400/10 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] sm:w-auto"
            >
              Ouvrir ma boutique
            </Link>
          </div>

          {/* Preuve réelle — stats avec glow */}
          {stats && (stats.shops > 0 || stats.products > 0) && (
            <div className="mt-8 flex items-center justify-center gap-8 font-mono text-[11px] uppercase tracking-[0.14em] text-ivory-50/60 animate-in fade-in duration-700 delay-1000">
              <span className="flex items-center gap-3 rounded-full border border-gold-400/10 bg-gold-400/5 px-5 py-2 shadow-inner shadow-white/5 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-african-green shadow-[0_0_8px_rgba(34,197,94,0.8)]" aria-hidden="true" />
                <span className="text-ivory-50 font-semibold">{stats.shops} boutiques actives</span>
              </span>
              <span className="flex items-center gap-3 rounded-full border border-gold-400/10 bg-gold-400/5 px-5 py-2 shadow-inner shadow-white/5 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />
                {stats.products.toLocaleString("fr-FR")} produits
              </span>
            </div>
          )}
        </div>

      </Container>
    </section>
  );
}
