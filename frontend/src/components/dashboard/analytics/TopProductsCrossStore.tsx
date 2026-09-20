"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import Image from "next/image";

export interface CrossStoreProduct {
  id: string;
  name: string;
  storeName: string;
  revenue: number;
  salesCount?: number;
  units?: number;
  growth: number;
  image?: string;
}

export default function TopProductsCrossStore({ products = [] }: { products?: CrossStoreProduct[] }) {
  const { formatPrice } = useTranslation();

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gold-strong">Top Produits — Toutes boutiques</span>
      <p className="mt-1 text-sm text-ink-500 mb-5">Vos meilleures ventes consolidées sur l&apos;ensemble de vos boutiques.</p>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-ink-50/50 border border-dashed border-line">
          <span className="mb-2 text-3xl">📦</span>
          <p className="text-sm font-semibold text-ink-800">Aucune vente enregistrée sur cette période</p>
          <p className="text-xs text-ink-400 mt-1 max-w-xs">
            Les articles les plus vendus sur l&apos;ensemble de vos boutiques s&apos;afficheront ici dès vos premières commandes payées.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-0">
          {products.map((product, i) => {
            const count = product.salesCount ?? product.units ?? 0;
            return (
              <div
                key={product.id}
                className="flex items-center gap-4 border-b border-line py-3 last:border-0"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 font-mono text-xs font-bold text-ink-500">
                  {i + 1}
                </span>

                {product.image ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line bg-ink-50">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : null}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-950 truncate">{product.name}</p>
                  <p className="text-[11px] text-ink-400">{product.storeName} · {count} {count > 1 ? "unités" : "unité"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-sm font-bold text-ink-950">{formatPrice(product.revenue)}</p>
                  {product.growth !== 0 && (
                    <span className={cn(
                      "font-mono text-[10px] font-semibold",
                      product.growth >= 0 ? "text-green-600" : "text-red-500"
                    )}>
                      {product.growth >= 0 ? "▲" : "▼"} {Math.abs(product.growth)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

