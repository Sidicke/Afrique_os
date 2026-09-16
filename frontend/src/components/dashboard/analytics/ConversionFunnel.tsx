"use client";

import {
  IconUser,
  IconPackage,
  IconBag,
  IconCreditCard,
  IconCheck,
} from "@/components/client/icons";

const DEMO_FUNNEL = [
  { label: "Visiteurs uniques", count: 4820, icon: IconUser },
  { label: "Pages produit vues", count: 2140, icon: IconPackage },
  { label: "Ajouts au panier", count: 643, icon: IconBag },
  { label: "Commandes initiées", count: 201, icon: IconCreditCard },
  { label: "Commandes confirmées", count: 147, icon: IconCheck },
];

export default function ConversionFunnel({ data = DEMO_FUNNEL }: { data?: typeof DEMO_FUNNEL }) {
  const maxCount = data[0]?.count ?? 1;

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gold-strong">Entonnoir de conversion</span>
      <p className="mt-1 font-display text-2xl font-bold text-ink-950">
        {data.length >= 2 ? `${((data[data.length - 1].count / data[0].count) * 100).toFixed(1)}%` : "—"}
        <span className="ml-2 font-sans text-sm font-normal text-ink-400">taux de conversion global</span>
      </p>
      <div className="mt-6 flex flex-col gap-2">
        {data.map((step, i) => {
          const IconComp = step.icon;
          const pct = (step.count / maxCount) * 100;
          const dropFromPrev = i > 0 ? ((data[i - 1].count - step.count) / data[i - 1].count) * 100 : 0;
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
