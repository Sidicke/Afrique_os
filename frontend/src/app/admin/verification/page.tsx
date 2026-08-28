"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAdminVerifications } from "@/hooks/useAdminVerifications";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { MiniStat } from "@/components/dashboard/ui/MiniStat";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { cn, timeAgo } from "@/lib/utils";
import type { AdminVerificationRow } from "@/types/admin";
import {
  VerificationStatusBadge,
  VerificationPriorityBadge,
} from "@/components/admin/verification/VerificationBadges";
import type { AdminVerificationStatus } from "@/types/admin";

type StatusTab = "all" | AdminVerificationStatus;

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "PENDING", label: "En attente" },
  { value: "IN_REVIEW", label: "En examen" },
  { value: "CHANGES_REQUIRED", label: "Corrections" },
  { value: "APPROVED", label: "Approuvés" },
  { value: "REJECTED", label: "Rejetés" },
];

/** Priorité de traitement : les dossiers urgents apparaissent en premier */
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

/**
 * Verification Center (doc 04) — liste des dossiers de vérification des
 * vendeurs : KPIs, recherche, filtres, tri, table desktop + cartes mobile.
 */
export default function VerificationPage() {
  const { data, loading, error, refresh } = useAdminVerifications();
  const [tab, setTab] = useState<StatusTab>("all");
  const [query, setQuery] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rows
      .filter((r) => {
        const matchTab = tab === "all" || r.status === tab;
        const matchQuery =
          !q ||
          r.merchantName.toLowerCase().includes(q) ||
          r.storeName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q);
        return matchTab && matchQuery;
      })
      .sort((a, b) => {
        const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (p !== 0) return p;
        return sortDesc
          ? new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          : new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      });
  }, [data, tab, query, sortDesc]);

  const kpis = data?.kpis;

  /** Export CSV réel des lignes filtrées (doc 04 §41 : export selon permissions) */
  const exportCsv = () => {
    const rows: AdminVerificationRow[] = filtered;
    const header = ["ID", "Vendeur", "Boutique", "Soumis", "Statut", "Priorité", "Assigné à"];
    const lines = [
      header.join(";"),
      ...rows.map((r) =>
        [
          r.id,
          `"${r.merchantName}"`,
          `"${r.storeName}"`,
          new Date(r.submittedAt).toLocaleDateString("fr-FR"),
          r.status,
          r.priority,
          r.assignedTo ?? "",
        ].join(";")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verifications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Gouvernance"
        title="Verification Center"
        description="Review and manage merchant verification requests."
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

      {/* KPIs du module (doc 04 §7) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MiniStat icon="shield" label="En attente" value={String(kpis?.pending ?? "-")} tone="gold" />
        <MiniStat icon="clock" label="En examen" value={String(kpis?.inReview ?? "-")} tone="blue" />
        <MiniStat icon="edit" label="Corrections" value={String(kpis?.changesRequired ?? "-")} tone="ivory" />
        <MiniStat icon="checkCircle" label="Approuvés" value={String(kpis?.approved ?? "-")} tone="green" />
        <MiniStat icon="alert" label="Rejetés" value={String(kpis?.rejected ?? "-")} tone="terracotta" />
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

        <div className="relative w-full lg:w-72">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search merchants, stores, emails…"
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>
      </div>

      <DashboardCard className="p-6">
        <CardHeader
          title={`${filtered.length} dossier${filtered.length > 1 ? "s" : ""}`}
          subtitle={query || tab !== "all" ? "Résultat du filtre actif" : "Tous les dossiers de vérification"}
          action={
            <button
              onClick={() => setSortDesc((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-600 transition-colors hover:border-gold-mid hover:text-gold-strong"
            >
              <Icon name="filter" size={13} />
              {sortDesc ? "Plus récents d'abord" : "Plus anciens d'abord"}
            </button>
          }
        />

        {loading || !data ? (
          <div className="mt-2">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : error ? (
          <EmptyState
            icon="alert"
            title="Impossible de charger les dossiers"
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
            icon="shield"
            title="Aucun dossier trouvé"
            description="Aucune demande ne correspond à ces critères : vous êtes à jour."
            action={
              tab !== "all" || query ? (
                <button
                  onClick={() => {
                    setTab("all");
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
              <table className="w-full min-w-[760px] text-left text-xs text-ink-700">
                <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-2 py-3">VENDEUR</th>
                    <th className="px-2 py-3">BOUTIQUE</th>
                    <th className="px-2 py-3">SOUMIS</th>
                    <th className="px-2 py-3">STATUT</th>
                    <th className="px-2 py-3">PRIORITÉ</th>
                    <th className="px-2 py-3">ASSIGNÉ À</th>
                    <th className="px-2 py-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {filtered.map((r) => (
                    <tr key={r.id} className="group transition-colors hover:bg-ink-50/70">
                      <td className="px-2 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.merchantName} size="sm" />
                          <div>
                            <p className="font-medium text-ink-950 transition-colors group-hover:text-gold-strong">
                              {r.merchantName}
                            </p>
                            <p className="font-mono text-[10px] text-ink-400">{r.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3.5 font-medium text-ink-800">{r.storeName}</td>
                      <td className="px-2 py-3.5 font-mono text-[11px] text-ink-500">
                        {timeAgo(r.submittedAt)}
                      </td>
                      <td className="px-2 py-3.5">
                        <VerificationStatusBadge status={r.status} />
                      </td>
                      <td className="px-2 py-3.5">
                        <VerificationPriorityBadge priority={r.priority} />
                      </td>
                      <td className="px-2 py-3.5 text-ink-600">
                        {r.assignedTo ?? <span className="text-ink-300">-</span>}
                      </td>
                      <td className="px-2 py-3.5 text-right">
                        <Link
                          href={`/admin/verification/${r.id}`}
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
                  href={`/admin/verification/${r.id}`}
                  className="card-lux flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-gold-soft"
                >
                  <Avatar name={r.merchantName} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-950">{r.storeName}</p>
                    <p className="truncate text-[11px] text-ink-500">{r.merchantName}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <VerificationStatusBadge status={r.status} />
                      <span className="font-mono text-[10px] text-ink-400">{timeAgo(r.submittedAt)}</span>
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
