"use client";

import { useMemo, useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import type { AdminPerformanceMetric, AdminPerformancePoint } from "@/types/admin";

interface PlatformPerformanceProps {
  series: Record<AdminPerformanceMetric, AdminPerformancePoint[]>;
  defaultMetric: AdminPerformanceMetric;
}

const METRICS: Array<{ value: AdminPerformanceMetric; label: string }> = [
  { value: "orders", label: "Commandes" },
  { value: "gmv", label: "GMV" },
  { value: "revenue", label: "Revenu" },
  { value: "users", label: "Utilisateurs" },
  { value: "stores", label: "Boutiques" },
];

/** Formate la valeur selon la métrique (devise active ou unités) */
function formatValue(metric: AdminPerformanceMetric, value: number): string {
  if (metric === "gmv" || metric === "revenue") {
    return formatCurrency(value);
  }
  return value.toLocaleString("fr-FR");
}

function buildSmoothSpline(
  coords: { x: number; y: number }[],
  chartHeight: number
): { path: string; area: string } {
  if (coords.length === 0) return { path: "", area: "" };
  if (coords.length === 1) {
    return {
      path: `M ${coords[0].x},${coords[0].y}`,
      area: `M ${coords[0].x},${chartHeight} L ${coords[0].x},${coords[0].y} Z`,
    };
  }

  let d = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : coords.length - 1];

    const cp1x = p1.x + (p2.x - p0.x) / 5.5;
    const cp1y = p1.y + (p2.y - p0.y) / 5.5;
    const cp2x = p2.x - (p3.x - p1.x) / 5.5;
    const cp2y = p2.y - (p3.y - p1.y) / 5.5;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  const first = coords[0];
  const last = coords[coords.length - 1];
  const area = `${d} L ${last.x.toFixed(1)},${chartHeight} L ${first.x.toFixed(1)},${chartHeight} Z`;

  return { path: d, area };
}

/** Graphique temporel SVG — véritable courbe de Bézier lissée (spline) sans points */
export function PlatformPerformance({ series, defaultMetric }: PlatformPerformanceProps) {
  const [metric, setMetric] = useState<AdminPerformanceMetric>(defaultMetric);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = series[metric];
  const chartWidth = 520;
  const chartHeight = 180;

  const geometry = useMemo(() => {
    const maxRaw = Math.max(...points.map((p) => p.value));
    const maxVal = maxRaw > 0 ? maxRaw * 1.12 : 1;
    const n = points.length;
    const step = n > 1 ? n - 1 : 1;
    const coords = points.map((p, idx) => ({
      x: (idx / step) * chartWidth,
      y: chartHeight - (p.value / maxVal) * chartHeight,
    }));
    const { path, area } = buildSmoothSpline(coords, chartHeight);
    return { coords, path, area, maxVal, step };
  }, [points]);

  const activeIndex = hoverIndex !== null ? Math.min(hoverIndex, points.length - 1) : null;
  const activePoint = activeIndex !== null ? points[activeIndex] : null;
  const activeCoord = activeIndex !== null ? geometry.coords[activeIndex] : null;
  const total = points.reduce((s, p) => s + p.value, 0);

  // Variation simple : première moitié vs seconde moitié
  const half = Math.max(1, Math.floor(points.length / 2));
  const firstHalf = points.slice(0, half).reduce((s, p) => s + p.value, 0);
  const secondHalf = points.slice(half).reduce((s, p) => s + p.value, 0);
  const delta = firstHalf ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relX * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(idx, points.length - 1)));
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-sm shadow-ink-950/[0.03] overflow-hidden">
      {/* Header + sélecteur de métrique */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gold-strong">
            Platform performance
          </span>
          <div className="mt-1 flex flex-wrap items-baseline gap-2.5 sm:gap-3">
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink-950">
              {formatValue(metric, total)}
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] sm:text-xs font-semibold",
                delta >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              )}
            >
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% sur la période
            </span>
          </div>
        </div>

        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-line bg-ink-50 p-1 [scrollbar-width:none]">
          {METRICS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                setMetric(m.value);
                setHoverIndex(null);
              }}
              className={cn(
                "shrink-0 cursor-pointer rounded-lg px-2.5 py-1 font-mono text-[11px] transition-colors",
                metric === m.value
                  ? "bg-blue-700 font-semibold text-white shadow-sm shadow-blue-700/20"
                  : "text-ink-600 hover:text-ink-950"
              )}
              aria-pressed={metric === m.value}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Graphique — Véritable courbe continue sans points */}
      <div className="relative mt-6 h-52 w-full select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-full w-full overflow-visible cursor-crosshair touch-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="adminPerfArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#2563eb" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grille horizontale discrète */}
          {[0, 0.33, 0.66, 1].map((t) => (
            <line
              key={t}
              x1="0"
              y1={chartHeight * t}
              x2={chartWidth}
              y2={chartHeight * t}
              stroke="rgba(11,22,38,0.06)"
              strokeDasharray="4 4"
            />
          ))}

          {/* Remplissage dégradé sous la courbe */}
          <path d={geometry.area} fill="url(#adminPerfArea)" />

          {/* Vraie courbe continue et soyeuse (spline) */}
          <path
            d={geometry.path}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Indicateur interactif uniquement au survol */}
          {activeCoord && (
            <g>
              <line
                x1={activeCoord.x}
                y1={0}
                x2={activeCoord.x}
                y2={chartHeight}
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.45"
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="8"
                fill="#2563eb"
                opacity="0.2"
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="4.5"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {activePoint && activeIndex !== null && (
          <div
            className="pointer-events-none absolute top-2 z-20 rounded-xl border border-line bg-white/95 backdrop-blur-md p-3 shadow-xl shadow-ink-950/10 transition-all duration-150"
            style={{
              left: `${Math.min(Math.max((activeIndex / Math.max(geometry.step, 1)) * 78, 4), 68)}%`,
            }}
          >
            <p className="font-mono text-[10px] font-semibold uppercase text-gold-strong">
              {activePoint.date}
            </p>
            <p className="mt-0.5 font-display text-sm font-bold text-ink-950">
              {formatValue(metric, activePoint.value)}
            </p>
            <p className="text-[10px] text-ink-400">
              {METRICS.find((m) => m.value === metric)?.label}
            </p>
          </div>
        )}
      </div>

      {/* Axe X — libellés espacés pour rester lisibles */}
      <div className="flex justify-between border-t border-line pt-3 font-mono text-[11px] text-ink-400">
        {points.filter((_, i) => i % Math.ceil(points.length / 8) === 0).map((p) => (
          <span key={p.date}>{p.date}</span>
        ))}
      </div>
    </section>
  );
}
