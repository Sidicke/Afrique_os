"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Modal } from "@/components/dashboard/ui/Modal";
import { Toast } from "@/components/dashboard/ui/Toast";
import { Field, TextArea, SelectInput } from "@/components/dashboard/ui/Field";
import { Icon } from "@/components/dashboard/icons";
import { timeAgo, formatFcfa } from "@/lib/utils";
import type { AdminOrderDetail, AdminOrderStatus } from "@/types/admin";
import { adminService } from "@/services/adminService";
import { OrderStatusBadge, AnomalyLevelBadge } from "./OrderBadges";
import { InfoRow } from "@/components/admin/ui/AdminBits";

/**
 * Transitions autorisées (doc 07 §27) — le backend est la source de vérité ;
 * côté démo on ne propose que des transitions cohérentes avec l'état courant.
 */
const NEXT_STATUS: Record<AdminOrderStatus, AdminOrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_OPTIONS: Array<{ value: AdminOrderStatus; label: string }> = [
  { value: "PENDING", label: "En attente" },
  { value: "PAID", label: "Payée" },
  { value: "SHIPPING", label: "En livraison" },
  { value: "DELIVERED", label: "Livrée" },
  { value: "CANCELLED", label: "Annulée" },
];

/** Motifs d'annulation administrative (doc 07 — §28) */
const CANCEL_REASONS = [
  "Fraude ou paiement invalide",
  "Produit indisponible",
  "Doublon de commande",
  "Demande du client",
  "Violation des règles de la plateforme",
  "Autre",
];

interface OrderDetailProps {
  order: AdminOrderDetail;
  adminName: string;
  onUpdated: (updated: AdminOrderDetail) => void;
}

/**
 * Détail d'une commande (doc 07 — §20 à §34) : identité complète (client,
 * boutique, vendeur), produits, livraison, timeline et actions administratives
 * encadrées — changement de statut selon les transitions autorisées et
 * annulation avec motif obligatoire. Le frontend ne simule jamais de
 * remboursement ni de remise en stock (backend réel uniquement).
 */
export function OrderDetail({ order, adminName, onUpdated }: OrderDetailProps) {
  const [statusModal, setStatusModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [newStatus, setNewStatus] = useState<AdminOrderStatus>("PAID");
  const [statusReason, setStatusReason] = useState("");
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const o = order;
  const next = NEXT_STATUS[o.status];
  const cancellable = next.includes("CANCELLED");

  const openStatusModal = (s: AdminOrderStatus) => {
    setNewStatus(s);
    setStatusReason("");
    setStatusModal(true);
  };

  const openCancelModal = () => {
    setReason(CANCEL_REASONS[0]);
    setCustomReason("");
    setCancelModal(true);
  };

  const handleChangeStatus = async () => {
    // Motif obligatoire pour toute modification administrative (doc 07 §27)
    if (!statusReason.trim()) {
      setToast("Un motif est obligatoire pour modifier le statut.");
      return;
    }
    setBusy(true);
    const updated = await adminService.changeOrderStatus(o.id, newStatus, {
      reason: statusReason.trim(),
      by: adminName,
    });
    setBusy(false);
    if (updated) {
      onUpdated(updated);
      setStatusModal(false);
      setStatusReason("");
      setToast(`Statut changé en ${newStatus}.`);
    }
  };

  const handleCancel = async () => {
    const finalReason = reason === "Autre" ? customReason.trim() : reason;
    if (!finalReason) {
      setToast("Un motif est obligatoire pour annuler.");
      return;
    }
    setBusy(true);
    const updated = await adminService.cancelOrder(o.id, { reason: finalReason, by: adminName });
    setBusy(false);
    if (updated) {
      onUpdated(updated);
      setCancelModal(false);
      setToast("Commande annulée.");
    }
  };

  const handleAddNote = async () => {
    const content = noteDraft.trim();
    if (!content || noteBusy) return;
    setNoteBusy(true);
    const updated = await adminService.addOrderNote(o.id, content, adminName);
    setNoteBusy(false);
    if (updated) {
      onUpdated(updated);
      setNoteDraft("");
      setToast("Note interne ajoutée.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête commande */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/orders"
            className="mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-ink-500 transition-colors hover:text-gold-strong"
          >
            <Icon name="chevronLeft" size={12} /> Orders Overview
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-950">
              {o.reference}
            </h1>
            <OrderStatusBadge status={o.status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {o.store.name} · créée {timeAgo(o.createdAt)}
          </p>
        </div>

        {o.anomaly && (
          <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-700">
            <Icon name="alert" size={14} />
            {o.anomaly.message}
            <AnomalyLevelBadge level={o.anomaly.level} />
          </span>
        )}
      </div>

      {/* Identité : client, boutique, vendeur (doc 07 §15-17/§29-31) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardCard className="p-6">
          <CardHeader
            title="Customer"
            action={
              <Link
                href={`/admin/users/${o.customer.id}`}
                className="font-mono text-[10px] font-semibold text-blue-700 hover:text-blue-600"
              >
                View customer →
              </Link>
            }
          />
          <div className="mt-4">
            <p className="font-display text-base font-semibold text-ink-950">{o.customer.name}</p>
            <p className="mt-1 font-mono text-xs text-ink-500">{o.customer.phone}</p>
            <p className="mt-3 rounded-xl bg-ink-50/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-500">
              Profil client accessible depuis Users Management : données personnelles
              protégées par les permissions (doc 07 §15).
            </p>
          </div>
        </DashboardCard>

        <DashboardCard className="p-6">
          <CardHeader title="Store" />
          <div className="mt-4">
            <p className="font-display text-base font-semibold text-ink-950">{o.store.name}</p>
            <p className="mt-1 text-xs text-ink-500">Statut : {o.store.status}</p>
            <Link
              href={`/admin/stores/${o.store.id}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 font-mono text-[10px] font-semibold text-blue-700 transition-colors hover:border-blue-600 hover:bg-blue-50"
            >
              View store
              <Icon name="chevronRight" size={10} strokeWidth={2.2} />
            </Link>
          </div>
        </DashboardCard>

        <DashboardCard className="p-6">
          <CardHeader title="Seller" />
          <div className="mt-4">
            <p className="font-display text-base font-semibold text-ink-950">{o.sellerName}</p>
            <p className="mt-1 font-mono text-[10px] text-ink-400">{o.seller.id}</p>
            <Link
              href={`/admin/users/${o.seller.id}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 font-mono text-[10px] font-semibold text-blue-700 transition-colors hover:border-blue-600 hover:bg-blue-50"
            >
              View seller
              <Icon name="chevronRight" size={10} strokeWidth={2.2} />
            </Link>
          </div>
        </DashboardCard>
      </div>

      {/* Produits (doc 07 §22) + Récapitulatif */}
      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardCard className="p-6 lg:col-span-2">
          <CardHeader title="Items" subtitle="Produits commandés" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-xs text-ink-700">
              <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-2 py-2.5">PRODUIT</th>
                  <th className="px-2 py-2.5">VARIANTE</th>
                  <th className="px-2 py-2.5 text-right">QTÉ</th>
                  <th className="px-2 py-2.5 text-right">PRIX UNITAIRE</th>
                  <th className="px-2 py-2.5 text-right">SOUS-TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {o.items.map((it) => (
                  <tr key={it.id} className="transition-colors hover:bg-ink-50/70">
                    <td className="px-2 py-3">
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-400">
                          <Icon name="package" size={14} />
                        </span>
                        <span className="font-medium text-ink-800">{it.name}</span>
                      </span>
                    </td>
                    <td className="px-2 py-3 text-ink-500">{it.variant ?? "-"}</td>
                    <td className="px-2 py-3 text-right font-mono text-[11px]">×{it.quantity}</td>
                    <td className="px-2 py-3 text-right font-mono text-[11px]">
                      {formatFcfa(it.unitPriceFcfa)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-[11px] font-bold text-ink-950">
                      {formatFcfa(it.unitPriceFcfa * it.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs">
            <div className="flex justify-between text-ink-600">
              <dt>Sous-total</dt>
              <dd className="font-mono">{formatFcfa(o.subtotalFcfa)}</dd>
            </div>
            <div className="flex justify-between text-ink-600">
              <dt>Livraison</dt>
              <dd className="font-mono">{formatFcfa(o.deliveryFeeFcfa)}</dd>
            </div>
            <div className="flex justify-between pt-1 text-sm font-semibold text-ink-950">
              <dt>Total ({o.currency})</dt>
              <dd className="font-mono">{formatFcfa(o.totalFcfa)}</dd>
            </div>
          </dl>
        </DashboardCard>

        {/* Livraison (doc 07 §23) */}
        <DashboardCard className="p-6">
          <CardHeader title="Delivery" subtitle="Suivi administratif" />
          <dl className="mt-4 space-y-2.5 text-xs">
            <InfoRow label="Méthode" value={o.delivery.method} />
            <InfoRow label="Zone" value={o.delivery.zone} />
            <InfoRow label="Adresse" value={o.delivery.address ?? "-"} />
            <InfoRow label="Frais" value={formatFcfa(o.delivery.feeFcfa)} />
            <InfoRow label="Statut" value={o.delivery.status} />
            <InfoRow label="Paiement" value={o.paymentMethod} />
          </dl>
          <p className="mt-4 rounded-xl bg-ink-50/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-500">
            Les informations d&apos;adresse ne sont visibles qu&apos;avec les permissions
            requises (doc 07 §23).
          </p>
        </DashboardCard>
      </div>

      {/* Timeline (doc 07 §24) + Notes internes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard className="p-6">
          <CardHeader title="Order timeline" subtitle="Parcours complet de la commande" />
          <ol className="mt-4 space-y-0">
            {[...o.timeline].reverse().map((ev, idx) => (
              <li key={ev.id} className="relative flex gap-3 pb-5 last:pb-0">
                {idx < o.timeline.length - 1 && (
                  <span className="absolute left-[7px] top-4 h-full w-px bg-line" />
                )}
                <span className="relative mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-gold-mid bg-surface">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-strong" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-950">{ev.label}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-400">
                    {timeAgo(ev.at)}
                    {ev.by ? ` · ${ev.by}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </DashboardCard>

        <DashboardCard className="p-6">
          <CardHeader
            title="Internal notes"
            subtitle="Réservé à l'équipe, invisible pour le client"
          />
          <div className="mt-4 space-y-3">
            {o.notes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
                No internal notes yet.
              </p>
            ) : (
              o.notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-line bg-ink-50/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] font-bold text-ink-600">{note.author}</p>
                    <p className="font-mono text-[10px] text-ink-400">{timeAgo(note.at)}</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-700">{note.content}</p>
                </div>
              ))
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Ajouter une note interne…"
                className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink-950 placeholder-ink-300 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteDraft.trim() || noteBusy}
                className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[10px] font-semibold text-ink-600 transition-colors hover:border-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {noteBusy ? "…" : "Ajouter"}
              </button>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Actions administratives (doc 07 §26-28) */}
      <DashboardCard className="border-gold-soft/60 p-6">
        <CardHeader
          title="Administrative actions"
          subtitle={
            o.status === "DELIVERED" || o.status === "CANCELLED"
              ? "Cette commande est close : aucune action n'est disponible."
              : "Actions encadrées : transitions autorisées uniquement, chaque action est journalisée."
          }
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {next.filter((s) => s !== "CANCELLED").map((s) => (
            <button
              key={s}
              onClick={() => openStatusModal(s)}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-100 active:scale-95"
            >
              <Icon name="check" size={14} strokeWidth={2.2} />
              Passer à {STATUS_OPTIONS.find((opt) => opt.value === s)?.label}
            </button>
          ))}
          {cancellable && (
            <button
              onClick={openCancelModal}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95"
            >
              <Icon name="x" size={14} strokeWidth={2.2} /> Annuler la commande
            </button>
          )}
          {next.length === 0 && (
            <p className="font-mono text-[11px] text-ink-400">
              Aucune transition autorisée depuis le statut {o.status}.
            </p>
          )}
        </div>
      </DashboardCard>

      {/* Modal changement de statut (doc 07 §27) */}
      <Modal
        open={statusModal}
        onClose={() => setStatusModal(false)}
        title="Change order status?"
        subtitle="La modification respecte les transitions autorisées et sera journalisée."
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-ink-50/50 px-4 py-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              Statut actuel
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-950">
              {STATUS_OPTIONS.find((opt) => opt.value === o.status)?.label}
            </p>
          </div>
          <Field label="Nouveau statut">
            <SelectInput
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as AdminOrderStatus)}
            >
              {next.filter((s) => s !== "CANCELLED").map((s) => (
                <option key={s} value={s}>
                  {STATUS_OPTIONS.find((opt) => opt.value === s)?.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Motif (obligatoire)" hint="Journalisé dans la timeline avec votre nom d'administrateur.">
            <TextArea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Pourquoi ce changement de statut ?"
            />
          </Field>
          <div className="mt-1 flex justify-end gap-2.5">
            <button
              onClick={() => setStatusModal(false)}
              className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-950"
            >
              Annuler
            </button>
            <button
              onClick={handleChangeStatus}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-800 active:scale-95 disabled:opacity-50"
            >
              {busy ? "Traitement…" : "Confirmer"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal annulation (doc 07 §28) */}
      <Modal
        open={cancelModal}
        onClose={() => setCancelModal(false)}
        title={`Cancel order ${o.reference}?`}
        subtitle="Cette action peut affecter l'inventaire, les enregistrements du vendeur et les informations client. Les conséquences métier sont gérées par le backend."
      >
        <div className="flex flex-col gap-4">
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700">
            Le frontend ne simule jamais de remise en stock, de remboursement ou de
            notification : ces opérations relèvent du backend (doc 07 §28).
          </p>
          <Field label="Motif (obligatoire)">
            <SelectInput value={reason} onChange={(e) => setReason(e.target.value)}>
              {CANCEL_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectInput>
            {reason === "Autre" && (
              <div className="mt-2">
                <TextArea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Précisez le motif…"
                />
              </div>
            )}
          </Field>
          <div className="mt-1 flex justify-end gap-2.5">
            <button
              onClick={() => setCancelModal(false)}
              className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-950"
            >
              Annuler
            </button>
            <button
              onClick={handleCancel}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              {busy ? "Traitement…" : "Confirmer l'annulation"}
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
