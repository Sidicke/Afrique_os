"use client";

import { KPIStat } from "@/types/dashboard";
import { cn, formatCurrency } from "@/lib/utils";
import { Icon, IconName } from "@/components/dashboard/icons";

interface KPICardsGroupProps {
  kpis: KPIStat[];
}

export default function KPICardsGroup({ kpis }: KPICardsGroupProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((stat, idx) => {
        const displayValue = (stat.iconName === "revenue" || stat.iconName === "basket")
          ? formatCurrency(stat.rawNumber)
          : stat.value;

        return (
          <div
            key={stat.title + idx}
            className="card-lux group relative flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-sm shadow-ink-950/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-gold-soft hover:shadow-lg hover:shadow-ink-950/[0.06]"
          >
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs font-medium text-ink-500">{stat.title}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-soft bg-gold-wash text-gold-strong transition-colors group-hover:bg-gold-mid group-hover:text-white">
                {getIcon(stat.iconName)}
              </span>
            </div>

            <div className="mt-4">
              <p className="font-display text-2xl font-semibold tracking-tight text-ink-950">
                {displayValue}
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                    stat.isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  )}
                >
                  {stat.isPositive ? "▲" : "▼"} {stat.changePercent}%
                </span>
                <span className="text-[11px] text-ink-400">{stat.comparisonText}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ICON_MAP: Record<KPIStat["iconName"], IconName> = {
  revenue: "wallet",
  orders: "orders",
  visitors: "eye",
  conversion: "checkCircle",
  basket: "basket",
};

function getIcon(name: KPIStat["iconName"]) {
  return <Icon name={ICON_MAP[name]} size={16} strokeWidth={2} />;
}
