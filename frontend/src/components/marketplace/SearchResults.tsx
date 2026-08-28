"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { searchApi } from "@/lib/api";
import type { ApiBoutiqueCard, ApiPublicProduct } from "@/lib/api/types";
import ProductCard from "@/components/client/ProductCard";
import ShopCard from "@/components/client/ShopCard";
import { GridSkeleton } from "@/components/client/ui/Skeleton";
import { EmptyState } from "@/components/client/ui/EmptyState";
import { IconAlert, IconSearch, IconStore } from "@/components/client/icons";

/**
 * Résultats de la recherche globale (moteur backend GET /search) —
 * boutiques + produits, toutes boutiques ACTIVE. URL partageable
 * (/recherche?q=…) : la recherche est une vraie page, pas un gadget.
 */
export default function SearchResults() {
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim();

  const [boutiques, setBoutiques] = useState<ApiBoutiqueCard[] | null>(null);
  const [produits, setProduits] = useState<ApiPublicProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const load = useCallback(() => {
    if (!q) return;
    setLoading(true);
    setError(null);
    setBoutiques(null);
    setProduits(null);
    searchApi
      .global(q)
      .then((res) => {
        setBoutiques(res.boutiques);
        setProduits(res.produits);
      })
      .catch(() => setError("La recherche est indisponible pour le moment."))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const t = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(t);
  }, [load, retryKey]);

  const total =
    (boutiques?.length ?? 0) + (produits?.length ?? 0);

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-12 px-5 pb-14 pt-16 sm:pt-20 md:pb-20">
      {/* En-tête */}
      <section>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-600">
          Recherche marketplace
        </p>
        {q ? (
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-midnight-950 sm:text-3xl">
            Résultats pour «&nbsp;<span className="text-gold-700">{q}</span>&nbsp;»
          </h1>
        ) : (
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-midnight-950 sm:text-3xl">
            Recherche
          </h1>
        )}
        {!q && (
          <p className="mt-1.5 max-w-xl text-sm text-midnight-950/55">
            Saisissez un terme pour chercher parmi les produits, les boutiques
            et les catégories de la plateforme.
          </p>
        )}
        {q && !loading && !error && (
          <p className="mt-1.5 text-sm text-midnight-950/55">
            {total} résultat{total > 1 ? "s" : ""}
          </p>
        )}
      </section>

      {error ? (
        <EmptyState
          icon={<IconAlert className="h-6 w-6" />}
          title={error}
          action={
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="cursor-pointer rounded-full bg-midnight-950 px-5 py-2.5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
            >
              Réessayer
            </button>
          }
        />
      ) : loading ? (
        <GridSkeleton count={6} tall />
      ) : q && total === 0 ? (
        <EmptyState
          icon={<IconSearch className="h-6 w-6" />}
          title="Aucun résultat"
          description={`Rien ne correspond à « ${q} ». Essayez un autre terme, ou explorez le catalogue complet.`}
          action={
            <Link
              href="/marketplace"
              className="rounded-full bg-midnight-950 px-5 py-2.5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
            >
              Retour au marketplace
            </Link>
          }
        />
      ) : (
        <>
          {/* Boutiques trouvées */}
          {boutiques && boutiques.length > 0 && (
            <section aria-labelledby="search-shops-title">
              <h2
                id="search-shops-title"
                className="flex items-center gap-2 font-display text-lg font-bold text-midnight-950"
              >
                <IconStore className="h-4 w-4 text-gold-600" />
                Boutiques
                <span className="rounded-full bg-gold-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-gold-700">
                  {boutiques.length}
                </span>
              </h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {boutiques.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} />
                ))}
              </div>
            </section>
          )}

          {/* Produits trouvés */}
          {produits && produits.length > 0 && (
            <section aria-labelledby="search-products-title">
              <h2
                id="search-products-title"
                className="flex items-center gap-2 font-display text-lg font-bold text-midnight-950"
              >
                Produits
                <span className="rounded-full bg-gold-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-gold-700">
                  {produits.length}
                </span>
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {produits.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
