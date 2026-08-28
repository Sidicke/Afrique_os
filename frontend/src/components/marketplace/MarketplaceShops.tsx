"use client";

import { useCallback, useEffect, useState } from "react";
import { shopsApi } from "@/lib/api";
import type { ApiBoutiqueCard } from "@/lib/api/types";
import ShopCard from "@/components/client/ShopCard";
import { GridSkeleton } from "@/components/client/ui/Skeleton";
import { EmptyState } from "@/components/client/ui/EmptyState";
import { IconAlert, IconStore } from "@/components/client/icons";

const PAGE_SIZE = 8;

/**
 * Boutiques du marketplace — TOUTES les boutiques ACTIVE de la plateforme,
 * sans obligation de compte. Pagination client (Voir plus) : on ne charge
 * jamais la liste entière dans le DOM d'un coup.
 */
export default function MarketplaceShops() {
  const [shops, setShops] = useState<ApiBoutiqueCard[] | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);

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

  const shown = (shops ?? []).slice(0, visible);

  return (
    <section
      id="boutiques"
      aria-labelledby="marketplace-shops-title"
      className="scroll-mt-24"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-700">
            Boutiques disponibles
          </p>
          <h2
            id="marketplace-shops-title"
            className="mt-1 font-display text-2xl font-bold text-midnight-950 sm:text-3xl"
          >
            Nos commerces partenaires
          </h2>
          <p className="mt-1.5 max-w-xl text-sm text-midnight-950/70">
            Chaque boutique est un commerce à part entière : ouvrez-la pour
            découvrir son catalogue, sa livraison et discuter avec le vendeur.
          </p>
        </div>
        {shops && (
          <span className="shrink-0 rounded-full bg-gold-400/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-gold-700">
            {shops.length} boutique{shops.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {error ? (
        <EmptyState
          icon={<IconAlert className="h-6 w-6" />}
          title="Impossible de charger les boutiques"
          action={
            <button
              type="button"
              onClick={load}
              className="cursor-pointer rounded-full bg-midnight-950 px-5 py-2.5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
            >
              Réessayer
            </button>
          }
          className="mt-6"
        />
      ) : shops === null ? (
        <GridSkeleton count={4} tall className="mt-6" />
      ) : shops.length === 0 ? (
        <EmptyState
          icon={<IconStore className="h-6 w-6" />}
          title="Aucune boutique disponible pour le moment"
          description="Revenez bientôt : les commerces rejoignent progressivement la plateforme."
          className="mt-6"
        />
      ) : (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
          {shown.length < shops.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="cursor-pointer rounded-full border border-midnight-950/15 bg-white px-6 py-3 text-sm font-bold text-midnight-950 transition-all hover:border-gold-400/60 hover:text-gold-700"
              >
                Voir plus de boutiques
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
