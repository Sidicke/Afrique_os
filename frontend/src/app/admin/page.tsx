"use client";

import { useEffect, useState } from "react";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { useAdminPeriod } from "@/lib/useAdminPeriod";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { AdminKpiCard } from "@/components/admin/overview/AdminKpiCard";
import { PriorityActions } from "@/components/admin/overview/PriorityActions";
import { PlatformPerformance } from "@/components/admin/overview/PlatformPerformance";
import { RecentActivity } from "@/components/admin/overview/RecentActivity";
import { SystemStatus } from "@/components/admin/overview/SystemStatus";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

/**
 * Homepage du dashboard Administrateur Général — Command Center fluide et épuré.
 * Hiérarchie : KPIS STRATÉGIQUES → PERFORMANCE & ACTIONS URGENTES → ACTIVITÉ & SANTÉ SYSTÈME.
 */
export default function AdminOverviewPage() {
  const period = useAdminPeriod();
  const { data, loading, error, refresh } = useAdminOverview(period);

  // Salutation calculée après montage uniquement (évite le mismatch d'hydratation)
  const [greet, setGreet] = useState("Bonjour");
  const [today, setToday] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => {
      setGreet(greeting());
      setToday(
        new Date().toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome / Context Bar */}
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-strong">
          {today || "Aujourd'hui"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
          {greet}, Admin.
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-ink-500">
          Vue d&apos;ensemble et indicateurs clés de votre plateforme en temps réel.
        </p>
      </div>

      {loading ? (
        <AdminOverviewSkeleton />
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
          {/* KPI Overview — Grille adaptative 2 cols mobile, 3 tablet, 6 desktop */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {data.kpis.map((kpi) => (
              <AdminKpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>

          {/* Ligne 1 : Performance de la plateforme (2/3) + Actions prioritaires (1/3) */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PlatformPerformance
                series={data.performance.series}
                defaultMetric={data.performance.defaultMetric}
              />
            </div>
            <div className="lg:col-span-1">
              <PriorityActions actions={data.priorityActions} />
            </div>
          </div>

          {/* Ligne 2 : Activité en direct (2/3) + Santé du système (1/3) */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentActivity events={data.activity} />
            </div>
            <div className="lg:col-span-1">
              <SystemStatus components={data.systemStatus} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Squelette de la page — aligné sur la nouvelle structure fluide */
function AdminOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-sm shadow-ink-950/[0.03]">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16 sm:w-24" />
              <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" />
            </div>
            <Skeleton className="mt-4 sm:mt-5 h-6 sm:h-7 w-20 sm:w-28" />
            <Skeleton className="mt-2.5 sm:mt-3 h-3.5 sm:h-4 w-16 sm:w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-sm shadow-ink-950/[0.03] lg:col-span-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-4 h-52 w-full" />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-sm shadow-ink-950/[0.03]">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-52" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-sm shadow-ink-950/[0.03] lg:col-span-2">
          <Skeleton className="h-4 w-36" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-sm shadow-ink-950/[0.03]">
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
