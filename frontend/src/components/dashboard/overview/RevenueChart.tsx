"use client";

import { useMemo, useState } from "react";
import { RevenueDataPoint } from "@/types/dashboard";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { formatFcfa } from "@/lib/utils";

interface RevenueChartProps {
  dataPoints: RevenueDataPoint[];
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

export default function RevenueChart({ dataPoints }: RevenueChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartHeight = 180;
  const chartWidth = 500;

  // Maximum value for scaling (with some headroom)
  const maxVal = useMemo(() => {
    if (dataPoints.length === 0) return 1000;
    const max = Math.max(
      ...dataPoints.map((d) => Math.max(d.currentPeriodFcfa, d.previousPeriodFcfa)),
      1000
    );
    return max * 1.15;
  }, [dataPoints]);

  // Aucune donnée → état vide élégant (jamais de crash ni de division par zéro)
  if (dataPoints.length === 0) {
    return (
      <DashboardCard className="p-6">
        <CardHeader
          title={
            <>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gold-strong">
                Chiffre d&apos;Affaires Cumulé
              </span>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <h3 className="font-display text-3xl font-bold text-ink-950">0 FCFA</h3>
              </div>
            </>
          }
        />
        <div className="mt-6 flex h-52 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface/50">
          <p className="font-display text-sm font-semibold text-ink-600">
            Aucune vente sur cette période
          </p>
          <p className="max-w-xs text-center text-xs text-ink-400">
            Le graphique apparaîtra dès la première commande confirmée.
          </p>
        </div>
      </DashboardCard>
    );
  }

  const n = dataPoints.length;
  const step = n > 1 ? n - 1 : 1;

  // Transform coordinates to SVG path string
  const coordsCurrent = dataPoints.map((d, idx) => ({
    x: (idx / step) * chartWidth,
    y: chartHeight - (d.currentPeriodFcfa / maxVal) * chartHeight,
  }));

  const coordsPrevious = dataPoints.map((d, idx) => ({
    x: (idx / step) * chartWidth,
    y: chartHeight - (d.previousPeriodFcfa / maxVal) * chartHeight,
  }));

  const { path: currentPath, area: areaPath } = buildSmoothSpline(coordsCurrent, chartHeight);
  const { path: previousPath } = buildSmoothSpline(coordsPrevious, chartHeight);

  // Index de survol TOUJOURS borné aux données
  const safeHover = hoverIndex !== null ? Math.min(hoverIndex, n - 1) : null;
  const activePoint = safeHover !== null ? dataPoints[safeHover] : null;
  const activeCoord = safeHover !== null ? coordsCurrent[safeHover] : null;
  const totalCurrent = dataPoints.reduce((s, d) => s + d.currentPeriodFcfa, 0);
  const totalPrevious = dataPoints.reduce((s, d) => s + d.previousPeriodFcfa, 0);
  const delta = totalPrevious ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : 0;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relX * (n - 1));
    setHoverIndex(Math.max(0, Math.min(idx, n - 1)));
  };

  return (
    <DashboardCard className="p-6">
      {/* Header Info */}
      <CardHeader
        title={
          <>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gold-strong">
              Chiffre d&apos;Affaires Cumulé
            </span>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <h3 className="font-display text-3xl font-bold text-ink-950">{formatFcfa(totalCurrent)}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-mono text-xs font-semibold text-green-700">
                ▲ +{delta.toFixed(1)}% vs période précédente
              </span>
            </div>
          </>
        }
        action={
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-ink-600">
              <span className="h-2 w-2 rounded-full bg-blue-700" />
              Période actuelle
            </span>
            <span className="flex items-center gap-1.5 text-ink-400">
              <span className="h-2 w-2 rounded-full bg-ink-200" />
              Période précédente
            </span>
          </div>
        }
      />

      {/* SVG Chart */}
      <div className="relative mt-6 h-64 w-full select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-full w-full overflow-visible cursor-crosshair touch-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#2563eb" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line
              key={p}
              x1="0"
              y1={chartHeight * p}
              x2={chartWidth}
              y2={chartHeight * p}
              stroke="rgba(11,22,38,0.06)"
              strokeDasharray="4 4"
            />
          ))}

          {/* Previous Period Line (dashed gray) */}
          <path
            d={previousPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.7"
          />

          {/* Current Period Area */}
          <path d={areaPath} fill="url(#revenueAreaGrad)" />

          {/* Current Period Main Line */}
          <path
            d={currentPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Single Interactive Hover Indicator */}
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

        {/* Floating Tooltip card */}
        {activePoint && safeHover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-20 rounded-xl border border-line bg-white p-3 shadow-xl shadow-ink-950/10 transition-all duration-200"
            style={{
              left: `${Math.min(Math.max((safeHover / step) * 90, 5), 75)}%`,
            }}
          >
            <p className="font-mono text-[10px] font-semibold uppercase text-gold-strong">{activePoint.date}</p>
            <p className="mt-0.5 font-display text-sm font-bold text-ink-950">{formatFcfa(activePoint.currentPeriodFcfa)}</p>
            <p className="text-[10px] text-ink-400">Précédent : {formatFcfa(activePoint.previousPeriodFcfa)}</p>
          </div>
        )}
      </div>

      {/* X-Axis labels — espacés pour rester lisibles si beaucoup de jours */}
      <div className="flex justify-between border-t border-line pt-3 font-mono text-[11px] text-ink-400">
        {dataPoints.map((d) => (
          <span key={d.date}>{d.date}</span>
        ))}
      </div>
    </DashboardCard>
  );
}
