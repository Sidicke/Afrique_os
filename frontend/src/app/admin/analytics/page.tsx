"use client";

import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { useAdminPeriod } from "@/lib/useAdminPeriod";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { AdminKpiCard } from "@/components/admin/overview/AdminKpiCard";
import { GrowthChart } from "@/components/admin/analytics/GrowthChart";
import { FunnelChart } from "@/components/admin/analytics/FunnelChart";
import { CategoryBars } from "@/components/admin/analytics/CategoryBars";
import { TopTables } from "@/components/admin/analytics/TopTables";
import { TrendsList } from "@/components/admin/analytics/TrendsList";
import type { AdminCategoryPerformance } from "@/types/admin";

/**
 * Analytics (doc 09) — le centre d'intelligence de la plateforme : croissance,
 * funnel vendeur, catégories, classements et tendances. La période globale du
 * topbar pilote la granularité des séries. Un seul graphique principal par
 * zone — jamais de mur de graphiques.
 */
export default function AnalyticsPage() {
  const period = useAdminPeriod();
  const { data, loading, error, refresh } = useAdminAnalytics(period);

  /** Export CSV des catégories analysées (doc 09 §26 — architecture d'export) */
  const exportCsv = () => {
    const rows: AdminCategoryPerformance[] = data?.categories ?? [];
    const header = ["Catégorie", "Boutiques", "Produits", "Commandes", "GMV (FCFA)", "Croissance %"];
    const lines = [
      header.join(";"),
      ...rows.map((c) =>
        [c.name, c.storesCount, c.productsCount, c.ordersCount, c.gmvFcfa, c.growthPercent].join(";")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-categories-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Analytiques"
        description="Comprendre comment la plateforme évolue, pourquoi et où elle va."
        actions={
          <>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-700 shadow-sm transition-all hover:border-gold-mid hover:text-gold-strong active:scale-95"
            >
              <Icon name="download" size={14} /> Exporter
            </button>
            <button
              onClick={refresh}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-700 shadow-sm transition-all hover:border-gold-mid hover:text-gold-strong active:scale-95"
            >
              <Icon name="refresh" size={14} /> Actualiser
            </button>
          </>
        }
      />


      {loading ? (
        <AnalyticsSkeleton />
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
          {/* KPI principaux (doc 09 §6) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {data.kpis.map((kpi) => (
              <AdminKpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>

          {/* Croissance (doc 09 §7) + Funnel vendeur (doc 09 §10) */}
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <GrowthChart series={data.growth} loading={loading} />
            </div>
            <FunnelChart funnel={data.funnel} loading={loading} />
          </div>

          {/* Catégories (doc 09 §18) + Tendances (doc 09 §22/§23) */}
          <div className="grid gap-6 xl:grid-cols-2">
            <CategoryBars categories={data.categories} loading={loading} />
            <TrendsList trends={data.trends} loading={loading} />
          </div>

          {/* Classements (doc 09 §16/§17/§19) */}
          <TopTables
            stores={data.topStores}
            products={data.topProducts}
            searchTerms={data.searchTerms}
          />
        </>
      )}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-5 shadow-sm shadow-ink-950/[0.03]">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-5 h-7 w-28" />
            <Skeleton className="mt-3 h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-ink-950/[0.03] xl:col-span-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-4 h-52 w-full" />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-ink-950/[0.03]">
          <Skeleton className="h-4 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-ink-950/[0.03]">
            <Skeleton className="h-4 w-40" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-ink-950/[0.03]">
            <Skeleton className="h-4 w-36" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
