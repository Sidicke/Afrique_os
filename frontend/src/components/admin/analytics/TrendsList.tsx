"use client";

import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import { cn } from "@/lib/utils";
import type { AdminAnalyticTrend } from "@/types/admin";

/**
 * Tendances et anomalies (doc 09 — §22/§23) : évolutions importantes et
 * comportements inhabituels, avec hiérarchie information / attention / critique.
 * Ces alertes analytiques ne remplacent jamais le module Moderation.
 */
export function TrendsList({
  trends,
  loading,
}: {
  trends: AdminAnalyticTrend[] | undefined;
  loading: boolean;
}) {
  const items = trends ?? [];

  return (
    <DashboardCard className="p-6">
      <CardHeader title="Tendances & anomalies" subtitle="Évolutions qui méritent une décision" />
      {loading || !trends || trends.length === 0 ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-ink-100" />
          ))}
        </div>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {items.map((t) => (
            <li
              key={t.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3",
                t.level === "critical"
                  ? "border-red-100 bg-red-100/60"
                  : t.level === "attention"
                    ? "border-amber-100 bg-amber-50/70"
                    : "border-line bg-ink-50/40"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  t.level === "critical"
                    ? "bg-red-600 text-white"
                    : t.level === "attention"
                      ? "bg-amber-500 text-white"
                      : t.positive
                        ? "bg-green-600 text-white"
                        : "bg-ink-200 text-ink-600"
                )}
              >
                <Icon
                  name={t.level === "critical" ? "alert" : t.positive ? "arrowUpRight" : "arrowDownRight"}
                  size={14}
                  strokeWidth={2}
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink-950">{t.label}</p>
                <p
                  className={cn(
                    "font-mono text-[10px]",
                    t.positive ? "text-green-700" : t.level === "critical" ? "text-red-600" : "text-ink-500"
                  )}
                >
                  {t.value}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
