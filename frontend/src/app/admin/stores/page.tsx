"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAdminStores } from "@/hooks/useAdminStores";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { MiniStat } from "@/components/dashboard/ui/MiniStat";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { cn, timeAgo, formatFcfa } from "@/lib/utils";
import {
  StoreStatusBadge,
  PlanBadge,
} from "@/components/admin/stores/StoreBadges";
import { AdminKpiButton } from "@/components/admin/ui/AdminBits";
import { VerificationStatusBadge } from "@/components/admin/verification/VerificationBadges";
import type {
  AdminStoreRow,
  AdminStoreStatus,
} from "@/types/admin";

type StatusTab = "all" | AdminStoreStatus;

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "ACTIVE", label: "Actives" },
  { value: "PENDING", label: "En attente" },
  { value: "SUSPENDED", label: "Suspendues" },
  { value: "BLOCKED", label: "Bloquées" },
];

type SortKey = "recent" | "gmv" | "orders" | "oldest";

/**
 * Stores Management (doc 05) — liste des boutiques de la plateforme :
 * KPIs, recherche, filtres, tri, table desktop + cartes mobile, export CSV.
 */
export default function StoresPage() {
  const { data, loading, error, refresh } = useAdminStores();
  const [tab, setTab] = useState<StatusTab>("all");
  const [plan, setPlan] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  // Options de plan dérivées des données réelles (noms servis par le backend)
  const planOptions = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.rows.map((r) => r.plan))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rows
      .filter((r) => {
        const matchTab = tab === "all" || r.status === tab;
        const matchPlan = plan === "all" || r.plan === plan;
        const matchQuery =
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          r.merchantName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q);
        return matchTab && matchPlan && matchQuery;
      })
      .sort((a, b) => {
        switch (sort) {
          case "gmv":
            return b.gmvFcfa - a.gmvFcfa;
          case "orders":
            return b.ordersCount - a.ordersCount;
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          default:
            return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
        }
      });
  }, [data, tab, plan, query, sort]);

  const kpis = data?.kpis;

  /** Export CSV réel des lignes filtrées (doc 05 — §41) */
  const exportCsv = () => {
    const rows: AdminStoreRow[] = filtered;
    const header = ["ID", "Boutique", "Slug", "Marchand", "Statut", "Vérification", "Formule", "Commandes", "GMV", "Créée le"];
    const lines = [
      header.join(";"),
      ...rows.map((r) =>
        [
          r.id,
          `"${r.name}"`,
          r.slug,
          `"${r.merchantName}"`,
          r.status,
          r.verificationStatus ?? "",
          r.plan,
          r.ordersCount,
          r.gmvFcfa,
          new Date(r.createdAt).toLocaleDateString("fr-FR"),
        ].join(";")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Gouvernance"
        title="Stores Management"
        description="Supervise and govern every store on the platform."
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

      {/* KPIs du module (doc 05 §6/§7) — cliquables : ouvrent le filtre correspondant */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <AdminKpiButton active={tab === "all"} onClick={() => setTab("all")} label="Total" value={String(kpis?.total ?? "-")} tone="ivory" />
        <AdminKpiButton active={tab === "ACTIVE"} onClick={() => setTab("ACTIVE")} label="Actives" value={String(kpis?.active ?? "-")} tone="green" />
        <AdminKpiButton active={tab === "PENDING"} onClick={() => setTab("PENDING")} label="En attente" value={String(kpis?.pending ?? "-")} tone="gold" />
        <AdminKpiButton active={tab === "SUSPENDED"} onClick={() => setTab("SUSPENDED")} label="Suspendues" value={String(kpis?.suspended ?? "-")} tone="blue" />
        <AdminKpiButton active={tab === "BLOCKED"} onClick={() => setTab("BLOCKED")} label="Bloquées" value={String(kpis?.blocked ?? "-")} tone="terracotta" />
        <MiniStat icon="sparkle" label="Nouvelles (30 j)" value={String(kpis?.newStores ?? "-")} tone="gold" />
      </div>

      {/* Filtres + recherche */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors",
                tab === t.value
                  ? "bg-blue-700 font-semibold text-white shadow-sm shadow-blue-700/20"
                  : "text-ink-600 hover:text-ink-950"
              )}
              aria-pressed={tab === t.value}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            aria-label="Filtrer par formule"
            className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink-700 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          >
            <option value="all">Toutes formules</option>
            {planOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stores, merchants…"
              className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      <DashboardCard className="p-6">
        <CardHeader
          title={`${filtered.length} boutique${filtered.length > 1 ? "s" : ""}`}
          subtitle={query || tab !== "all" || plan !== "all" ? "Résultat du filtre actif" : "Toutes les boutiques de la plateforme"}
          action={
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Trier"
              className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-600 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
            >
              <option value="recent">Plus récentes d&apos;abord</option>
              <option value="oldest">Plus anciennes d&apos;abord</option>
              <option value="gmv">GMV décroissant</option>
              <option value="orders">Commandes décroissantes</option>
            </select>
          }
        />

        {loading || !data ? (
          <div className="mt-2">
            <TableSkeleton rows={6} cols={7} />
          </div>
        ) : error ? (
          <EmptyState
            icon="alert"
            title="Impossible de charger les boutiques"
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
            icon="store"
            title="Aucune boutique trouvée"
            description="Aucune boutique ne correspond à ces critères."
            action={
              tab !== "all" || query || plan !== "all" ? (
                <button
                  onClick={() => {
                    setTab("all");
                    setPlan("all");
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
              <table className="w-full min-w-[820px] text-left text-xs text-ink-700">
                <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-2 py-3">BOUTIQUE</th>
                    <th className="px-2 py-3">MARCHAND</th>
                    <th className="px-2 py-3">STATUT</th>
                    <th className="px-2 py-3">VÉRIFICATION</th>
                    <th className="px-2 py-3">FORMULE</th>
                    <th className="px-2 py-3 text-right">COMMANDES</th>
                    <th className="px-2 py-3 text-right">GMV</th>
                    <th className="px-2 py-3">ACTIVITÉ</th>
                    <th className="px-2 py-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {filtered.map((r) => (
                    <tr key={r.id} className="group transition-colors hover:bg-ink-50/70">
                      <td className="px-2 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.name} size="sm" />
                          <div>
                            <p className="font-medium text-ink-950 transition-colors group-hover:text-gold-strong">
                              {r.name}
                            </p>
                            <p className="font-mono text-[10px] text-ink-400">/{r.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3.5 text-ink-800">{r.merchantName}</td>
                      <td className="px-2 py-3.5">
                        <StoreStatusBadge status={r.status} />
                      </td>
                      <td className="px-2 py-3.5">
                        {r.verificationStatus ? (
                          <VerificationStatusBadge status={r.verificationStatus} />
                        ) : (
                          <span className="text-ink-300">-</span>
                        )}
                      </td>
                      <td className="px-2 py-3.5">
                        <PlanBadge plan={r.plan} />
                      </td>
                      <td className="px-2 py-3.5 text-right font-mono text-[11px] text-ink-700">
                        {r.ordersCount.toLocaleString("fr-FR")}
                      </td>
                      <td className="px-2 py-3.5 text-right font-mono text-[11px] text-ink-700">
                        {formatFcfa(r.gmvFcfa)}
                      </td>
                      <td className="px-2 py-3.5 font-mono text-[11px] text-ink-500">
                        {timeAgo(r.lastActivityAt)}
                      </td>
                      <td className="px-2 py-3.5 text-right">
                        <Link
                          href={`/admin/stores/${r.id}`}
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

            {/* Cartes mobile */}
            <div className="mt-3 grid gap-3 md:hidden">
              {filtered.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/stores/${r.id}`}
                  className="card-lux flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-gold-soft"
                >
                  <Avatar name={r.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink-950">{r.name}</p>
                      <StoreStatusBadge status={r.status} />
                    </div>
                    <p className="truncate text-[11px] text-ink-500">{r.merchantName}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <PlanBadge plan={r.plan} />
                      <span className="font-mono text-[10px] text-ink-400">
                        {formatFcfa(r.gmvFcfa)}
                      </span>
                    </div>
                  </div>
                  <Icon name="chevronRight" size={16} className="text-ink-300" />
                </Link>
              ))}
            </div>
          </>
        )}
      </DashboardCard>
    </div>
  );
}
