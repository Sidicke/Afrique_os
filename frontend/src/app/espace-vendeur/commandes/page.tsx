"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useOrders } from "@/hooks/useOrders";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { StatusBadge, PaymentBadge } from "@/components/dashboard/ui/Badges";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import { Toast } from "@/components/dashboard/ui/Toast";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { TableSkeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import { formatCurrency, cn } from "@/lib/utils";
import { OrderStatus, PaymentMethod } from "@/types/dashboard";
import AssetImage from "@/components/ui/AssetImage";

type StatusTab = "all" | OrderStatus;

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "En attente" },
  { value: "paid", label: "Payées" },
  { value: "shipping", label: "En livraison" },
  { value: "delivered", label: "Livrées" },
  { value: "cancelled", label: "Annulées" },
];

/** Priorité d'affichage : ce qui demande une action du vendeur apparaît en premier */
const STATUS_PRIORITY: Record<OrderStatus, number> = {
  pending: 0,
  paid: 1,
  shipping: 2,
  delivered: 3,
  cancelled: 4,
};

/** Statuts « à traiter » — surlignés pour être repérés d'un coup d'œil */
const ACTION_STATUSES: OrderStatus[] = ["pending", "paid", "shipping"];

const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "En attente" },
  { value: "paid", label: "Payée" },
  { value: "shipping", label: "En livraison" },
  { value: "delivered", label: "Livrée" },
  { value: "cancelled", label: "Annulée" },
];

export default function CommandesPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("search") || "";
  const { data, loading, updateStatus } = useOrders();
  const [tab, setTab] = useState<StatusTab>("all");
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    if (searchParams.get("search")) setQuery(searchParams.get("search") || "");
  }, [searchParams]);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data
      .filter((o) => {
        const matchTab = tab === "all" || o.status === tab;
        const matchQuery =
          !q ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q) ||
          o.city.toLowerCase().includes(q);
        return matchTab && matchQuery;
      })
      .sort(
        (a, b) =>
          STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
          b.totalPriceFcfa - a.totalPriceFcfa
      );
  }, [data, tab, query]);

  const counts = useMemo(() => {
    const c: Record<StatusTab, number> = {
      all: data?.length ?? 0,
      pending: 0,
      paid: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    };
    data?.forEach((o) => {
      c[o.status] += 1;
    });
    return c;
  }, [data]);

  const totalDisplayed = useMemo(
    () => filtered.reduce((sum, o) => sum + o.totalPriceFcfa, 0),
    [filtered]
  );

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    await updateStatus(orderId, status);
    setToast("Statut de la commande mis à jour.");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Gestion"
        title="Commandes"
        description="Suivez et préparez chaque commande, de la confirmation à la livraison."
        actions={
          <button
            onClick={() => setToast("Exportation du rapport PDF lancée.")}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-700 shadow-sm transition-all hover:border-gold-mid hover:text-gold-strong active:scale-95"
          >
            <Icon name="download" size={14} /> Exporter
          </button>
        }
      />

      {/* Filtres */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors",
                tab === t.value
                  ? "bg-blue-700 font-semibold text-white shadow-sm shadow-blue-700/20"
                  : "text-ink-600 hover:text-ink-950"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 font-mono text-[10px]",
                  tab === t.value ? "bg-white/15 text-white" : "bg-ink-100 text-ink-500"
                )}
              >
                {counts[t.value]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher client, commande, produit…"
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>
      </div>

      <DashboardCard className="p-6">
        <CardHeader
          title={`${filtered.length} commande${filtered.length > 1 ? "s" : ""}`}
          subtitle={query || tab !== "all" ? "Résultat du filtre actif" : "Toutes les commandes"}
          action={
            <span className="rounded-xl border border-gold-soft bg-gold-wash px-3 py-1.5 font-mono text-xs font-semibold text-gold-strong">
              {formatCurrency(totalDisplayed)}
            </span>
          }
        />

        {loading || !data ? (
          <div className="mt-2">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="orders"
            title="Aucune commande trouvée"
            description="Les commandes passées par vos clients sur votre vitrine apparaîtront ici automatiquement dès leur confirmation."
          />
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs text-ink-700">
              <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-2 py-3">COMMANDE</th>
                  <th className="px-2 py-3">CLIENT</th>
                  <th className="px-2 py-3">PRODUIT</th>
                  <th className="px-2 py-3">PAIEMENT</th>
                  <th className="px-2 py-3 text-right">TOTAL</th>
                  <th className="px-2 py-3">STATUT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    className={cn(
                      "group transition-colors hover:bg-ink-50/70",
                      ACTION_STATUSES.includes(order.status) && "bg-gold-wash/30"
                    )}
                  >
                    <td className="px-2 py-3.5">
                      <p className="font-mono font-semibold text-gold-strong">{order.orderNumber}</p>
                      <p className="mt-0.5 text-[10px] text-ink-400">{order.createdAt}</p>
                    </td>

                    <td className="px-2 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={order.customerName} size="sm" />
                        <div>
                          <p className="font-medium text-ink-950 transition-colors group-hover:text-gold-strong">
                            {order.customerName}
                          </p>
                          <p className="flex items-center gap-1 text-[10px] text-ink-400">
                            <Icon name="mapPin" size={10} /> {order.city}, {order.country}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-2 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {order.productImage ? (
                          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line bg-ink-50">
                            <AssetImage src={order.productImage} alt={order.productName} sizes="36px" label="Produit" />
                          </span>
                        ) : null}
                        <div>
                          <p className="max-w-44 truncate font-medium text-ink-950">{order.productName}</p>
                          <p className="text-[10px] text-ink-400">Qté : {order.quantity}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-2 py-3.5">
                      <PaymentBadge method={order.paymentMethod} />
                    </td>

                    <td className="px-2 py-3.5 text-right font-mono font-bold text-ink-950">
                      {formatCurrency(order.totalPriceFcfa)}
                    </td>

                    <td className="px-2 py-3.5">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          aria-label={`Changer le statut de ${order.orderNumber}`}
                          className="cursor-pointer rounded-lg border border-line bg-ink-50 px-1.5 py-1 font-mono text-[10px] text-ink-600 transition-colors hover:border-gold-mid hover:text-gold-strong focus:outline-none focus:ring-1 focus:ring-blue-100"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {order.status === "cancelled" && order.cancellationReason ? (
                        <p
                          className="mt-1.5 max-w-52 truncate rounded-lg bg-red-50 px-2 py-1 text-[10px] leading-snug text-red-600"
                          title={order.cancellationReason}
                        >
                          Motif : {order.cancellationReason}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
