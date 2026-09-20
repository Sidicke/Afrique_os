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

          {/* Évolution des Ventes (Disponible pour tous les plans) */}
          <div className="grid gap-6 lg:grid-cols-3 mt-6">
            <div className="lg:col-span-2">
              <RevenueChart dataPoints={data.revenueChart} />
            </div>
            
            {data.requiresBusiness ? (
              <div className="relative overflow-hidden rounded-[2rem] bg-midnight-950 p-6 sm:p-8 shadow-xl flex flex-col items-center justify-center text-center">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold-500/20 blur-[50px] pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-blue-500/20 blur-[50px] pointer-events-none" />
                
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-lg shadow-gold-500/30 z-10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <h3 className="mb-2 font-display text-xl font-extrabold text-white tracking-tight z-10">
                  Analyses Avancées
                </h3>
                <p className="mb-6 text-sm text-ivory-50/70 leading-relaxed max-w-[250px] z-10">
                  Débloquez la <strong className="text-gold-300 font-semibold">fidélisation</strong>, la <strong className="text-gold-300 font-semibold">segmentation client</strong> et l'analyse complète de votre catalogue avec le plan Business.
                </p>
                <a
                  href="/espace-vendeur/parametres/formule"
                  className="group inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-2.5 text-xs font-bold text-midnight-950 transition-all hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/25 hover:-translate-y-0.5 active:scale-95 z-10"
                >
                  Découvrir
                  <svg className="transition-transform group-hover:translate-x-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </a>
              </div>
            ) : (
              <RepeatCustomerGauge rate={data.repeatCustomerRate} />
            )}
          </div>

          {!data.requiresBusiness ? (
            <>
              {/* Activité hebdo + typologie clients (Business Uniquement) */}
              <div className="grid gap-6 lg:grid-cols-3 mt-6">
                <div className="lg:col-span-2">
                  <ActiveDaysChart days={data.activeDays} />
                </div>
                <CustomerSegments segments={data.customerSegments} />
              </div>

              {/* Meilleures ventes Complètes */}
              <div className="mt-6">
                <BestSellersTable products={data.bestSellers} />
              </div>
            </>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              <h3 className="font-display text-lg font-bold text-ink-950 px-1">Aperçu de vos Meilleures Ventes</h3>
              <div className="relative">
                <BestSellersTable products={data.bestSellers.slice(0, 3)} />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface to-transparent flex items-end justify-center pb-2">
                  <p className="text-sm font-medium text-ink-500 bg-surface/80 px-4 py-1 rounded-full backdrop-blur-sm border border-line">
                    Passez au plan Business pour voir la liste complète
                  </p>
                </div>
              </div>
            </div>
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
