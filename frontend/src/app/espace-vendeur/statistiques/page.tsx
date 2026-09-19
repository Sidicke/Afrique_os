"use client";

import { useState } from "react";
import { useStats, StatsPeriod } from "@/hooks/useStats";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton, KpiSkeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { cn } from "@/lib/utils";
import KPICardsGroup from "@/components/dashboard/overview/KPICardsGroup";
import RevenueChart from "@/components/dashboard/overview/RevenueChart";
import RepeatCustomerGauge from "@/components/dashboard/overview/RepeatCustomerGauge";
import CustomerSegments from "@/components/dashboard/overview/CustomerSegments";
import BestSellersTable from "@/components/dashboard/overview/BestSellersTable";
import { ActiveDaysChart } from "@/components/dashboard/stats/ActiveDaysChart";

const PERIODS: Array<{ value: StatsPeriod; label: string }> = [
  { value: "7_days", label: "7 jours" },
  { value: "30_days", label: "30 jours" },
  { value: "this_year", label: "Cette année" },
];

export default function StatistiquesPage() {
  const [period, setPeriod] = useState<StatsPeriod>("30_days");
  const { data, loading, error, refresh } = useStats(period);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Performances"
        title="Statistiques & Ventes"
        description="Mesurez l'évolution de votre activité et identifiez les leviers de croissance."
        actions={
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors",
                  period === p.value
                    ? "bg-blue-700 font-semibold text-white shadow-sm shadow-blue-700/20"
                    : "text-ink-600 hover:text-ink-950"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Ordre des conditions : `error` AVANT `!data` — sinon le squelette
          tourne à l'infini en cas d'échec API. */}
      {loading ? (
        <StatsSkeleton />
      ) : error || !data ? (
        <DashboardCard className="flex flex-col items-center gap-3 p-10 text-center">
          <Icon name="alert" size={28} className="text-red-600" />
          <p className="text-sm text-ink-700">{error}</p>
          <button
            onClick={refresh}
            className="rounded-xl border border-gold-soft px-4 py-2 font-mono text-xs text-gold-strong hover:bg-gold-wash"
          >
            Réessayer
          </button>
        </DashboardCard>
      ) : (
        <>
          {/* Indicateurs de la période */}
          <KPICardsGroup
            kpis={[data.kpis.revenue, data.kpis.orders, data.kpis.avgBasket || { title: 'Panier moyen', value: '-', type: 'metric' }, data.kpis.conversion || { title: 'Conversion', value: '-', type: 'metric' }]}
          />

          {data.requiresBusiness ? (
            <div className="relative mt-12 overflow-hidden rounded-[2.5rem] bg-midnight-950 p-8 sm:p-12 shadow-2xl">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/20 blur-[80px] pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/20 blur-[80px] pointer-events-none" />
              
              <div className="relative flex flex-col items-center text-center max-w-2xl mx-auto">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-lg shadow-gold-500/30">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <h3 className="mb-4 font-display text-3xl font-extrabold text-white tracking-tight">
                  Passez à la vitesse supérieure
                </h3>
                <p className="mb-8 text-lg text-ivory-50/70 leading-relaxed">
                  Débloquez la <strong className="text-gold-300 font-semibold">segmentation client</strong>, les rapports de fidélisation et l'analyse de vos <strong className="text-gold-300 font-semibold">meilleures ventes</strong> en passant au plan supérieur. Prenez des décisions basées sur des données précises.
                </p>
                <a
                  href="/espace-vendeur/parametres/formule"
                  className="group inline-flex items-center gap-2 rounded-full bg-gold-500 px-8 py-4 text-sm font-bold text-midnight-950 transition-all hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/25 hover:-translate-y-0.5 active:scale-95"
                >
                  Découvrir nos offres
                  <svg className="transition-transform group-hover:translate-x-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Chiffre d'affaires + fidélisation */}
              <div className="grid gap-6 lg:grid-cols-3 mt-6">
                <div className="lg:col-span-2">
                  <RevenueChart dataPoints={data.revenueChart} />
                </div>
                <RepeatCustomerGauge rate={data.repeatCustomerRate} />
              </div>

              {/* Activité hebdo + typologie clients */}
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <ActiveDaysChart days={data.activeDays} />
                </div>
                <CustomerSegments segments={data.customerSegments} />
              </div>

              {/* Meilleures ventes */}
              <BestSellersTable products={data.bestSellers} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardCard className="p-6 lg:col-span-2">
          <Skeleton className="h-52 w-full" />
        </DashboardCard>
        <DashboardCard className="p-5">
          <Skeleton className="h-32 w-full rounded-full" />
        </DashboardCard>
      </div>
      <DashboardCard className="p-6">
        <Skeleton className="h-44 w-full" />
      </DashboardCard>
    </div>
  );
}
