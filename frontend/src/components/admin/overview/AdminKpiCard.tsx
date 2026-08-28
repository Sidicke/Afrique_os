"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/dashboard/icons";
import type { AdminKpi } from "@/types/admin";

const toneClass: Record<AdminKpi["tone"], string> = {
  gold: "border-gold-soft bg-gold-wash text-gold-strong",
  blue: "border-blue-100 bg-blue-100/70 text-blue-700",
  green: "border-green-100 bg-green-100/70 text-green-700",
  terracotta: "border-red-100 bg-red-100/70 text-red-600",
  ivory: "border-line bg-ink-50 text-ink-700",
};

/** Carte KPI du Command Center (doc 03 — §6/§7) */
export function AdminKpiCard({ kpi }: { kpi: AdminKpi }) {
  return (
    <div className="card-lux group relative flex flex-col justify-between rounded-2xl border border-line bg-surface p-3.5 sm:p-5 shadow-sm shadow-ink-950/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-gold-soft hover:shadow-lg hover:shadow-ink-950/[0.06] min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-sans text-[11px] sm:text-xs font-medium text-ink-500 truncate">{kpi.label}</span>
        <span className={cn("flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border", toneClass[kpi.tone])}>
          <Icon name={kpi.icon} size={15} strokeWidth={2} />
        </span>
      </div>

      <div className="mt-3 sm:mt-4 min-w-0">
        <p className="font-display text-lg sm:text-2xl font-bold tracking-tight text-ink-950 truncate">{kpi.value}</p>

        <div className="mt-2 flex items-center gap-2">
          {typeof kpi.changePercent === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                kpi.isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              )}
            >
              {kpi.isPositive ? "▲" : "▼"} {kpi.changePercent}%
            </span>
          )}
          {kpi.comparisonText && <span className="text-[11px] text-ink-400">{kpi.comparisonText}</span>}
        </div>

        {kpi.action && (
          <Link
            href={kpi.action.href}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 font-mono text-[10px] font-semibold text-blue-700 transition-colors hover:border-blue-600 hover:bg-blue-50"
          >
            {kpi.action.label}
            <Icon name="arrowUpRight" size={10} strokeWidth={2.2} />
          </Link>
        )}
      </div>
    </div>
  );
}
