"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { shopsApi } from "@/lib/api";
import type { ApiBoutiqueCard } from "@/lib/api/types";
import ShopCard from "@/components/client/ShopCard";
import { EmptyState } from "@/components/client/ui/EmptyState";
import { GridSkeleton } from "@/components/client/ui/Skeleton";
import { IconAlert, IconSearch, IconStore, IconX } from "@/components/client/icons";
import { Tabs } from "@/components/client/ui/Tabs";

/** Filtrer les cartes par catégorie — « all » = toutes. */
type CategoryFilter = "all" | string;

/**
 * 🛍️ Boutiques — le catalogue complet des boutiques de la plateforme.
 * Recherche (client) + filtre par catégorie (serveur) + cartes vers la vraie
 * vitrine `/boutique/[slug]`. C'est la porte du futur Marketplace.
 */
export default function BoutiquesPage() {
  const [shops, setShops] = useState<ApiBoutiqueCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [searching, setSearching] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setShops(null);
    shopsApi
      .publicList()
      .then(setShops)
      .catch(() => setError("Impossible de charger les boutiques pour le moment."));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  // Catégories disponibles (depuis les cartes) pour le filtre
  const categories = useMemo(() => {
    const set = new Set<string>();
    (shops ?? []).forEach((s) => s.category && set.add(s.category));
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [shops]);

  // Recherche locale sur nom / description / tagline / ville / catégorie
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (shops ?? []).filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (!q) return true;
      return [s.name, s.description, s.tagline, s.city, s.country, s.category]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [shops, query, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    window.setTimeout(() => setSearching(false), 400);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* En-tête + recherche */}
      <section>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-600">
          Le catalogue de la plateforme
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-midnight-950">
          Boutiques
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-midnight-950/55">
          Toutes les boutiques disponibles : cherchez, filtrez et explorez
          celle qui vous plaît.
        </p>

        <form
          onSubmit={handleSubmit}
          role="search"
          className="mt-5 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-midnight-950/12 bg-white p-2 shadow-sm transition-colors focus-within:border-gold-400/60"
        >
          <IconSearch className="ml-2 h-5 w-5 shrink-0 text-gold-600" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une boutique, une ville, une spécialité…"
            aria-label="Rechercher une boutique"
            className="h-11 w-full bg-transparent text-sm text-midnight-950 placeholder:text-midnight-950/35 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-midnight-950/45 transition-colors hover:bg-midnight-950/5"
            >
              <IconX className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="h-11 shrink-0 cursor-pointer rounded-xl bg-midnight-950 px-5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
          >
            Rechercher
          </button>
        </form>
      </section>

      {/* Filtre par catégorie */}
      {categories.length > 0 && (
        <Tabs
          tabs={[
            { value: "all", label: "Toutes", count: shops?.length ?? 0 },
            ...categories.map((c) => ({
              value: c,
              label: c,
              count: (shops ?? []).filter((s) => s.category === c).length,
            })),
          ]}
          value={category}
          onChange={setCategory}
        />
      )}

      {/* États */}
      {error ? (
        <EmptyState
          icon={<IconAlert className="h-6 w-6" />}
          title="Impossible de charger les boutiques"
          description="Vérifiez votre connexion puis réessayez."
          action={
            <button
              type="button"
              onClick={load}
              className="rounded-full bg-midnight-950 px-5 py-2.5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
            >
              Réessayer
            </button>
          }
        />
      ) : shops === null || searching ? (
        <GridSkeleton count={3} tall />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconStore className="h-6 w-6" />}
          title="Aucune boutique trouvée"
          description={
            query
              ? `Rien ne correspond à « ${query} »${category !== "all" ? ` dans ${category}` : ""}. Essayez un autre terme.`
              : "Aucune boutique dans cette catégorie pour le moment."
          }
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="rounded-full border border-midnight-950/15 px-5 py-2.5 text-sm font-semibold text-midnight-950/70 transition-colors hover:border-gold-400/60"
            >
              Réinitialiser les filtres
            </button>
          }
        />
      ) : (
        <>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-midnight-950/40">
            {filtered.length} boutique{filtered.length > 1 ? "s" : ""}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
