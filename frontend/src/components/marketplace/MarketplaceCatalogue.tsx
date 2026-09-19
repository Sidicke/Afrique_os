"use client";

import { useCallback, useEffect, useState } from "react";
import { catalogueApi } from "@/lib/api";
import type { ApiPublicProduct } from "@/lib/api/types";
import ProductCard from "@/components/client/ProductCard";
import { GridSkeleton } from "@/components/client/ui/Skeleton";
import { EmptyState } from "@/components/client/ui/EmptyState";
import { IconAlert, IconPackage } from "@/components/client/icons";
import { cn } from "@/lib/utils";

/** Tri du catalogue — chaque valeur existe CÔTÉ BACKEND (QueryProductsDto) */
type SortValue = "popular" | "newest" | "price_asc" | "price_desc";

const SORT_TABS: Array<{ value: SortValue; label: string }> = [
  { value: "popular", label: "Populaires" },
  { value: "newest", label: "Nouveautés" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
];

const PAGE_SIZE = 12;

export default function MarketplaceCatalogue({
  category,
  onClearCategory,
}: {
  category: string | null;
  onClearCategory: () => void;
}) {
  const [sort, setSort] = useState<SortValue>("popular");
  const [items, setItems] = useState<ApiPublicProduct[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (nextPage: number) => {
      if (nextPage === 1) {
        setLoading(true);
        setItems(null);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      catalogueApi
        .allProducts({
          sort,
          category: category ?? undefined,
          page: nextPage,
          limit: PAGE_SIZE,
        })
        .then((res) => {
          setItems((prev) =>
            nextPage === 1 ? res.items : [...(prev ?? []), ...res.items]
          );
          setTotal(res.pagination.total);
          setPage(nextPage);
        })
        .catch(() => {
          if (nextPage === 1)
            setError("Impossible de charger le catalogue pour le moment.");
        })
        .finally(() => {
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [sort, category]
  );

  useEffect(() => {
    const t = window.setTimeout(() => load(1), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const hasMore = (items?.length ?? 0) < total;

  return (
    <section id="marketplace-catalogue" aria-labelledby="marketplace-catalogue-title" className="scroll-mt-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-midnight-950/8 pb-3">
        <div className="inline-flex w-fit bg-terracotta/90 text-white rounded-lg px-4 py-2 font-bold uppercase text-xs sm:text-sm tracking-wider">
          {category ? "PRODUITS DE LA CATÉGORIE" : "PRODUITS TENDANCE"}
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSort(tab.value)}
              className={cn(
                "text-sm sm:text-base font-bold transition-colors pb-1 border-b-2 cursor-pointer",
                sort === tab.value
                  ? "text-terracotta border-terracotta"
                  : "text-midnight-950/60 hover:text-midnight-950 border-transparent"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {category && (
        <div className="mt-6 mb-2 inline-flex items-center gap-2 rounded-full bg-midnight-950/5 px-3 py-1.5 text-sm text-midnight-950">
          <span className="font-semibold">Filtre:</span> {category}
          <button
            onClick={onClearCategory}
            className="ml-1 flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 hover:text-terracotta"
          >
            ✕
          </button>
        </div>
      )}

      {error ? (
        <EmptyState
          icon={<IconAlert className="h-6 w-6" />}
          title="Impossible de charger le catalogue"
          action={
            <button
              type="button"
              onClick={() => load(1)}
              className="cursor-pointer rounded-full bg-midnight-950 px-5 py-2.5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
            >
              Réessayer
            </button>
          }
          className="mt-6"
        />
      ) : items === null || loading ? (
        <GridSkeleton count={8} className="mt-6" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<IconPackage className="h-6 w-6" />}
          title="Aucun produit dans cette catégorie"
          description={
            category
              ? "Essayez une autre catégorie ou affinez votre recherche."
              : "Aucun produit disponible pour le moment. Revenez bientôt !"
          }
          action={
            category ? (
              <button
                type="button"
                onClick={onClearCategory}
                className="cursor-pointer rounded-full bg-midnight-950 px-5 py-2.5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
              >
                Voir tout le catalogue
              </button>
            ) : undefined
          }
          className="mt-6"
        />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => load(page + 1)}
                disabled={loadingMore}
                className="cursor-pointer rounded-full bg-midnight-950 px-8 py-3.5 text-sm font-bold text-gold-300 transition-all hover:scale-105 hover:bg-midnight-800 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100"
              >
                {loadingMore ? "Chargement…" : "Voir plus de produits"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
