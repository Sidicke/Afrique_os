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
  IconUser,
  IconCheck,
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
  const { data, loading } = useMultiAnalytics(period);

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
    { label: "Commandes totales", value: data.kpis.totalOrders.toString(), change: `${data.kpis.ordersGrowth >= 0 ? "+" : ""}${data.kpis.ordersGrowth.toFixed(1)}%`, positive: data.kpis.ordersGrowth >= 0, icon: IconPackage },
    { label: "Panier moyen global", value: formatPrice(data.kpis.avgBasket), change: `${data.kpis.avgBasketGrowth >= 0 ? "+" : ""}${data.kpis.avgBasketGrowth.toFixed(1)}%`, positive: data.kpis.avgBasketGrowth >= 0, icon: IconBag },
  ];

  const funnelData = [
    {
      label: "Commandes créées / initiées",
      count: data.funnel?.initiatedOrders ?? data.kpis.totalOrders,
      icon: IconBag,
    },
    {
      label: "Commandes confirmées & payées",
      count: data.funnel?.confirmedOrders ?? data.kpis.totalOrders,
      icon: IconCreditCard,
    },
    {
      label: "Commandes livrées (abouties)",
      count: data.funnel?.deliveredOrders ?? 0,
      icon: IconCheck,
    },
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

      {data.storeRevenues.length <= 1 ? (
        <div className="relative mt-8 overflow-hidden rounded-[2.5rem] bg-midnight-950 p-8 sm:p-12 shadow-2xl flex flex-col items-center text-center">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/20 blur-[80px] pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/20 blur-[80px] pointer-events-none" />
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-lg shadow-gold-500/30 z-10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          </div>
          <h3 className="mb-4 font-display text-3xl font-extrabold text-white tracking-tight z-10">
            Passez au niveau supérieur avec le Multi-Boutique
          </h3>
          <p className="mb-8 text-lg text-ivory-50/70 leading-relaxed max-w-2xl z-10">
            Vous n'avez actuellement qu'une seule boutique active. L'analytique multi-boutique prend tout son sens lorsque vous gérez plusieurs marques ou vitrines. Créez une seconde boutique pour comparer leurs performances, croiser vos données et dégager de nouvelles opportunités de croissance.
          </p>
          <a
            href="/espace-vendeur/mes-boutiques"
            className="group inline-flex items-center gap-2 rounded-full bg-gold-500 px-8 py-4 text-sm font-bold text-midnight-950 transition-all hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/25 hover:-translate-y-0.5 active:scale-95 z-10"
          >
            Créer une nouvelle boutique
            <svg className="transition-transform group-hover:translate-x-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
        </div>
      ) : (
        <>
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

          {/* Tableau Comparatif Rapide */}
          <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-sm">
            <div className="border-b border-line px-6 py-4">
              <h3 className="font-display text-lg font-bold text-ink-950">Comparaison détaillée</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-ink-600">
                  <tr>
                    <th className="px-6 py-3 font-medium">Boutique</th>
                    <th className="px-6 py-3 font-medium text-right">Chiffre d'Affaires</th>
                    <th className="px-6 py-3 font-medium text-right">Commandes</th>
                    <th className="px-6 py-3 font-medium text-right">Croissance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.storeRevenues.map(store => (
                    <tr key={store.storeId} className="hover:bg-ink-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-ink-950 flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${store.color}`} />
                        {store.storeName}
                      </td>
                      <td className="px-6 py-4 text-right">{formatPrice(store.revenue)}</td>
                      <td className="px-6 py-4 text-right">{store.orders}</td>
                      <td className={`px-6 py-4 text-right font-medium ${store.growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {store.growth > 0 ? '+' : ''}{store.growth.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Graphiques Croisés */}
          <div className="grid gap-6 lg:grid-cols-2">
            <MultiStoreRevenueChart data={data.storeRevenues} />
            <TopProductsCrossStore products={data.topProducts} />
          </div>

          {/* Entonnoir */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ConversionFunnel data={funnelData} />
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
        </>
      )}
    </div>
  );
}
