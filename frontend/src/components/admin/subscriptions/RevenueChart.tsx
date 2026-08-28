"use client";

import { useState } from "react";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { cn, formatFcfa } from "@/lib/utils";
import type { AdminRevenuePoint } from "@/types/admin";

type Metric = "mrr" | "new" | "lost";

const METRICS: Array<{ id: Metric; label: string; color: string }> = [
  { id: "mrr", label: "MRR", color: "text-gold-strong" },
  { id: "new", label: "Nouveaux revenus", color: "text-green-600" },
  { id: "lost", label: "Revenus perdus", color: "text-red-600" },
];

const W = 720;
const H = 220;
const PAD = 8;

/**
 * Évolution des revenus sur 12 mois (doc 08 — §6) : MRR, nouveaux revenus
 * (upgrades + nouveaux abonnés) et revenus perdus (annulations, downgrades).
 * SVG sobre, sans librairie — lisibilité avant tout.
 */
export function RevenueChart({
  series,
  loading,
}: {
  series: AdminRevenuePoint[] | undefined;
  loading: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("mrr");

  if (loading || !series || series.length === 0) {
    return (
      <DashboardCard className="p-6">
        <CardHeader title="Revenus récurrents" subtitle="Évolution sur 12 mois" />
        <div className="mt-4 h-[220px]">
          <Skeleton className="h-full w-full" />
        </div>
      </DashboardCard>
    );
  }

  const getValue = (p: AdminRevenuePoint) =>
    metric === "mrr" ? p.mrrFcfa : metric === "new" ? p.newRevenueFcfa : p.lostRevenueFcfa;
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

  const latest = series[series.length - 1];
  const first = series[0];
  const deltaPct = first ? Math.round(((getValue(latest) - getValue(first)) / getValue(first)) * 100) : 0;

  return (
    <DashboardCard className="p-6">
      <CardHeader
        title="Revenus récurrents"
        subtitle="MRR, nouveaux revenus et revenus perdus sur 12 mois"
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
        {formatFcfa(getValue(latest))} ·{" "}
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
          aria-label="Graphique de revenus récurrents"
        >
          {/* Lignes de grille */}
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
          <path d={areaPath} className="fill-gold-strong/15" />
          <path
            d={smoothPath}
            fill="none"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={
              metric === "mrr"
                ? "stroke-gold-strong"
                : metric === "new"
                  ? "stroke-green-600"
                  : "stroke-red-600"
            }
          />
        </svg>

        {/* Axe des dates */}
        <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-400">
          <span>{series[0]?.label}</span>
          <span>{series[Math.floor(series.length / 2)]?.label}</span>
          <span>{series[series.length - 1]?.label}</span>
        </div>
      </div>
    </DashboardCard>
  );
}
