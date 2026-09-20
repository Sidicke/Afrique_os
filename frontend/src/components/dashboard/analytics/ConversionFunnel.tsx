"use client";

import {
  IconUser,
  IconPackage,
  IconBag,
  IconCreditCard,
  IconCheck,
} from "@/components/client/icons";

export interface FunnelStep {
  label: string;
  count: number;
  icon: any;
}

export default function ConversionFunnel({ data = [] }: { data?: FunnelStep[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const firstCount = data[0]?.count ?? 0;
  const lastCount = data.length > 0 ? data[data.length - 1].count : 0;
  const conversionRate = firstCount > 0 ? ((lastCount / firstCount) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gold-strong">Entonnoir de conversion</span>
      <p className="mt-1 font-display text-2xl font-bold text-ink-950">
        {conversionRate}%
        <span className="ml-2 font-sans text-sm font-normal text-ink-400">taux d&apos;aboutissement des commandes</span>
      </p>
      <div className="mt-6 flex flex-col gap-2">
        {data.map((step, i) => {
          const IconComp = step.icon;
          const pct = maxCount > 0 && step.count > 0 ? (step.count / maxCount) * 100 : 0;
          const prevCount = i > 0 ? data[i - 1].count : 0;
          const dropFromPrev = prevCount > 0 ? Math.max(0, ((prevCount - step.count) / prevCount) * 100) : 0;
          return (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 text-xs font-medium text-ink-700">
                  <IconComp className="h-4 w-4 text-gold-600 shrink-0" />
                  {step.label}
                </span>
                <div className="flex items-center gap-3">
                  {i > 0 && (
                    <span className="text-[10px] text-red-500">-{dropFromPrev.toFixed(0)}%</span>
                  )}
                  <span className="font-mono text-sm font-bold text-ink-950">{step.count.toLocaleString("fr-FR")}</span>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-500 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
