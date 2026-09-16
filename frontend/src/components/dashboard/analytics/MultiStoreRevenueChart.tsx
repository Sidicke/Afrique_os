"use client";

import { cn } from "@/lib/utils";
import { formatFcfa } from "@/lib/utils";

export interface StoreRevenueStat {
  storeId: string;
  storeName: string;
  revenue: number;
  orders: number;
  growth: number; // pourcentage
  color: string; // classe tailwind
}

const STORE_COLORS = [
  { bg: "bg-blue-700", light: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-gold-strong", light: "bg-gold-wash", text: "text-gold-strong" },
  { bg: "bg-green-600", light: "bg-green-100", text: "text-green-600" },
];

const DEMO_DATA: StoreRevenueStat[] = [
  { storeId: "1", storeName: "Boutique Principale", revenue: 1850000, orders: 47, growth: 12.4, color: "blue" },
  { storeId: "2", storeName: "Boutique Mode", revenue: 720000, orders: 23, growth: -3.2, color: "gold" },
  { storeId: "3", storeName: "Boutique Tech", revenue: 430000, orders: 11, growth: 28.7, color: "green" },
];

export default function MultiStoreRevenueChart({ data = DEMO_DATA }: { data?: StoreRevenueStat[] }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = data.reduce((s, d) => s + d.orders, 0);

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gold-strong">Revenus par boutique</span>
          <div className="mt-1 flex items-baseline gap-3">
            <h3 className="font-display text-3xl font-bold text-ink-950">{formatFcfa(totalRevenue)}</h3>
            <span className="text-xs text-ink-400">{totalOrders} commandes au total</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {data.map((store, i) => {
          const pct = (store.revenue / maxRevenue) * 100;
          const colors = STORE_COLORS[i % STORE_COLORS.length];
          return (
            <div key={store.storeId}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", colors.bg)} />
                  <span className="text-sm font-medium text-ink-800">{store.storeName}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="font-display text-sm font-bold text-ink-950">{formatFcfa(store.revenue)}</span>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                    store.growth >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  )}>
                    {store.growth >= 0 ? "▲" : "▼"} {Math.abs(store.growth)}%
                  </span>
                </div>
              </div>
              <div className={cn("h-2.5 w-full overflow-hidden rounded-full", colors.light)}>
                <div
                  className={cn("h-full rounded-full transition-all duration-700", colors.bg)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-[11px] text-ink-400">{store.orders} commandes</span>
                <span className="text-[11px] text-ink-400">{((store.revenue / totalRevenue) * 100).toFixed(1)}% du total</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
