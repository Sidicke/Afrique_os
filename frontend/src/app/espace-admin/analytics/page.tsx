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

const PERIOD_OPTIONS = [
  { value: "7_days", label: "7 jours" },
  { value: "30_days", label: "30 jours" },
  { value: "this_year", label: "Cette année" },
];

const CONSOLIDATED_KPIS = [
  { label: "CA consolidé", value: "3 000 000 FCFA", change: "+8.4%", positive: true, icon: IconCreditCard },
  { label: "Commandes totales", value: "81", change: "+14.1%", positive: true, icon: IconPackage },
  { label: "Panier moyen", value: "37 037 FCFA", change: "-2.3%", positive: false, icon: IconBag },
  { label: "Taux retour clients", value: "34.5%", change: "+5.1%", positive: true, icon: IconClock },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30_days");

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Analytics Avancées</h1>
          <p className="mt-1 text-sm text-ink-500">
            Vue consolidée de toutes vos boutiques — données croisées et insights actionnables.
          </p>
        </div>
        {/* Sélecteur de période */}
        <div className="flex rounded-xl border border-line bg-surface overflow-hidden">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                period === opt.value
                  ? "bg-blue-700 text-white"
                  : "text-ink-600 hover:bg-ink-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs consolidés */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CONSOLIDATED_KPIS.map((kpi) => {
          const IconComp = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-500">{kpi.label}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-400/15 text-gold-600">
                  <IconComp className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-ink-950">{kpi.value}</p>
              <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                kpi.positive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              }`}>
                {kpi.positive ? "▲" : "▼"} {kpi.change} vs période préc.
              </span>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MultiStoreRevenueChart />
        <ConversionFunnel />
      </div>

      {/* Top produits cross-boutiques */}
      <TopProductsCrossStore />

      {/* Note plan */}
      <div className="rounded-2xl border border-gold-soft bg-gold-wash p-4 flex items-start gap-2.5">
        <IconAlert className="h-5 w-5 text-gold-700 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Les données affichées sont en <strong>démo</strong>. L&apos;intégration complète avec l&apos;API est activée sur votre plan Business. Pour des rapports exportables et des webhooks personnalisés, passez en <strong>Enterprise</strong>.
        </p>
      </div>
    </div>
  );
}
