"use client";

import { useState } from "react";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { AdminOrderVolumePoint } from "@/types/admin";

type Metric = "orders" | "gmv";

/**
 * Évolution du volume de commandes et du GMV (doc 07 — §8/§9) sur la période.
 * Graphique SVG sobre, sans librairie — le comparatif Volume/GMV permet de
 * détecter une divergence (panier moyen, doc 07 §9).
 */
export function OrdersVolumeChart({
  volume,
  loading,
}: {
  volume: AdminOrderVolumePoint[] | undefined;
  loading: boolean;
}) {
  const { formatPrice } = useTranslation();

  const [metric, setMetric] = useState<Metric>("orders");

  if (loading || !volume || volume.length === 0) {
    return (
      <DashboardCard className="p-6">
        <CardHeader title="Order volume" subtitle="Évolution sur la période" />
        <div className="mt-4 flex h-52 items-end gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 rounded-t-lg" />
          ))}
        </div>
      </DashboardCard>
    );
  }

  const values = volume.map((p) => (metric === "orders" ? p.orders : p.gmvFcfa));
  const max = Math.max(...values, 1);
  const maxOrders = Math.max(...volume.map((p) => p.orders), 1);

  return (
    <DashboardCard className="p-6">
      <CardHeader
        title="Order volume"
        subtitle="Évolution des commandes et du GMV sur les 14 derniers jours"
        action={
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
            {(
              [
                { id: "orders", label: "Volume" },
                { id: "gmv", label: "GMV" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                aria-pressed={metric === m.id}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors",
                  metric === m.id
                    ? "bg-blue-700 text-white shadow-sm shadow-blue-700/20"
                    : "text-ink-600 hover:text-ink-950"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Légende de lecture */}
      <p className="mt-1 font-mono text-[10px] text-ink-400">
        {metric === "orders"
          ? `Pic : ${maxOrders} commandes · total ${volume.reduce((s, p) => s + p.orders, 0).toLocaleString("fr-FR")}`
          : `GMV total : ${formatPrice(volume.reduce((s, p) => s + p.gmvFcfa, 0))}`}
      </p>

      <div className="mt-3 flex h-52 items-end gap-1.5">
        {volume.map((p, i) => {
          const v = values[i];
          const h = Math.max(4, Math.round((v / max) * 100));
          const isPeak = metric === "orders" && v === maxOrders;
          return (
            <div
              key={`${p.label}-${i}`}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
            >
              {/* Infobulle */}
              <div className="pointer-events-none absolute bottom-full z-10 mb-1.5 hidden w-max max-w-40 -translate-x-1/2 left-1/2 flex-col items-center rounded-lg border border-line bg-ink-950 px-2.5 py-1.5 text-center shadow-lg group-hover:flex">
                <span className="font-mono text-[9px] text-white/60">{p.label}</span>
                <span className="font-mono text-[10px] font-bold text-white">
                  {metric === "orders"
                    ? `${v} cmd`
                    : formatPrice(v)}
                </span>
              </div>
              <div
                className={cn(
                  "w-full rounded-t-md transition-all duration-300",
                  metric === "orders"
                    ? isPeak
                      ? "bg-gold-strong"
                      : "bg-blue-600/80 group-hover:bg-blue-600"
                    : "bg-green-600/80 group-hover:bg-green-600"
                )}
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Axe des dates (échantillonnées) */}
      <div className="mt-2 flex justify-between font-mono text-[9px] text-ink-400">
        <span>{volume[0]?.label}</span>
        <span>{volume[Math.floor(volume.length / 2)]?.label}</span>
        <span>{volume[volume.length - 1]?.label}</span>
      </div>
    </DashboardCard>
  );
}
