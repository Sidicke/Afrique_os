"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export interface CrossStoreProduct {
  id: string;
  name: string;
  storeName: string;
  revenue: number;
  units: number;
  growth: number;
  image?: string;
}

const DEMO_PRODUCTS: CrossStoreProduct[] = [
  { id: "1", name: "Robe Wax Premium", storeName: "Boutique Principale", revenue: 485000, units: 34, growth: 22.1 },
  { id: "2", name: "Smartphone Itel S23", storeName: "Boutique Tech", revenue: 312000, units: 8, growth: -5.4 },
  { id: "3", name: "Sac en cuir artisanal", storeName: "Boutique Mode", revenue: 198000, units: 12, growth: 41.3 },
  { id: "4", name: "Parfum Arabesque", storeName: "Boutique Principale", revenue: 156000, units: 26, growth: 8.7 },
  { id: "5", name: "Chaussures Ankara", storeName: "Boutique Mode", revenue: 89000, units: 9, growth: -12.0 },
];

export default function TopProductsCrossStore({ products = DEMO_PRODUCTS }: { products?: CrossStoreProduct[] }) {
  const { formatPrice } = useTranslation();
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gold-strong">Top Produits — Toutes boutiques</span>
      <p className="mt-1 text-sm text-ink-500 mb-5">Vos meilleures ventes consolidées sur l&apos;ensemble de vos boutiques.</p>

      <div className="flex flex-col gap-0">
        {products.map((product, i) => (
          <div
            key={product.id}
            className="flex items-center gap-4 border-b border-line py-3 last:border-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 font-mono text-xs font-bold text-ink-500">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-950 truncate">{product.name}</p>
              <p className="text-[11px] text-ink-400">{product.storeName} · {product.units} unités</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-sm font-bold text-ink-950">{formatPrice(product.revenue)}</p>
              <span className={cn(
                "font-mono text-[10px] font-semibold",
                product.growth >= 0 ? "text-green-600" : "text-red-500"
              )}>
                {product.growth >= 0 ? "▲" : "▼"} {Math.abs(product.growth)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
