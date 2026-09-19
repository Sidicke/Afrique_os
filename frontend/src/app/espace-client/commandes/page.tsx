"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApiError, ordersApi } from "@/lib/api";
import type { ApiOrder } from "@/lib/api/types";
import { getCustomerData } from "@/lib/customerStore";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/client/ui/EmptyState";
import { ListSkeleton } from "@/components/client/ui/Skeleton";
import { OrderCard } from "@/components/client/ui/OrderCard";
import { Tabs, type TabItem } from "@/components/client/ui/Tabs";
import { IconAlert, IconBag } from "@/components/client/icons";

type OrderTab = "all" | "active" | "delivered" | "cancelled";

const TABS: TabItem<OrderTab>[] = [
  { value: "all", label: "Toutes" },
  { value: "active", label: "En cours" },
  { value: "delivered", label: "Livrées" },
  { value: "cancelled", label: "Annulées" },
];

/** Une commande est « en cours » avant sa livraison (jamais annulée). */
function isActive(order: ApiOrder): boolean {
  return order.status !== "delivered" && order.status !== "cancelled";
}

/**
 * 📦 Mes commandes — le centre de suivi : toutes mes commandes, toutes
 * boutiques, avec une timeline d'avancement par commande (l'histoire
 * complète), filtres par statut, annulation (si le backend l'autorise) et
 * discussion liée à la commande.
 */
export default function MesCommandesPage() {
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localFallback, setLocalFallback] = useState(false);
  const [tab, setTab] = useState<OrderTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiOrders = await ordersApi.me();
      setOrders(apiOrders);
      setLocalFallback(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        // Erreur réseau uniquement → repli sur l'historique local du client
        const local = getCustomerData().orders;
        if (local.length > 0) {
          setOrders(null);
          setLocalFallback(true);
        } else {
          setOrders([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  /** Annulation (uniquement PENDING / PAID, comme le backend) */
  const handleCancel = async (order: ApiOrder) => {
    if (!order.boutique?.id) return;
    const reason = cancelReason.trim() || undefined;
    setCancellingId(order.id);
    setConfirmCancelId(null);
    setCancelReason("");
    setError(null);
    try {
      const updated = await ordersApi.cancel(
        order.boutique.id,
        order.id,
        order.customerPhone,
        reason,
      );
      setOrders((prev) =>
        prev?.map((o) => (o.id === updated.id ? updated : o)) ?? [updated],
      );
      setNotice(`Commande ${order.orderNumber} annulée. Les articles sont de nouveau disponibles.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Impossible d'annuler la commande pour le moment.");
      }
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!orders) return [];
    switch (tab) {
      case "active":
        return orders.filter(isActive);
      case "delivered":
        return orders.filter((o) => o.status === "delivered");
      case "cancelled":
        return orders.filter((o) => o.status === "cancelled");
      default:
        return orders;
    }
  }, [orders, tab]);

  const counts = useMemo(
    () => ({
      all: orders?.length ?? 0,
      active: orders?.filter(isActive).length ?? 0,
      delivered: orders?.filter((o) => o.status === "delivered").length ?? 0,
      cancelled: orders?.filter((o) => o.status === "cancelled").length ?? 0,
    }),
    [orders],
  );

  const totalSpent = (orders ?? []).reduce((sum, o) => sum + o.totalPriceFcfa, 0);

  return (
    <div className="flex flex-col gap-8">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-600">
            Ce que j&apos;ai acheté · Où en est ma commande
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-midnight-950">
            Mes commandes
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-midnight-950/55">
            L&apos;historique complet de vos achats, toutes boutiques confondues : chaque
            commande raconte son histoire, du paiement à la livraison.
          </p>
        </div>
        {orders && orders.length > 0 && (
          <span className="rounded-2xl border border-gold-400/30 bg-gold-400/8 px-4 py-2.5 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold-600">
              Total dépensé
            </span>
            <span className="ml-2 font-display font-bold text-midnight-950">
              {formatCurrency(totalSpent)}
            </span>
          </span>
        )}
      </div>

      {notice && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
        >
          <IconAlert className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {localFallback && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Connexion impossible pour le moment : voici vos commandes enregistrées
          localement. Elles seront synchronisées dès le retour du réseau.
        </p>
      )}

      {/* Filtres */}
      {orders && orders.length > 0 && (
        <Tabs
          tabs={TABS.map((t) => ({ ...t, count: counts[t.value] }))}
          value={tab}
          onChange={setTab}
        />
      )}

      {/* Liste */}
      {loading ? (
        <ListSkeleton rows={3} />
      ) : localFallback ? (
        <LocalOrders />
      ) : orders === null ? (
        <EmptyState
          icon={<IconAlert className="h-6 w-6" />}
          title="Impossible de charger vos commandes"
          description="Vérifiez votre connexion puis réessayez."
          action={
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full bg-midnight-950 px-5 py-2.5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
            >
              Réessayer
            </button>
          }
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<IconBag className="h-6 w-6" />}
          title="Aucune commande pour le moment"
          description="Découvrez les boutiques disponibles sur la plateforme et passez votre première commande en quelques clics."
          action={
            <Link
              href="/espace-client"
              className="rounded-full bg-midnight-950 px-6 py-2.5 text-sm font-bold text-gold-300 transition-all hover:-translate-y-0.5 hover:bg-midnight-800"
            >
              Découvrir les boutiques
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconBag className="h-6 w-6" />}
          title="Aucune commande dans ce filtre"
          description="Essayez un autre onglet pour retrouver vos commandes."
          action={
            <button
              type="button"
              onClick={() => setTab("all")}
              className="rounded-full border border-midnight-950/15 px-5 py-2.5 text-sm font-semibold text-midnight-950/70 transition-colors hover:border-gold-400/60"
            >
              Voir toutes les commandes
            </button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((order) => {
            const expanded = expandedId === order.id;
            const canCancel = order.status === "pending" || order.status === "paid";
            return (
              <li key={order.id}>
                <OrderCard
                  order={order}
                  expanded={expanded}
                  onToggle={() => setExpandedId(expanded ? null : order.id)}
                  footer={
                    <div className="flex flex-col gap-3 border-t border-midnight-950/8 pt-3">
                      {/* Annulation (si le backend l'autorise) */}
                      {canCancel && (
                        <div className="flex justify-end">
                          {confirmCancelId === order.id ? (
                            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:min-w-80">
                              <label
                                htmlFor={`cancel-reason-${order.id}`}
                                className="text-xs font-medium text-midnight-950/70"
                              >
                                Motif <span className="text-midnight-950/35">(facultatif)</span>
                              </label>
                              <textarea
                                id={`cancel-reason-${order.id}`}
                                rows={2}
                                maxLength={300}
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Ex. : changement de projet, délai trop long…"
                                className="w-full resize-none rounded-xl border border-midnight-950/15 bg-white px-3 py-2 text-sm text-midnight-950 placeholder:text-midnight-950/30 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmCancelId(null);
                                    setCancelReason("");
                                  }}
                                  className="rounded-lg border border-midnight-950/15 px-3 py-1.5 text-xs font-medium text-midnight-950/70 transition-colors hover:border-gold-400/60"
                                >
                                  Retour
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancel(order)}
                                  disabled={cancellingId === order.id}
                                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {cancellingId === order.id ? "Annulation…" : "Confirmer l'annulation"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmCancelId(order.id);
                                setCancelReason("");
                              }}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
                            >
                              Annuler la commande
                            </button>
                          )}
                        </div>
                      )}
                      {/* Discuter de cette commande — conversation liée */}
                      {order.boutique && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-midnight-950/45">
                            Une question sur cette commande ?
                          </span>
                          <Link
                            href={`/espace-client/discussions/nouvelle?boutique=${order.boutique.id}&orderId=${order.id}&orderReference=${encodeURIComponent(order.orderNumber)}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-700 transition-colors hover:text-gold-600"
                          >
                            Discuter de cette commande
                          </Link>
                        </div>
                      )}
                    </div>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* Aide */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-dashed border-midnight-950/15 px-5 py-4 sm:flex-row sm:items-center">
        <p className="text-xs leading-relaxed text-midnight-950/45">
          Une commande vous semble manquer ? Elle a peut-être été passée sans
          compte : retrouvez-la par téléphone auprès de la boutique.
        </p>
        <Link
          href="/espace-client"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold-400/50 px-4 py-2 text-xs font-semibold text-gold-600 transition-colors hover:bg-gold-400 hover:text-midnight-950"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

/** Repli local (hors-ligne) — commandes enregistrées dans le navigateur */
function LocalOrders() {
  const local = getCustomerData().orders;
  if (local.length === 0) {
    return (
      <EmptyState
        icon={<IconBag className="h-6 w-6" />}
        title="Aucune commande enregistrée localement"
      />
    );
  }
  return (
    <ul className="space-y-3">
      {local.map((order) => (
        <li key={order.id} className="rounded-2xl border border-midnight-950/8 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-gold-600">
              {order.ref}
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-800">
              {order.statusLabel ?? "En attente"}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-midnight-950/50">
            {order.createdAt} · {order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
          </p>
          <div className="mt-2 flex items-center justify-between border-t border-midnight-950/8 pt-2.5">
            <span className="text-xs text-midnight-950/60">Total</span>
            <span className="text-sm font-bold text-gold-600">{formatCurrency(order.total)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
