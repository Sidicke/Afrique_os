"use client";

import { useState } from "react";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { AdminGrowthPoint } from "@/types/admin";

type Metric = "users" | "stores" | "orders";

const METRICS: Array<{ id: Metric; label: string; color: string; fill: string; stroke: string }> = [
  { id: "users", label: "Utilisateurs", color: "text-blue-700", fill: "fill-blue-600", stroke: "stroke-blue-600" },
  { id: "stores", label: "Boutiques", color: "text-gold-strong", fill: "fill-gold-strong", stroke: "stroke-gold-strong" },
  { id: "orders", label: "Commandes", color: "text-green-600", fill: "fill-green-600", stroke: "stroke-green-600" },
];

const W = 720;
const H = 220;
const PAD = 8;

/**
 * Croissance de la plateforme dans le temps (doc 09 — §7) : une métrique
 * sélectionnable (utilisateurs / boutiques / commandes), un seul graphique.
 * SVG sobre, sans librairie — cohérent avec RevenueChart (doc 08).
 */
export function GrowthChart({
  series,
  loading,
}: {
  series: AdminGrowthPoint[] | undefined;
  loading: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("orders");

  if (loading || !series || series.length === 0) {
    return (
      <DashboardCard className="p-6">
        <CardHeader title="Croissance de la plateforme" subtitle="Évolution sur la période" />
        <div className="mt-4 h-[220px]">
          <Skeleton className="h-full w-full" />
        </div>
      </DashboardCard>
    );
  }

  const getValue = (p: AdminGrowthPoint) => p[metric];
  const values = series.map(getValue);
  const max = Math.max(...values, 1);
  const pts = series.map((p, i) => {
    const x = PAD + (i * (W - PAD * 2)) / (series.length - 1);
    const y = H - PAD - (getValue(p) / max) * (H - PAD * 2);
    return { x, y, p };
  });

  // Construction d'une véritable courbe spline de Bézier
  let smoothPath = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : pts.length - 1];
    const cp1x = p1.x + (p2.x - p0.x) / 5.5;
    const cp1y = p1.y + (p2.y - p0.y) / 5.5;
    const cp2x = p2.x - (p3.x - p1.x) / 5.5;
    const cp2y = p2.y - (p3.y - p1.y) / 5.5;
    smoothPath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  const areaPath = `${smoothPath} L ${pts[pts.length - 1].x.toFixed(1)},${H - PAD} L ${pts[0].x.toFixed(1)},${H - PAD} Z`;
  const active = METRICS.find((m) => m.id === metric)!;

  const latest = getValue(series[series.length - 1]);
  const first = getValue(series[0]);
  const deltaPct = first ? Math.round(((latest - first) / first) * 100) : 0;

  return (
    <DashboardCard className="p-6">
      <CardHeader
        title="Croissance de la plateforme"
        subtitle="Évolution des utilisateurs, boutiques et commandes"
        action={
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
            {METRICS.map((m) => (
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

      <p className="mt-1 font-mono text-[10px] text-ink-400">
        {latest.toLocaleString("fr-FR")} {metric === "users" ? "utilisateurs" : metric === "stores" ? "boutiques" : "commandes"} ·{" "}
        <span className={deltaPct >= 0 ? "text-green-600" : "text-red-600"}>
          {deltaPct >= 0 ? "+" : ""}
          {deltaPct} %
        </span>{" "}
        vs début de période
      </p>

      <div className="mt-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[220px] w-full"
          role="img"
          aria-label="Graphique de croissance de la plateforme"
        >
          {[0.25, 0.5, 0.75].map((g) => (
            <line
              key={g}
              x1={PAD}
              x2={W - PAD}
              y1={H - PAD - g * (H - PAD * 2)}
              y2={H - PAD - g * (H - PAD * 2)}
              stroke="currentColor"
              className="text-line"
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          ))}
          <path d={areaPath} className={cn(active.fill, "opacity-15")} />
          <path d={smoothPath} fill="none" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className={active.stroke} />
        </svg>

        {/* Axe des dates (échantillonnées) */}
        <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-400">
          <span>{series[0]?.label}</span>
          <span>{series[Math.floor(series.length / 2)]?.label}</span>
          <span>{series[series.length - 1]?.label}</span>
        </div>
      </div>
    </DashboardCard>
  );
}
