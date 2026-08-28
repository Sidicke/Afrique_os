"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { MiniStat } from "@/components/dashboard/ui/MiniStat";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { cn, timeAgo } from "@/lib/utils";
import { UserRoleBadge, UserStatusBadge } from "@/components/admin/users/UserBadges";
import { AdminKpiButton } from "@/components/admin/ui/AdminBits";
import type { AdminUserRole, AdminUserRow, AdminUserStatus } from "@/types/admin";

type RoleFilter = "all" | AdminUserRole;
/** « Suspendus / Bloqués » est un filtre composé (deux statuts) */
type StatusFilter = "all" | AdminUserStatus | "SUSPENDED_BLOCKED";

const ROLE_TABS: Array<{ value: RoleFilter; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "CLIENT", label: "Clients" },
  { value: "VENDEUR", label: "Vendeurs" },
  { value: "ADMIN", label: "Admins" },
];

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tous statuts" },
  { value: "ACTIVE", label: "Actifs" },
  { value: "PENDING", label: "En attente" },
  { value: "SUSPENDED", label: "Suspendus" },
  { value: "BLOCKED", label: "Bloqués" },
  { value: "SUSPENDED_BLOCKED", label: "Suspendus / Bloqués" },
  { value: "DEACTIVATED", label: "Désactivés" },
];

type SortKey = "recent" | "oldest" | "active";

const PAGE_SIZE = 8;

/**
 * Users Management (doc 06) — vue transversale des utilisateurs : KPIs,
 * recherche multi-champs (nom, email, téléphone, id, boutique), filtres
 * rôle/statut, tri, pagination, table desktop + cartes mobile, export CSV.
 */
export default function UsersPage() {
  const { data, loading, error, refresh } = useAdminUsers();
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rows
      .filter((r) => {
        const matchRole = role === "all" || r.role === role;
        const matchStatus =
          status === "all" ||
          (status === "SUSPENDED_BLOCKED"
            ? r.status === "SUSPENDED" || r.status === "BLOCKED"
            : r.status === status);
        const matchQuery =
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone.replace(/\s/g, "").toLowerCase().includes(q.replace(/\s/g, "")) ||
          r.id.toLowerCase().includes(q) ||
          (r.storeName ?? "").toLowerCase().includes(q);
        return matchRole && matchStatus && matchQuery;
      })
      .sort((a, b) => {
        switch (sort) {
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "active":
            return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [data, role, status, query, sort]);

  // Pagination locale (la recherche est filtrée d'abord)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const kpis = data?.kpis;

  /** Export CSV réel des lignes filtrées (doc 06 §4 : export secondaire) */
  const exportCsv = () => {
    const rows: AdminUserRow[] = filtered;
    const header = ["ID", "Nom", "Email", "Téléphone", "Rôle", "Statut", "Boutique", "Créé le"];
    const lines = [
      header.join(";"),
      ...rows.map((r) =>
        [
          r.id,
          `"${r.name}"`,
          `"${r.email}"`,
          `"${r.phone}"`,
          r.role,
          r.status,
          `"${r.storeName ?? ""}"`,
          new Date(r.createdAt).toLocaleDateString("fr-FR"),
        ].join(";")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Governance"
        title="Users Management"
        description="Manage customers, sellers and platform accounts from one place."
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

      {/* KPIs du module (doc 06 §5) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <AdminKpiButton active={role === "all" && status === "all"} onClick={() => { setRole("all"); setStatus("all"); setPage(1); }} label="Total" value={String(kpis?.total ?? "-")} tone="ivory" />
        <AdminKpiButton active={role === "CLIENT"} onClick={() => { setRole("CLIENT"); setPage(1); }} label="Clients" value={String(kpis?.clients ?? "-")} tone="blue" />
        <AdminKpiButton active={role === "VENDEUR"} onClick={() => { setRole("VENDEUR"); setPage(1); }} label="Vendeurs" value={String(kpis?.sellers ?? "-")} tone="gold" />
        <AdminKpiButton active={role === "ADMIN"} onClick={() => { setRole("ADMIN"); setPage(1); }} label="Admins" value={String(kpis?.admins ?? "-")} tone="terracotta" />
        <AdminKpiButton active={status === "SUSPENDED_BLOCKED"} onClick={() => { setStatus("SUSPENDED_BLOCKED"); setRole("all"); setPage(1); }} label="Suspendus / Bloqués" value={String(kpis?.suspended ?? "-")} tone="terracotta" />
        <MiniStat
          icon="sparkle"
          label="Nouveaux (30 j)"
          value={String(kpis?.newUsers ?? "-")}
          tone="green"
          hint={kpis ? `+${kpis.newUsersChangePercent}% vs mois dernier` : undefined}
        />
      </div>

      {/* Filtres + recherche */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
          {ROLE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setRole(t.value); setPage(1); }}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors",
                role === t.value
                  ? "bg-blue-700 font-semibold text-white shadow-sm shadow-blue-700/20"
                  : "text-ink-600 hover:text-ink-950"
              )}
              aria-pressed={role === t.value}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }}
            aria-label="Filtrer par statut"
            className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink-700 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-72">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search name, email, phone, store…"
              className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      <DashboardCard className="p-6">
        <CardHeader
          title={`${filtered.length} utilisateur${filtered.length > 1 ? "s" : ""}`}
          subtitle={query || role !== "all" || status !== "all" ? "Résultat du filtre actif" : "Tous les comptes de la plateforme"}
          action={
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Trier"
              className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-600 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
            >
              <option value="recent">Plus récents d&apos;abord</option>
            <option value="oldest">Plus anciens d&apos;abord</option>
            <option value="active">Récemment actifs</option>
            </select>
          }
        />

        {loading || !data ? (
          <div className="mt-2">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : error ? (
          <EmptyState
            icon="alert"
            title="Impossible de charger les utilisateurs"
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
            icon="users"
            title={query ? "Aucun utilisateur ne correspond à votre recherche" : "Aucun utilisateur trouvé"}
            description="Essayez de modifier vos critères de recherche ou de filtrage."
            action={
              role !== "all" || status !== "all" || query ? (
                <button
                  onClick={() => {
                    setRole("all");
                    setStatus("all");
                    setQuery("");
                    setPage(1);
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
                    <th className="px-2 py-3">UTILISATEUR</th>
                    <th className="px-2 py-3">RÔLE</th>
                    <th className="px-2 py-3">STATUT</th>
                    <th className="px-2 py-3">ENTITÉ ASSOCIÉE</th>
                    <th className="px-2 py-3">ACTIVITÉ</th>
                    <th className="px-2 py-3">CRÉÉ LE</th>
                    <th className="px-2 py-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {pageRows.map((r) => (
                    <tr key={r.id} className="group transition-colors hover:bg-ink-50/70">
                      <td className="px-2 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.name} size="sm" />
                          <div>
                            <p className="font-medium text-ink-950 transition-colors group-hover:text-gold-strong">
                              {r.name}
                            </p>
                            <p className="font-mono text-[10px] text-ink-400">
                              {r.email} · {r.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3.5">
                        <UserRoleBadge role={r.role} />
                      </td>
                      <td className="px-2 py-3.5">
                        <UserStatusBadge status={r.status} />
                      </td>
                      <td className="px-2 py-3.5 text-ink-600">
                        {r.storeName ? (
                          <Link
                            href={`/admin/stores/${r.storeId}`}
                            className="font-medium text-blue-700 transition-colors hover:text-blue-600 hover:underline"
                          >
                            {r.storeName}
                          </Link>
                        ) : (
                          <span className="text-ink-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-3.5 font-mono text-[11px] text-ink-500">
                        {timeAgo(r.lastActiveAt)}
                      </td>
                      <td className="px-2 py-3.5 font-mono text-[11px] text-ink-500">
                        {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-2 py-3.5 text-right">
                        <Link
                          href={`/admin/users/${r.id}`}
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
              {pageRows.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/users/${r.id}`}
                  className="card-lux flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-gold-soft"
                >
                  <Avatar name={r.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink-950">{r.name}</p>
                      <UserRoleBadge role={r.role} />
                    </div>
                    <p className="truncate text-[11px] text-ink-500">{r.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <UserStatusBadge status={r.status} />
                      <span className="font-mono text-[10px] text-ink-400">{timeAgo(r.lastActiveAt)}</span>
                    </div>
                  </div>
                  <Icon name="chevronRight" size={16} className="text-ink-300" />
                </Link>
              ))}
            </div>

            {/* Pagination (doc 06 §3) */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <p className="font-mono text-[10px] text-ink-400">
                  Page {safePage} / {totalPages} · {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    aria-label="Page précédente"
                    className="rounded-lg border border-line px-2.5 py-1.5 text-ink-600 transition-colors hover:border-gold-mid hover:text-gold-strong disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon name="chevronLeft" size={13} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    aria-label="Page suivante"
                    className="rounded-lg border border-line px-2.5 py-1.5 text-ink-600 transition-colors hover:border-gold-mid hover:text-gold-strong disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon name="chevronRight" size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </DashboardCard>
    </div>
  );
}
