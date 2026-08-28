"use client";

import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { cn } from "@/lib/utils";
import type { AdminFunnelStep } from "@/types/admin";

/**
 * Funnel vendeur (doc 09 — §10) : du parcours « boutique créée » jusqu'à la
 * première commande — les points de perte sont immédiatement identifiables.
 */
export function FunnelChart({
  funnel,
  loading,
}: {
  funnel: AdminFunnelStep[] | undefined;
  loading: boolean;
}) {
  const steps = funnel ?? [];
  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <DashboardCard className="p-6">
      <CardHeader title="Funnel vendeur" subtitle="Du parcours boutique créée à la première commande" />
      {loading || !funnel || funnel.length === 0 ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-ink-100" />
          ))}
        </div>
      ) : (
        <ol className="mt-5 space-y-0">
          {steps.map((s, i) => (
            <li key={s.id} className="relative flex items-start gap-3">
              {/* Connecteur vertical */}
              {i < steps.length - 1 && (
                <span className="absolute left-[11px] top-8 h-full w-px bg-line" aria-hidden="true" />
              )}
              <span
                className={cn(
                  "z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-bold",
                  s.conversionPercent >= 60
                    ? "border-green-200 bg-green-100 text-green-700"
                    : s.conversionPercent >= 40
                      ? "border-gold-soft bg-gold-wash text-gold-strong"
                      : "border-red-100 bg-red-100/70 text-red-600"
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 pb-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-ink-800">{s.label}</p>
                  <p className="font-mono text-[10px] text-ink-500">
                    {s.count.toLocaleString("fr-FR")}
                    {i > 0 && (
                      <span
                        className={cn(
                          "ml-2 font-semibold",
                          s.conversionPercent >= 60
                            ? "text-green-600"
                            : s.conversionPercent >= 40
                              ? "text-gold-strong"
                              : "text-red-600"
                        )}
                      >
                        {s.conversionPercent} %
                      </span>
                    )}
                  </p>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      s.conversionPercent >= 60
                        ? "bg-green-500/80"
                        : s.conversionPercent >= 40
                          ? "bg-gold-strong"
                          : "bg-red-400"
                    )}
                    style={{ width: `${Math.max(4, (s.count / maxCount) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}
