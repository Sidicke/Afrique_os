"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAdminSubscriptions } from "@/hooks/useAdminSubscriptions";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { MiniStat } from "@/components/dashboard/ui/MiniStat";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { cn, timeAgo, formatCurrency } from "@/lib/utils";
import { SubscriptionStatusBadge, PlanBadge } from "@/components/admin/stores/StoreBadges";
import { BillingCycleBadge } from "@/components/admin/subscriptions/SubscriptionBadges";
import { RevenueChart } from "@/components/admin/subscriptions/RevenueChart";
import { PlansManager } from "@/components/admin/subscriptions/PlansManager";
import { AdminKpiButton } from "@/components/admin/ui/AdminBits";
import type { AdminPlan } from "@/types/admin";
import type { AdminSubscriptionStatus } from "@/types/admin";

type StatusFilter = "all" | AdminSubscriptionStatus;

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tous statuts" },
  { value: "ACTIVE", label: "Actifs" },
  { value: "TRIAL", label: "Essais" },
  { value: "PAST_DUE", label: "En retard" },
  { value: "SUSPENDED", label: "Suspendus" },
  { value: "CANCELLED", label: "Annulés" },
];

/** Couleurs de la répartition par plan — cohérentes avec les badges de formule */
const PLAN_COLORS: Record<string, string> = {
  Starter: "bg-ink-200",
  Growth: "bg-blue-600",
  Pro: "bg-gold-strong",
  Business: "bg-ink-950",
};

/**
 * Subscriptions & Revenue (doc 08) — centre de pilotage économique de la
 * plateforme : MRR/ARR/churn/conversion, graphique de revenus, répartition
 * par plan, essais à expiration, alertes et tableau des abonnements.
 */
export default function SubscriptionsPage() {
  const { data, loading, error, refresh } = useAdminSubscriptions();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  // État local des plans : initialisé depuis les données (source de vérité du
  // service), puis mis à jour après activation / désactivation sans recharger
  const [plansLocal, setPlansLocal] = useState<AdminPlan[]>([]);

  const updatePlan = (updated: AdminPlan) => {
    setPlansLocal((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Tant que l'utilisateur n'a pas modifié un plan, on affiche les données
  // du service ; dès qu'une action a eu lieu, l'état local prend le relais.
  const plans = plansLocal.length > 0 ? plansLocal : (data?.plans ?? []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rows
      .filter((r) => {
        const matchStatus = status === "all" || r.status === status;
        const matchQuery =
          !q ||
          r.store.name.toLowerCase().includes(q) ||
          r.ownerName.toLowerCase().includes(q) ||
          r.plan.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q);
        return matchStatus && matchQuery;
      })
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [data, status, query]);

  const kpis = data?.kpis;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Revenue"
        title="Subscriptions & Revenue"
        description="Understand how the platform generates money."
        actions={
          <button
            onClick={refresh}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-700 shadow-sm transition-all hover:border-gold-mid hover:text-gold-strong active:scale-95"
          >
            <Icon name="refresh" size={14} /> Actualiser
          </button>
        }
      />

      {/* KPIs (doc 08 §4) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MiniStat
          icon="wallet"
          label="MRR"
          value={kpis ? formatCurrency(kpis.mrrFcfa) : "-"}
          tone="gold"
          hint={kpis ? `+${kpis.mrrChangePercent}% ce mois` : undefined}
        />
        <MiniStat
          icon="chart"
          label="ARR"
          value={kpis ? formatCurrency(kpis.arrFcfa) : "-"}
          tone="blue"
          hint={kpis ? `+${kpis.arrChangePercent}%` : undefined}
        />
        <MiniStat
          icon="store"
          label="Abonnements actifs"
          value={String(kpis?.activeSubscriptions ?? "-")}
          tone="green"
          hint={kpis ? `${formatCurrency(kpis.revenuePerPaidStoreFcfa)} / boutique` : undefined}
        />
        <AdminKpiButton
          active={status === "TRIAL"}
          onClick={() => setStatus(status === "TRIAL" ? "all" : "TRIAL")}
          label="Essais en cours"
          value={String(kpis?.trialsActive ?? "-")}
          tone="ivory"
        />
        <MiniStat
          icon="sparkle"
          label="Conversion trial → paid"
          value={kpis ? `${kpis.trialConversionPercent} %` : "-"}
          tone="blue"
        />
        <MiniStat
          icon="alert"
          label="Churn mensuel"
          value={kpis ? `${kpis.churnPercent} %` : "-"}
          tone={kpis && kpis.churnPercent > 3 ? "terracotta" : "ivory"}
        />
      </div>

      {/* Graphique revenus (doc 08 §6) + Répartition par plan (doc 08 §7) */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart series={data?.revenueSeries} loading={loading || !data} />
        </div>

        {/* Répartition par plan */}
        <DashboardCard className="p-6">
          <CardHeader title="Répartition par plan" subtitle="Boutiques payantes + essais" />
          {loading || !data ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-2 w-full animate-pulse rounded bg-ink-100" />
                  <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {plans.map((p) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-800">{p.name}</span>
                    <span className="font-mono text-[10px] text-ink-500">
                      {p.subscribersCount} · {p.shareOfMrrPercent > 0 ? `${p.shareOfMrrPercent} % MRR` : `${formatCurrency(p.mrrFcfa)}`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", PLAN_COLORS[p.name] ?? "bg-ink-400")}
                      style={{ width: `${Math.min(100, (p.subscribersCount / 215) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Gestion des plans (doc 08 §9/§9.1) */}
      {!loading && data && <PlansManager plans={plans} onPlanUpdated={updatePlan} />}

      {/* Alertes (doc 08 §19) */}
      {!loading && data && data.alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
            <Icon name="alert" size={14} /> Points d&apos;attention
          </p>
          <ul className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {data.alerts.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-amber-100 bg-surface px-4 py-3 text-xs leading-relaxed text-ink-700"
              >
                {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Essais arrivant à expiration (doc 08 §10.1) + Événements récents (doc 08 §18) */}
      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard className="p-6">
          <CardHeader title="Essais arrivant à expiration" subtitle="Surveillance des conversions" />
          <div className="mt-4 space-y-2.5">
            {!loading && data && data.trialsExpiring.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
                Aucun essai à surveiller.
              </p>
            ) : (
              (data?.trialsExpiring ?? []).map((t) => (
                <Link
                  key={t.storeId}
                  href={`/admin/stores/${t.storeId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-50/40 px-4 py-3 transition-all hover:border-gold-soft"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink-950">{t.storeName}</p>
                    <p className="font-mono text-[10px] text-ink-400">{t.plan} Trial</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold",
                      t.expiresInDays <= 3 ? "bg-red-100 text-red-600" : "bg-gold-wash text-gold-strong"
                    )}
                  >
                    Expire dans {t.expiresInDays} j
                  </span>
                </Link>
              ))
            )}
          </div>
        </DashboardCard>

        {/* Événements récents (doc 08 §18) */}
        <DashboardCard className="p-6">
          <CardHeader title="Événements récents" subtitle="Activité économique de la plateforme" />
          <ul className="mt-4 space-y-0">
            {loading || !data ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-ink-100" />
                ))}
              </div>
            ) : (
              data.events.map((ev) => (
                <li key={ev.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-500">
                    <Icon
                      name={
                        ev.type === "upgrade"
                          ? "arrowUpRight"
                          : ev.type === "downgrade"
                            ? "arrowDownRight"
                            : ev.type === "cancel"
                              ? "x"
                              : ev.type === "new_trial"
                                ? "sparkle"
                                : "refresh"
                      }
                      size={13}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink-800">
                      <span className="font-semibold text-ink-950">{ev.actor}</span> {ev.description}
                    </p>
                  </div>
                  <p className="font-mono text-[10px] text-ink-400">{timeAgo(ev.timestamp)}</p>
                </li>
              ))
            )}
          </ul>
        </DashboardCard>
      </div>

      {/* Filtres + recherche (doc 08 §20/§21) */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
          {STATUS_FILTERS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors",
                status === t.value
                  ? "bg-blue-700 font-semibold text-white shadow-sm shadow-blue-700/20"
                  : "text-ink-600 hover:text-ink-950"
              )}
              aria-pressed={status === t.value}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full xl:w-72">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search store, owner, plan…"
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Table des abonnements (doc 08 §11) */}
      <DashboardCard className="p-6">
        <CardHeader
          title={`${filtered.length} abonnement${filtered.length > 1 ? "s" : ""}`}
          subtitle={query || status !== "all" ? "Résultat du filtre actif" : "Abonnements de la plateforme"}
        />

        {loading || !data ? (
          <div className="mt-2">
            <TableSkeleton rows={6} cols={7} />
          </div>
        ) : error ? (
          <EmptyState
            icon="alert"
            title="Impossible de charger les abonnements"
            description={error}
            action={
              <button
                onClick={refresh}
                className="rounded-xl border border-gold-soft px-4 py-2 font-mono text-xs text-gold-strong hover:bg-gold-wash"
              >
                Réessayer
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="Aucun abonnement trouvé"
            description="Aucun abonnement ne correspond à ces critères."
            action={
              status !== "all" || query ? (
                <button
                  onClick={() => {
                    setStatus("all");
                    setQuery("");
                  }}
                  className="rounded-xl border border-line px-4 py-2 font-mono text-xs text-ink-600 hover:border-gold-mid hover:text-gold-strong"
                >
                  Effacer les filtres
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Table desktop */}
            <div className="mt-2 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[840px] text-left text-xs text-ink-700">
                <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-2 py-3">BOUTIQUE</th>
                    <th className="px-2 py-3">PLAN</th>
                    <th className="px-2 py-3">STATUT</th>
                    <th className="px-2 py-3">CYCLE</th>
                    <th className="px-2 py-3 text-right">MONTANT</th>
                    <th className="px-2 py-3">ÉCHÉANCE</th>
                    <th className="px-2 py-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {filtered.map((r) => (
                    <tr key={r.id} className="group transition-colors hover:bg-ink-50/70">
                      <td className="px-2 py-3.5">
                        <p className="font-medium text-ink-950 transition-colors group-hover:text-gold-strong">
                          {r.store.name}
                        </p>
                        <p className="font-mono text-[10px] text-ink-400">{r.ownerName}</p>
                      </td>
                      <td className="px-2 py-3.5">
                        <PlanBadge plan={r.plan} />
                      </td>
                      <td className="px-2 py-3.5">
                        <SubscriptionStatusBadge status={r.status} />
                      </td>
                      <td className="px-2 py-3.5">
                        <BillingCycleBadge cycle={r.billingCycle} />
                      </td>
                      <td className="px-2 py-3.5 text-right font-mono text-[11px] text-ink-800">
                        {r.amountFcfa > 0 ? formatCurrency(r.amountFcfa) : "-"}
                      </td>
                      <td className="px-2 py-3.5 font-mono text-[11px] text-ink-500">
                        {r.renewalDate ? new Date(r.renewalDate).toLocaleDateString("fr-FR") : "-"}
                      </td>
                      <td className="px-2 py-3.5 text-right">
                        <Link
                          href={`/admin/subscriptions/${r.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 font-mono text-[10px] font-semibold text-blue-700 transition-colors hover:border-blue-600 hover:bg-blue-50"
                        >
                          Ouvrir
                          <Icon name="chevronRight" size={10} strokeWidth={2.2} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cartes mobile (doc 08 §27) */}
            <div className="mt-3 grid gap-3 md:hidden">
              {filtered.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/subscriptions/${r.id}`}
                  className="card-lux rounded-2xl border border-line bg-surface p-4 transition-all hover:border-gold-soft"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink-950">{r.store.name}</p>
                    <SubscriptionStatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-500">{r.ownerName}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <PlanBadge plan={r.plan} />
                    <BillingCycleBadge cycle={r.billingCycle} />
                    <span className="font-mono text-[10px] text-ink-400">
                      {r.amountFcfa > 0 ? formatCurrency(r.amountFcfa) : "Gratuit"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </DashboardCard>
    </div>
  );
}
