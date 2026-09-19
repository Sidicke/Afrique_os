"use client";

import MultiStoreRevenueChart from "@/components/dashboard/analytics/MultiStoreRevenueChart";
import ConversionFunnel from "@/components/dashboard/analytics/ConversionFunnel";
import TopProductsCrossStore from "@/components/dashboard/analytics/TopProductsCrossStore";
import { useState } from "react";
import {
  IconCreditCard,
  IconPackage,
  IconBag,
  IconClock,
  IconAlert,
} from "@/components/client/icons";
import { useTranslation } from "@/lib/i18n";
import { useMultiAnalytics } from "@/hooks/useMultiAnalytics";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";

const PERIOD_OPTIONS = [
  { value: "7_days", label: "7 jours" },
  { value: "30_days", label: "30 jours" },
  { value: "this_year", label: "Cette année" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30_days");
  const { formatPrice } = useTranslation();
  const { data, loading } = useMultiAnalytics();

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Analytics Multi-Boutique" description="Chargement des données consolidées..." />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-ink-100" />
      </div>
    );
  }

  const kpis = [
    { label: "CA consolidé", value: formatPrice(data.kpis.totalRevenue), change: `${data.kpis.revenueGrowth >= 0 ? "+" : ""}${data.kpis.revenueGrowth.toFixed(1)}%`, positive: data.kpis.revenueGrowth >= 0, icon: IconCreditCard },
    { label: "Commandes totales", value: data.kpis.totalOrders.toString(), change: "+0%", positive: true, icon: IconPackage },
    { label: "Panier moyen global", value: formatPrice(data.kpis.avgBasket), change: "0%", positive: true, icon: IconBag },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-midnight-950 tracking-tight">Analytics <span className="text-gold-500">Multi-Boutique</span></h1>
          <p className="mt-2 text-base text-ink-600">
            Vue consolidée de toutes vos boutiques — données croisées et insights actionnables.
          </p>
        </div>
        {/* Sélecteur de période */}
        <div className="flex rounded-xl border border-line bg-surface overflow-hidden hidden sm:flex">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                period === opt.value
                  ? "bg-gold-500 text-white shadow-sm"
                  : "text-ink-600 hover:bg-ink-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs consolidés */}
      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => {
          const IconComp = kpi.icon;
          return (
            <div key={kpi.label} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-wash text-gold-strong">
                <IconComp className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-500">{kpi.label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="font-display text-xl font-bold text-ink-950">{kpi.value}</p>
                  <span className={`font-mono text-[10px] font-bold ${kpi.positive ? "text-green-600" : "text-red-500"}`}>
                    {kpi.change}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Graphiques Croisés */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MultiStoreRevenueChart data={data.storeRevenues} />
        <TopProductsCrossStore />
      </div>

      {/* Entonnoir */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ConversionFunnel />
        <div className="rounded-2xl border border-gold-soft bg-gold-wash p-6 flex flex-col justify-center">
          <IconAlert className="h-8 w-8 text-gold-strong mb-3" />
          <h3 className="font-display text-lg font-bold text-ink-950">Insights ZennShop IA</h3>
          <p className="mt-2 text-sm text-ink-700">
            Vos boutiques ont une belle synergie. La boutique <strong>{data.storeRevenues[0]?.storeName || "Principale"}</strong> 
            porte la majorité de vos revenus ({data.kpis.totalRevenue > 0 ? Math.round((data.storeRevenues[0]?.revenue || 0) / data.kpis.totalRevenue * 100) : 0}% du CA global). 
            Envisagez de faire du cross-selling entre vos différentes marques pour optimiser votre panier moyen global.
          </p>
        </div>
      </div>
    </div>
  );
}
