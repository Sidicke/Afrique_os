"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAdminModeration } from "@/hooks/useAdminModeration";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { MiniStat } from "@/components/dashboard/ui/MiniStat";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { cn, timeAgo } from "@/lib/utils";
import {
  ReportStatusBadge,
  ReportTypeBadge,
  SeverityBadge,
  IncidentStatusBadge,
} from "@/components/admin/moderation/ModerationBadges";
import type { AdminReportRow, AdminSeverity } from "@/types/admin";

type Tab = "reports" | "incidents" | "risk" | "audit";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "reports", label: "Signalements" },
  { value: "incidents", label: "Incidents" },
  { value: "risk", label: "Boutiques à risque" },
  { value: "audit", label: "Journal d'activité" },
];

const SEVERITY_FILTERS: Array<{ value: AdminSeverity | "all"; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "critical", label: "Critiques" },
  { value: "high", label: "Élevées" },
  { value: "medium", label: "Moyennes" },
  { value: "low", label: "Faibles" },
];

/**
 * Moderation & Security (doc 10) — signalements, incidents, boutiques à
 * risque et journal administratif. Chaque entrée conserve son contexte et
 * ouvre vers le module concerné (boutique, utilisateur).
 */
export default function ModerationPage() {
  const { data, loading, error, refresh } = useAdminModeration();
  const [tab, setTab] = useState<Tab>("reports");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<AdminSeverity | "all">("all");

  const filteredReports = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.reports
      .filter((r) => {
        const matchSeverity = severity === "all" || r.severity === severity;
        const matchQuery =
          !q ||
          r.targetLabel.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q);
        return matchSeverity && matchQuery;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data, query, severity]);

  const kpis = data?.kpis;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Governance"
        title="Moderation & Security"
        description="Signalements, incidents et sécurité de la plateforme."
        actions={
          <button
            onClick={refresh}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-700 shadow-sm transition-all hover:border-gold-mid hover:text-gold-strong active:scale-95"
          >
            <Icon name="refresh" size={14} /> Actualiser
          </button>
        }
      />


      {/* KPIs du module (doc 10 §4.1) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MiniStat icon="alert" label="Signalements ouverts" value={String(kpis?.openReports ?? "-")} tone="gold" />
        <MiniStat icon="alert" label="Critiques" value={String(kpis?.criticalReports ?? "-")} tone="terracotta" />
        <MiniStat icon="shield" label="Incidents en cours" value={String(kpis?.activeIncidents ?? "-")} tone="blue" />
        <MiniStat icon="store" label="Boutiques suspendues" value={String(kpis?.suspendedStores ?? "-")} tone="ivory" />
        <MiniStat icon="users" label="Comptes suspendus" value={String(kpis?.suspendedAccounts ?? "-")} tone="ivory" />
        <MiniStat icon="clock" label="Actions récentes (14 j)" value={String(kpis?.recentActions ?? "-")} tone="green" />
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
        {TABS.map((t) => (
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

      {loading || !data ? (
        <DashboardCard className="p-6">
          <CardHeader title="Chargement" />
          <div className="mt-2">
            <TableSkeleton rows={6} cols={6} />
          </div>
        </DashboardCard>
      ) : error ? (
        <DashboardCard className="p-6">
          <EmptyState
            icon="alert"
            title="Impossible de charger la modération"
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
        </DashboardCard>
      ) : (
        <>
          {/* ————— Signalements (doc 10 §6/§7) ————— */}
          {tab === "reports" && (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
                  {SEVERITY_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setSeverity(f.value)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors",
                        severity === f.value
                          ? "bg-blue-700 font-semibold text-white shadow-sm shadow-blue-700/20"
                          : "text-ink-600 hover:text-ink-950"
                      )}
                      aria-pressed={severity === f.value}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full lg:w-72">
                  <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search stores, products, users…"
                    className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>

              <DashboardCard className="p-6">
                <CardHeader
                  title={`${filteredReports.length} signalement${filteredReports.length > 1 ? "s" : ""}`}
                  subtitle={query || severity !== "all" ? "Résultat du filtre actif" : "Tous les signalements de la plateforme"}
                />
                {filteredReports.length === 0 ? (
                  <EmptyState
                    icon="shield"
                    title="Aucun signalement trouvé"
                    description="Aucun signalement ne correspond à ces critères."
                    action={
                      query || severity !== "all" ? (
                        <button
                          onClick={() => {
                            setQuery("");
                            setSeverity("all");
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
                            <th className="px-2 py-3">TYPE</th>
                            <th className="px-2 py-3">CIBLE</th>
                            <th className="px-2 py-3">AUTEUR</th>
                            <th className="px-2 py-3">GRAVITÉ</th>
                            <th className="px-2 py-3">STATUT</th>
                            <th className="px-2 py-3">SIGNAUX</th>
                            <th className="px-2 py-3">DATE</th>
                            <th className="px-2 py-3 text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/70">
                          {filteredReports.map((r: AdminReportRow) => (
                            <tr key={r.id} className="group transition-colors hover:bg-ink-50/70">
                              <td className="px-2 py-3.5">
                                <ReportTypeBadge type={r.type} />
                              </td>
                              <td className="px-2 py-3.5 font-medium text-ink-950 transition-colors group-hover:text-gold-strong">
                                {r.targetLabel}
                              </td>
                              <td className="px-2 py-3.5 text-ink-600">{r.reporterName}</td>
                              <td className="px-2 py-3.5">
                                <SeverityBadge severity={r.severity} />
                              </td>
                              <td className="px-2 py-3.5">
                                <ReportStatusBadge status={r.status} />
                              </td>
                              <td className="px-2 py-3.5 font-mono text-[11px] text-ink-600">
                                {r.relatedCount}
                              </td>
                              <td className="px-2 py-3.5 font-mono text-[11px] text-ink-500">
                                {timeAgo(r.createdAt)}
                              </td>
                              <td className="px-2 py-3.5 text-right">
                                <Link
                                  href={`/admin/moderation/${r.id}`}
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
                      {filteredReports.map((r: AdminReportRow) => (
                        <Link
                          key={r.id}
                          href={`/admin/moderation/${r.id}`}
                          className="card-lux rounded-2xl border border-line bg-surface p-4 transition-all hover:border-gold-soft"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-ink-950">{r.targetLabel}</p>
                            <ReportStatusBadge status={r.status} />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <ReportTypeBadge type={r.type} />
                            <SeverityBadge severity={r.severity} />
                            <span className="font-mono text-[10px] text-ink-400">{timeAgo(r.createdAt)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </DashboardCard>
            </>
          )}

          {/* ————— Incidents (doc 10 §16/§17) ————— */}
          {tab === "incidents" && (
            <DashboardCard className="p-6">
              <CardHeader title="Incidents" subtitle="Problèmes nécessitant un suivi plus large qu'un simple signalement" />
              {data.incidents.length === 0 ? (
                <EmptyState icon="shield" title="Aucun incident" description="Tout est calme côté sécurité." />
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {data.incidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="rounded-2xl border border-line bg-ink-50/30 p-5 transition-all hover:border-gold-soft"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-[10px] text-ink-400">{inc.id}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <SeverityBadge severity={inc.severity} />
                          <IncidentStatusBadge status={inc.status} />
                        </div>
                      </div>
                      <h3 className="mt-2 font-display text-base font-semibold text-ink-950">{inc.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{inc.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-ink-400">
                        <span className="flex items-center gap-1">
                          <Icon name="store" size={11} /> {inc.affectedStores} boutique{inc.affectedStores > 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="users" size={11} /> {inc.affectedUsers} utilisateur{inc.affectedUsers > 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="clock" size={11} /> détecté {timeAgo(inc.detectedAt)}
                        </span>
                        {inc.assignedTo && <span>· {inc.assignedTo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>
          )}

          {/* ————— Boutiques à risque (doc 10 §15) ————— */}
          {tab === "risk" && (
            <DashboardCard className="p-6">
              <CardHeader title="Boutiques à risque" subtitle="Signalements, avertissements et antécédents de suspension" />
              {data.riskStores.length === 0 ? (
                <EmptyState icon="store" title="Aucune boutique à risque" description="Aucun comportement problématique détecté." />
              ) : (
                <>
                <div className="mt-2 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[680px] text-left text-xs text-ink-700">
                    <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                      <tr>
                        <th className="px-2 py-3">BOUTIQUE</th>
                        <th className="px-2 py-3">SIGNALEMENTS</th>
                        <th className="px-2 py-3">AVERTISSEMENTS</th>
                        <th className="px-2 py-3">SUSPENSIONS</th>
                        <th className="px-2 py-3">DERNIÈRE ACTIVITÉ</th>
                        <th className="px-2 py-3">RISQUE</th>
                        <th className="px-2 py-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/70">
                      {data.riskStores.map((s) => (
                        <tr key={s.storeId} className="group transition-colors hover:bg-ink-50/70">
                          <td className="px-2 py-3.5 font-medium text-ink-950 transition-colors group-hover:text-gold-strong">
                            {s.storeName}
                          </td>
                          <td className="px-2 py-3.5 font-mono text-[11px]">{s.reportsCount}</td>
                          <td className="px-2 py-3.5 font-mono text-[11px]">{s.warnings}</td>
                          <td className="px-2 py-3.5 font-mono text-[11px]">{s.previousSuspensions}</td>
                          <td className="px-2 py-3.5 font-mono text-[11px] text-ink-500">{timeAgo(s.lastActivityAt)}</td>
                          <td className="px-2 py-3.5">
                            <SeverityBadge severity={s.riskLevel} />
                          </td>
                          <td className="px-2 py-3.5 text-right">
                            <Link
                              href={`/admin/stores/${s.storeId}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 font-mono text-[10px] font-semibold text-blue-700 transition-colors hover:border-blue-600 hover:bg-blue-50"
                            >
                              Voir
                              <Icon name="chevronRight" size={10} strokeWidth={2.2} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cartes mobile (doc 10 §29 — cohérent avec les autres modules) */}
                <div className="mt-3 grid gap-3 md:hidden">
                  {data.riskStores.map((s) => (
                    <Link
                      key={s.storeId}
                      href={`/admin/stores/${s.storeId}`}
                      className="card-lux rounded-2xl border border-line bg-surface p-4 transition-all hover:border-gold-soft"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink-950">{s.storeName}</p>
                        <SeverityBadge severity={s.riskLevel} />
                      </div>
                      <p className="mt-2 font-mono text-[10px] text-ink-500">
                        {s.reportsCount} signalement{s.reportsCount > 1 ? "s" : ""} · {s.warnings} avertissement{s.warnings > 1 ? "s" : ""} · {s.previousSuspensions} suspension{s.previousSuspensions > 1 ? "s" : ""}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-ink-400">Actif {timeAgo(s.lastActivityAt)}</span>
                        <span className="font-mono text-[10px] font-semibold text-blue-700">Voir ↗</span>
                      </div>
                    </Link>
                  ))}
                </div>
                </>
              )}
            </DashboardCard>
          )}

          {/* ————— Journal d'activité (doc 10 §20/§21) ————— */}
          {tab === "audit" && (
            <DashboardCard className="p-6">
              <CardHeader title="Journal administratif" subtitle="Qui a fait quoi, quand et pourquoi : traçabilité complète" />
              {data.auditLog.length === 0 ? (
                <EmptyState icon="clock" title="Aucune action journalisée" />
              ) : (
                <ul className="mt-3 space-y-0">
                  {data.auditLog.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 border-b border-line/60 py-3 last:border-0">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          l.severity === "critical"
                            ? "bg-red-100 text-red-600"
                            : l.severity === "high"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-ink-100 text-ink-500"
                        )}
                      >
                        <Icon
                          name={l.severity === "critical" ? "alert" : l.severity === "high" ? "clock" : "check"}
                          size={14}
                          strokeWidth={2}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-ink-800">
                          <span className="font-semibold text-ink-950">{l.admin}</span> · 
                          <span className="font-mono text-[10px] text-blue-700">{l.action}</span> sur{" "}
                          <span className="font-medium">{l.target}</span>
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-[10px] text-ink-400">{timeAgo(l.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardCard>
          )}
        </>
      )}
    </div>
  );
}
