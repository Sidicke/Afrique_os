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
            kpis={[data.kpis.revenue, data.kpis.orders, data.kpis.avgBasket, data.kpis.conversion]}
          />

          {/* Chiffre d'affaires + fidélisation */}
          <div className="grid gap-6 lg:grid-cols-3">
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
