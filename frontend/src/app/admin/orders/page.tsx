"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { MiniStat } from "@/components/dashboard/ui/MiniStat";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { cn, timeAgo, formatFcfa } from "@/lib/utils";
import { OrderStatusBadge, AnomalyLevelBadge } from "@/components/admin/orders/OrderBadges";
import { OrdersVolumeChart } from "@/components/admin/orders/OrdersVolumeChart";
import { AdminKpiButton } from "@/components/admin/ui/AdminBits";
import type { AdminOrderRow, AdminOrderStatus } from "@/types/admin";

type StatusFilter = "all" | AdminOrderStatus;

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tous statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "PAID", label: "Payées" },
  { value: "SHIPPING", label: "En livraison" },
  { value: "DELIVERED", label: "Livrées" },
  { value: "CANCELLED", label: "Annulées" },
];

type SortKey = "recent" | "oldest" | "amount";

const PAGE_SIZE = 8;

/**
 * Orders Platform Overview (doc 07) — centre de supervision des commandes de
 * toute la plateforme : KPIs, volume/GMV, anomalies, recherche, filtres,
 * pagination, table desktop + cartes mobile, export CSV.
 */
export default function OrdersPage() {
  const { data, loading, error, refresh } = useAdminOrders();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [storeQuery, setStoreQuery] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);

  const stores = useMemo(() => {
    if (!data) return [];
    return Array.from(new Map(data.rows.map((r) => [r.store.id, r.store.name])).entries());
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const sq = storeQuery.trim().toLowerCase();
    return data.rows
      .filter((r) => {
        const matchStatus = status === "all" || r.status === status;
        const matchStore = !sq || r.store.name.toLowerCase().includes(sq);
        const matchQuery =
          !q ||
          r.reference.toLowerCase().includes(q) ||
          r.customer.name.toLowerCase().includes(q) ||
          r.customer.phone.replace(/\s/g, "").toLowerCase().includes(q.replace(/\s/g, "")) ||
          r.store.name.toLowerCase().includes(q) ||
          r.sellerName.toLowerCase().includes(q);
        return matchStatus && matchStore && matchQuery;
      })
      .sort((a, b) => {
        switch (sort) {
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "amount":
            return b.amountFcfa - a.amountFcfa;
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [data, status, storeQuery, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const kpis = data?.kpis;

  /** Export CSV réel des lignes filtrées (doc 07 §32) */
  const exportCsv = () => {
    const rows: AdminOrderRow[] = filtered;
    const header = ["Référence", "Client", "Téléphone", "Boutique", "Vendeur", "Montant", "Devise", "Statut", "Créée le"];
    const lines = [
      header.join(";"),
      ...rows.map((r) =>
        [
          r.reference,
          `"${r.customer.name}"`,
          `"${r.customer.phone}"`,
          `"${r.store.name}"`,
          `"${r.sellerName}"`,
          r.amountFcfa,
          r.currency,
          r.status,
          new Date(r.createdAt).toLocaleDateString("fr-FR"),
        ].join(";")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Orders Overview"
        description="Monitor orders across the entire platform."
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

      {/* KPIs (doc 07 §5) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <AdminKpiButton active={status === "all"} onClick={() => { setStatus("all"); setPage(1); }} label="Total" value={String(kpis?.total ?? "-")} tone="ivory" />
        <AdminKpiButton active={status === "PENDING"} onClick={() => { setStatus("PENDING"); setPage(1); }} label="En attente" value={String(kpis?.pending ?? "-")} tone="gold" />
        <AdminKpiButton active={status === "DELIVERED"} onClick={() => { setStatus("DELIVERED"); setPage(1); }} label="Livrées" value={String(kpis?.delivered ?? "-")} tone="green" />
        <AdminKpiButton active={status === "CANCELLED"} onClick={() => { setStatus("CANCELLED"); setPage(1); }} label="Annulées" value={String(kpis?.cancelled ?? "-")} tone="terracotta" />
        <MiniStat
          icon="clock"
          label="Aujourd'hui"
          value={String(kpis?.today ?? "-")}
          tone="blue"
          hint={kpis ? `+${kpis.todayChangePercent}% vs hier` : undefined}
        />
        <MiniStat
          icon="wallet"
          label="GMV"
          value={kpis ? formatFcfa(kpis.gmvFcfa) : "-"}
          tone="gold"
          hint={kpis ? `AOV ${formatFcfa(kpis.aovFcfa)}` : undefined}
        />
      </div>

      {/* Volume / GMV (doc 07 §8/§9) */}
      <OrdersVolumeChart volume={data?.volume} loading={loading || !data} />

      {/* Anomalies (doc 07 §25) */}
      {!loading && data && data.anomalies.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
            <Icon name="alert" size={14} /> Anomalies détectées
          </p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {data.anomalies.map((a) => {
              const order = data.rows.find((r) => r.id === a.orderId);
              return (
                <Link
                  key={a.id}
                  href={`/admin/orders/${a.orderId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-surface px-4 py-3 transition-all hover:border-amber-300"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink-950">
                      {order?.reference ?? a.orderId} · {order?.store.name}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-amber-700">{a.message}</p>
                  </div>
                  <AnomalyLevelBadge level={a.level} />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtres + recherche */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
          {STATUS_FILTERS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setStatus(t.value); setPage(1); }}
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={storeQuery}
            onChange={(e) => { setStoreQuery(e.target.value); setPage(1); }}
            aria-label="Filtrer par boutique"
            className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink-700 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          >
            <option value="">Toutes les boutiques</option>
            {stores.map(([id, name]) => (
              <option key={id} value={name}>
                {name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-72">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search order, customer, store…"
              className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      <DashboardCard className="p-6">
        <CardHeader
          title={`${filtered.length} commande${filtered.length > 1 ? "s" : ""}`}
          subtitle={query || status !== "all" || storeQuery ? "Résultat du filtre actif" : "Commandes de toute la plateforme"}
          action={
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Trier"
              className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-600 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
            >
              <option value="recent">Plus récentes d&apos;abord</option>
              <option value="oldest">Plus anciennes d&apos;abord</option>
              <option value="amount">Montant décroissant</option>
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
            title="Impossible de charger les commandes"
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
            icon="orders"
            title={query ? "Aucune commande ne correspond à votre recherche" : "Aucune commande trouvée"}
            description="Essayez de modifier vos critères de recherche ou de filtrage."
            action={
              status !== "all" || storeQuery || query ? (
                <button
                  onClick={() => {
                    setStatus("all");
                    setStoreQuery("");
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
              <table className="w-full min-w-[860px] text-left text-xs text-ink-700">
                <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-2 py-3">COMMANDE</th>
                    <th className="px-2 py-3">CLIENT</th>
                    <th className="px-2 py-3">BOUTIQUE</th>
                    <th className="px-2 py-3">VENDEUR</th>
                    <th className="px-2 py-3 text-right">MONTANT</th>
                    <th className="px-2 py-3">STATUT</th>
                    <th className="px-2 py-3">CRÉÉE</th>
                    <th className="px-2 py-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {pageRows.map((r) => (
                    <tr key={r.id} className="group transition-colors hover:bg-ink-50/70">
                      <td className="px-2 py-3.5">
                        <p className="font-mono text-[11px] font-bold text-ink-950 transition-colors group-hover:text-gold-strong">
                          {r.reference}
                        </p>
                        <p className="font-mono text-[9px] text-ink-400">{r.id}</p>
                      </td>
                      <td className="px-2 py-3.5">
                        <p className="font-medium text-ink-800">{r.customer.name}</p>
                        <p className="font-mono text-[10px] text-ink-400">{r.customer.phone}</p>
                      </td>
                      <td className="px-2 py-3.5">
                        <Link
                          href={`/admin/stores/${r.store.id}`}
                          className="font-medium text-blue-700 transition-colors hover:text-blue-600 hover:underline"
                        >
                          {r.store.name}
                        </Link>
                      </td>
                      <td className="px-2 py-3.5 text-ink-600">{r.sellerName}</td>
                      <td className="px-2 py-3.5 text-right font-mono text-[11px] text-ink-800">
                        {formatFcfa(r.amountFcfa)}
                      </td>
                      <td className="px-2 py-3.5">
                        <OrderStatusBadge status={r.status} />
                      </td>
                      <td className="px-2 py-3.5 font-mono text-[11px] text-ink-500">
                        {timeAgo(r.createdAt)}
                      </td>
                      <td className="px-2 py-3.5 text-right">
                        <Link
                          href={`/admin/orders/${r.id}`}
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

            {/* Cartes mobile (doc 07 §36) */}
            <div className="mt-3 grid gap-3 md:hidden">
              {pageRows.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/orders/${r.id}`}
                  className="card-lux rounded-2xl border border-line bg-surface p-4 transition-all hover:border-gold-soft"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm font-bold text-ink-950">{r.reference}</p>
                    <OrderStatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-500">
                    {r.customer.name} · {r.store.name}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-mono text-xs font-bold text-ink-950">{formatFcfa(r.amountFcfa)}</p>
                    <span className="font-mono text-[10px] text-ink-400">{timeAgo(r.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
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
