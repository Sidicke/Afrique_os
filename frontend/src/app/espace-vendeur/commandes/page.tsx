"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
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
import { shopsApi } from "@/lib/api";
import { useSession } from "@/lib/useSession";

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

export default function CommandesPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Chargement des commandes...</div>}>
      <CommandesContent />
    </Suspense>
  );
}

function CommandesContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("search") || "";
  const session = useSession();

  // Multi-boutique : liste des boutiques du vendeur et filtre actif
  const [boutiques, setBoutiques] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string>("all");

  useEffect(() => {
    shopsApi.myShops().then((res) => {
      setBoutiques(res.map((b) => ({ id: b.id, name: b.name, slug: b.slug })));
    }).catch(() => {});
  }, [session?.user?.boutiqueId]);

  const { data, loading, error, updateStatus, remindPayment } = useOrders(selectedBoutiqueId);
  const [tab, setTab] = useState<StatusTab>("all");
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    if (searchParams.get("search")) setQuery(searchParams.get("search") || "");
  }, [searchParams]);
  const [toast, setToast] = useState<string | null>(null);

  const handleRemindPayment = async (orderId: string) => {
    try {
      await remindPayment(orderId);
      setToast("Rappel envoyé au client via la messagerie.");
    } catch (err: any) {
      setToast(err?.message || "Erreur lors de l'envoi du rappel.");
    }
  };

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
          o.city.toLowerCase().includes(q) ||
          (o.boutique && o.boutique.name.toLowerCase().includes(q));
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

  // Seules les commandes abouties (non annulées) sont comptabilisées dans le total financier
  const totalDisplayed = useMemo(
    () =>
      filtered
        .filter((o) => (tab === "cancelled" ? true : o.status !== "cancelled"))
        .reduce((sum, o) => sum + o.totalPriceFcfa, 0),
    [filtered, tab]
  );

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    let deliveryContact = undefined;
    if (status === "shipping") {
      const contact = window.prompt("Veuillez renseigner le nom et le contact du livreur (obligatoire) :");
      if (!contact || !contact.trim()) {
        setToast("Opération annulée : le contact du livreur est requis.");
        return;
      }
      deliveryContact = contact.trim();
    }

    try {
      const ok = await updateStatus(orderId, status, deliveryContact);
      if (ok) setToast("Statut de la commande mis à jour.");
      else setToast("Erreur inattendue lors de la mise à jour.");
    } catch (err: any) {
      setToast(err?.message || "Erreur lors de la mise à jour.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Gestion Commerciale"
        title="Commandes Multi-Boutiques"
        description="Pilotez et préparez les commandes de toutes vos enseignes depuis cette interface unifiée."
        actions={
          <button
            onClick={() => setToast("Exportation du rapport PDF lancée.")}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-700 shadow-sm transition-all hover:border-gold-mid hover:text-gold-strong active:scale-95 cursor-pointer"
          >
            <Icon name="download" size={14} /> Exporter
          </button>
        }
      />

      {/* Sélecteur de Boutique Unifié (si le vendeur possède plusieurs boutiques) */}
      {boutiques.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gold-soft bg-gradient-to-r from-gold-wash/80 via-white to-gold-wash/40 p-3.5 px-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold-strong text-white shadow-xs">
              <Icon name="store" size={15} />
            </span>
            <div>
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-gold-strong">
                Filtrer par boutique
              </span>
              <p className="text-xs font-bold text-ink-950">
                {selectedBoutiqueId === "all"
                  ? "Toutes vos boutiques consolidées"
                  : boutiques.find((b) => b.id === selectedBoutiqueId)?.name ?? "Boutique"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedBoutiqueId("all")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                selectedBoutiqueId === "all"
                  ? "bg-gold-strong text-white shadow-xs"
                  : "border border-line bg-white text-ink-700 hover:border-gold-soft hover:bg-gold-wash/50"
              )}
            >
              🌐 Toutes ({boutiques.length})
            </button>
            {boutiques.map((b) => {
              const isCurrent = selectedBoutiqueId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBoutiqueId(b.id)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    isCurrent
                      ? "bg-gold-strong text-white shadow-xs"
                      : "border border-line bg-white text-ink-700 hover:border-gold-soft hover:bg-gold-wash/50"
                  )}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtres statuts et barre de recherche */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors cursor-pointer",
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
            placeholder="Rechercher client, commande, produit, enseigne…"
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>
      </div>

      <DashboardCard className="p-6">
        <CardHeader
          title={`${filtered.length} commande${filtered.length > 1 ? "s" : ""}`}
          subtitle={
            selectedBoutiqueId === "all"
              ? "Vue consolidée de toutes vos enseignes"
              : `Boutique : ${boutiques.find((b) => b.id === selectedBoutiqueId)?.name ?? "Enseigne sélectionnée"}`
          }
          action={
            <span className="rounded-xl border border-gold-soft bg-gold-wash px-3 py-1.5 font-mono text-xs font-semibold text-gold-strong">
              {formatCurrency(totalDisplayed)}
            </span>
          }
        />

        {loading ? (
          <div className="mt-2">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Icon name="alert" size={28} className="text-red-600" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <p className="text-xs text-ink-500">Vérifiez que votre backend est bien lancé.</p>
          </div>
        ) : !data || filtered.length === 0 ? (
          <EmptyState
            icon="orders"
            title="Aucune commande trouvée"
            description="Les commandes passées par vos clients apparaîtront ici automatiquement dès leur confirmation."
          />
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs text-ink-700">
              <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-3 py-3">COMMANDE</th>
                  {boutiques.length > 1 && <th className="px-3 py-3">ENSEIGNE</th>}
                  <th className="px-3 py-3">CLIENT</th>
                  <th className="px-3 py-3">PRODUIT</th>
                  <th className="px-3 py-3">PAIEMENT</th>
                  <th className="px-3 py-3 text-right">TOTAL</th>
                  <th className="px-3 py-3">STATUT</th>
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
                    <td className="px-3 py-3.5">
                      <p className="font-mono font-semibold text-gold-strong">{order.orderNumber}</p>
                      <p className="mt-0.5 text-[10px] text-ink-400">{order.createdAt}</p>
                    </td>

                    {boutiques.length > 1 && (
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-gold-soft/80 bg-gold-wash/60 px-2 py-1 font-mono text-[10px] font-bold text-gold-strong">
                          <Icon name="store" size={10} />
                          {order.boutique?.name ?? "Boutique"}
                        </span>
                      </td>
                    )}

                    <td className="px-3 py-3.5">
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

                    <td className="px-3 py-3.5">
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

                    <td className="px-3 py-3.5">
                      <PaymentBadge method={order.paymentMethod} />
                    </td>

                    <td className="px-3 py-3.5 text-right font-mono font-bold text-ink-950">
                      {formatCurrency(order.totalPriceFcfa)}
                    </td>

                    <td className="px-3 py-3.5">
                      <div className="flex flex-col gap-2 items-start">
                        <StatusBadge status={order.status} />

                        {order.status === "pending" && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "paid")}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-700 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-green-800 shadow-xs cursor-pointer"
                            >
                              Valider paiement ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemindPayment(order.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gold-mid bg-gold-wash px-2 py-1 text-[11px] font-semibold text-gold-strong transition hover:bg-gold-mid hover:text-white cursor-pointer"
                            >
                              Rappel chat 💬
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "cancelled")}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-600 transition hover:bg-red-50 hover:text-red-700 cursor-pointer"
                            >
                              Annuler ✕
                            </button>
                          </div>
                        )}

                        {order.status === "paid" && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "shipping")}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-blue-800 shadow-xs cursor-pointer"
                            >
                              Expédier le colis 🚚
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "cancelled")}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-600 transition hover:bg-red-50 hover:text-red-700 cursor-pointer"
                            >
                              Annuler ✕
                            </button>
                          </div>
                        )}

                        {order.status === "shipping" && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "delivered")}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-800 shadow-xs cursor-pointer"
                            >
                              Confirmer livraison ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "cancelled")}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-600 transition hover:bg-red-50 hover:text-red-700 cursor-pointer"
                            >
                              Annuler ✕
                            </button>
                          </div>
                        )}
                      </div>
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
