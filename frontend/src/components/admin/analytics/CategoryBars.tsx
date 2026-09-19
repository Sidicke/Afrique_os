"use client";

import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { AdminCategoryPerformance } from "@/types/admin";

/**
 * Performance des catégories (doc 09 — §18) : GMV par catégorie en barres
 * horizontales + croissance — lisible, aucune librairie de graphique.
 */
export function CategoryBars({
  categories,
  loading,
}: {
  categories: AdminCategoryPerformance[] | undefined;
  loading: boolean;
}) {
  const { formatPrice } = useTranslation();
  const totalGmv = (categories ?? []).reduce((s, c) => s + c.gmvFcfa, 0);
  const maxGmv = Math.max(...(categories ?? []).map((c) => c.gmvFcfa), 1);

  return (
    <DashboardCard className="p-6">
      <CardHeader title="Performance par catégorie" subtitle="GMV et croissance sur la période" />
      {loading || !categories || categories.length === 0 ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
              <div className="h-4 w-full animate-pulse rounded bg-ink-100" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {categories.map((c) => (
            <li key={c.id}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-semibold text-ink-800">{c.name}</span>
                <span className="font-mono text-[10px] text-ink-500">
                  {formatPrice(c.gmvFcfa)}
                  <span
                    className={cn(
                      "ml-2 font-semibold",
                      c.growthPercent >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {c.growthPercent >= 0 ? "+" : ""}
                    {c.growthPercent} %
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    c.growthPercent >= 0 ? "bg-gold-strong" : "bg-red-400"
                  )}
                  style={{ width: `${Math.max(4, (c.gmvFcfa / maxGmv) * 100)}%` }}
                />
              </div>
              <p className="mt-1 font-mono text-[9px] text-ink-400">
                {c.storesCount} boutiques · {c.productsCount} produits · {c.ordersCount.toLocaleString("fr-FR")} commandes ·{" "}
                {totalGmv > 0 ? Math.round((c.gmvFcfa / totalGmv) * 100) : 0} % du GMV
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
