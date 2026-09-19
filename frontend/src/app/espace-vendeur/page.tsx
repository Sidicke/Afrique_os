"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { useLiveNotifications } from "@/components/dashboard/ui/LiveNotificationProvider";
import { Skeleton, KpiSkeleton, TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import { merchantProfile } from "@/services/dashboardService";
import KPICardsGroup from "@/components/dashboard/overview/KPICardsGroup";
import { RecentOrdersCard } from "@/components/dashboard/overview/RecentOrdersCard";
import { WelcomeHeader } from "@/components/dashboard/overview/WelcomeHeader";
import { QuickActions } from "@/components/dashboard/overview/QuickActions";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function DashboardPage() {
  const { data, loading, error, refreshData } = useDashboard();
  const { notify } = useLiveNotifications();

  const firstName = merchantProfile.name.split(" ")[0];
  // Salutation et date calculées après montage uniquement (client) : évite un
  // désaccord d'hydratation avec le HTML pré-rendu au build (règle Next.js).
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
          year: "numeric",
        })
      );
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* ⚠️ Ordre des conditions : `error` AVANT `!data` — sinon le squelette
          tourne à l'infini en cas d'échec API (statistiques invisibles). */}
      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="h-10 w-72 animate-pulse rounded-xl bg-ink-100/80" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-ink-100/80" />
        </div>
      ) : data ? (
        <WelcomeHeader data={data} greet={greet} firstName={firstName} today={today} />
      ) : null}

      {loading ? (
        <OverviewSkeleton />
      ) : error || !data ? (
        <DashboardCard className="flex flex-col items-center gap-3 p-10 text-center">
          <Icon name="alert" size={28} className="text-red-600" />
          <p className="text-sm text-ink-700">{error}</p>
          <button
            onClick={refreshData}
            className="rounded-xl border border-gold-soft px-4 py-2 font-mono text-xs text-gold-strong hover:bg-gold-wash"
          >
            Réessayer
          </button>
        </DashboardCard>
      ) : (
        <>
          {/* Raccourcis — les gestes les plus fréquents en un clic */}
          <QuickActions />

          {/* Indicateurs clés */}
          <KPICardsGroup
            kpis={[data.kpis.revenue, data.kpis.visitors, data.kpis.conversionRate, data.kpis.orders]}
          />

          {/* Activité récente */}
          <RecentOrdersCard orders={data.recentOrders} />
        </>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <DashboardCard className="p-6">
        <Skeleton className="h-5 w-56" />
        <div className="mt-4">
          <TableSkeleton rows={4} cols={5} />
        </div>
      </DashboardCard>
    </div>
  );
}
