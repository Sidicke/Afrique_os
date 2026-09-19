"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Modal } from "@/components/dashboard/ui/Modal";
import { Toast } from "@/components/dashboard/ui/Toast";
import { Field, TextArea, SelectInput } from "@/components/dashboard/ui/Field";
import { Icon } from "@/components/dashboard/icons";
import { cn, timeAgo } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import type { AdminStoreDetail } from "@/types/admin";
import { adminService } from "@/services/adminService";
import { StoreStatusBadge, SubscriptionStatusBadge, PlanBadge } from "./StoreBadges";
import { InfoRow, StatBox } from "@/components/admin/ui/AdminBits";
import { VerificationStatusBadge } from "@/components/admin/verification/VerificationBadges";

/** Motifs prédéfinis pour suspendre (doc 05 — §25) */
const SUSPEND_REASONS = [
  "Signalements clients récurrents",
  "Non-respect des délais de livraison",
  "Produits contrefaits ou non conformes",
  "Paiement en retard (abonnement)",
  "Violation des règles de la plateforme",
  "Autre",
];

/** Motifs prédéfinis pour bloquer (doc 05 — §27) */
const BLOCK_REASONS = [
  "Fraude documentaire avérée",
  "Récidive après suspension",
  "Activité illégale",
  "Atteinte grave à la plateforme",
  "Autre",
];

type AdminAction = "SUSPEND" | "REACTIVATE" | "BLOCK";

interface StoreDetailProps {
  store: AdminStoreDetail;
  /** Nom de l'administrateur connecté (actions + notes) */
  adminName: string;
  onUpdated: (updated: AdminStoreDetail) => void;
}

/**
 * Détail d'une boutique (doc 05 — §15 à §32) : identité, marchand,
 * vérification, statistiques, abonnement, modération, activité, historique,
 * notes internes et le panneau d'actions — suspendre / réactiver / bloquer,
 * chaque action destructrice demandant une confirmation avec motif.
 */
export function StoreDetail({ store, adminName, onUpdated }: StoreDetailProps) {
  const { formatPrice } = useTranslation();
  const [action, setAction] = useState<AdminAction | null>(null);
  const [reason, setReason] = useState(SUSPEND_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  /** Ouvre le modal en réinitialisant le motif selon l'action (jamais de valeur
   *  obsolète d'un autre modal : SUSPEND ≠ BLOCK pour les listes de motifs) */
  const openAction = (a: AdminAction) => {
    setAction(a);
    setReason(a === "BLOCK" ? BLOCK_REASONS[0] : SUSPEND_REASONS[0]);
    setCustomReason("");
  };
  const [noteDraft, setNoteDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const s = store;
  const isBlocked = s.status === "BLOCKED";
  const isSuspended = s.status === "SUSPENDED";
  const actionLocked = isBlocked;

  const reasons = action === "BLOCK" ? BLOCK_REASONS : SUSPEND_REASONS;

  const handleAction = async () => {
    if (!action) return;
    const needsReason = action === "SUSPEND" || action === "BLOCK";
    const finalReason = needsReason
      ? reason === "Autre"
        ? customReason.trim()
        : reason
      : undefined;
    if (needsReason && !finalReason) {
      setToast("Un motif est obligatoire pour cette action.");
      return;
    }
    setBusy(true);
    const updated = await adminService.setStoreStatus(s.id, action, {
      reason: finalReason,
      by: adminName,
    });
    setBusy(false);
    if (updated) {
      onUpdated(updated);
      setAction(null);
      setCustomReason("");
      setReason(SUSPEND_REASONS[0]);
      setToast(
        action === "SUSPEND"
          ? "Boutique suspendue."
          : action === "BLOCK"
            ? "Boutique bloquée."
            : "Boutique réactivée."
      );
    }
  };

  const handleAddNote = async () => {
    const content = noteDraft.trim();
    if (!content || noteBusy) return;
    setNoteBusy(true);
    const updated = await adminService.addStoreNote(s.id, content, adminName);
    setNoteBusy(false);
    if (updated) {
      onUpdated(updated);
      setNoteDraft("");
      setToast("Note interne ajoutée.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête boutique */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/stores"
            className="mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-ink-500 transition-colors hover:text-gold-strong"
          >
            <Icon name="chevronLeft" size={12} /> Stores Management
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-950">
              {s.name}
            </h1>
            <StoreStatusBadge status={s.status} />
            <PlanBadge plan={s.plan} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            /{s.slug}
            {s.tagline ? ` · ${s.tagline}` : ""}
            {s.location ? ` · ${s.location}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isBlocked && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
              <Icon name="alert" size={14} />
              Boutique bloquée : accès définitivement restreint
            </span>
          )}
          {isSuspended && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-700">
              <Icon name="clock" size={14} />
              Boutique suspendue : en attente de décision
            </span>
          )}
        </div>
      </div>

      {/* Grille : identité + marchand */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Store identity (doc 05 §16) */}
        <DashboardCard className="p-6">
          <CardHeader title="Store identity" />
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={s.name} size="lg" />
            <div>
              <p className="font-display text-base font-semibold text-ink-950">{s.name}</p>
              <p className="text-xs text-ink-500">/{s.slug}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <InfoRow label="Store ID" value={s.id} mono />
            <InfoRow label="Catégorie" value={s.category ?? "-"} />
            <InfoRow label="Localisation" value={s.location ?? "-"} />
            <InfoRow label="Créée le" value={new Date(s.createdAt).toLocaleDateString("fr-FR")} />
            <InfoRow label="Email" value={s.email ?? "-"} />
            <InfoRow label="Téléphone" value={s.phone ?? "-"} />
          </dl>
          {s.description && (
            <p className="mt-4 rounded-xl bg-ink-50/50 px-4 py-3 text-xs leading-relaxed text-ink-600">
              {s.description}
            </p>
          )}
        </DashboardCard>

        {/* Merchant (doc 05 §18) */}
        <DashboardCard className="p-6">
          <CardHeader
            title="Merchant"
            action={
              <Link
                href={`/admin/users/${s.merchant.id}`}
                className="font-mono text-[10px] font-semibold text-blue-700 hover:text-blue-600"
              >
                View merchant →
              </Link>
            }
          />
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={s.merchant.name} size="lg" />
            <div>
              <p className="font-display text-base font-semibold text-ink-950">{s.merchant.name}</p>
              <p className="text-xs text-ink-500">{s.merchant.email}</p>
              <p className="text-xs text-ink-500">{s.merchant.phone}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <InfoRow label="Merchant ID" value={s.merchant.id} mono />
            <InfoRow label="Inscrit le" value={new Date(s.merchant.joinedAt).toLocaleDateString("fr-FR")} />
            <InfoRow label="Compte" value={s.merchant.accountStatus} />
          </dl>
        </DashboardCard>
      </div>

      {/* Vérification + Abonnement */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Verification (doc 05 §19) */}
        <DashboardCard className="p-6">
          <CardHeader
            title="Verification"
            action={
              s.verificationStatus ? (
                <Link
                  href="/admin/verification"
                  className="font-mono text-[10px] font-semibold text-blue-700 hover:text-blue-600"
                >
                  View case →
                </Link>
              ) : undefined
            }
          />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-line bg-ink-50/40 px-4 py-3">
              <span className="text-xs text-ink-500">Statut de vérification</span>
              {s.verificationStatus ? (
                <VerificationStatusBadge status={s.verificationStatus} />
              ) : (
                <span className="text-xs text-ink-300">Non soumis</span>
              )}
            </div>
            {s.verifiedAt && (
              <p className="font-mono text-[10px] text-ink-400">
                Vérifiée le {new Date(s.verifiedAt).toLocaleDateString("fr-FR")}
                {s.verifiedBy ? ` par ${s.verifiedBy}` : ""}
              </p>
            )}
          </div>
        </DashboardCard>

        {/* Subscription (doc 05 §22) */}
        <DashboardCard className="p-6">
          <CardHeader title="Subscription" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-ink-50/40 px-4 py-3">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
                Formule
              </p>
              <div className="mt-1.5">
                <PlanBadge plan={s.plan} />
              </div>
            </div>
            <div className="rounded-xl border border-line bg-ink-50/40 px-4 py-3">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
                Statut
              </p>
              <div className="mt-1.5">
                <SubscriptionStatusBadge status={s.subscriptionStatus} />
              </div>
            </div>
          </div>
          {s.renewalDate && (
            <p className="mt-3 font-mono text-[10px] text-ink-400">
              Prochaine échéance : {new Date(s.renewalDate).toLocaleDateString("fr-FR")}
            </p>
          )}
        </DashboardCard>
      </div>

      {/* Statistiques (doc 05 §20) */}
      <DashboardCard className="p-6">
        <CardHeader title="Performance" subtitle="Commandes, GMV et catalogue" />
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatBox label="Produits" value={String(s.productsCount)} />
          <StatBox label="Commandes (total)" value={s.ordersCount.toLocaleString("fr-FR")} />
          <StatBox label="Commandes (ce mois)" value={String(s.ordersThisMonth)} />
          <StatBox label="GMV" value={formatPrice(s.gmvFcfa)} gold />
        </div>
      </DashboardCard>

      {/* Modération (doc 05 §23) */}
      <DashboardCard className="p-6">
        <CardHeader title="Moderation" subtitle="Signalements et avertissements actifs" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div
            className={cn(
              "rounded-xl border px-4 py-3",
              s.reportsCount > 0 ? "border-red-200 bg-red-50/60" : "border-line bg-ink-50/40"
            )}
          >
            <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              Signalements
            </p>
            <p className={cn("mt-1 font-display text-lg font-semibold", s.reportsCount > 0 ? "text-red-600" : "text-ink-950")}>
              {s.reportsCount}
            </p>
          </div>
          <div
            className={cn(
              "rounded-xl border px-4 py-3",
              s.activeWarnings > 0 ? "border-amber-200 bg-amber-50/60" : "border-line bg-ink-50/40"
            )}
          >
            <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              Avertissements
            </p>
            <p className={cn("mt-1 font-display text-lg font-semibold", s.activeWarnings > 0 ? "text-amber-600" : "text-ink-950")}>
              {s.activeWarnings}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-ink-50/40 px-4 py-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              Suspensions passées
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink-950">
              {s.previousSuspensions}
            </p>
          </div>
        </div>
        {s.reportsCount > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/40 px-4 py-2.5">
            <Icon name="alert" size={14} className="text-red-600" />
            <p className="text-xs text-red-700">
              Cette boutique a des signalements actifs. Consultez le module Modération.
            </p>
          </div>
        )}
      </DashboardCard>

      {/* Activité + Historique */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity (doc 05 §21) */}
        <DashboardCard className="p-6">
          <CardHeader title="Recent activity" />
          <ul className="mt-4 space-y-0">
            {s.activity.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
                No activity yet.
              </p>
            ) : (
              s.activity.slice(0, 6).map((ev) => (
                <li key={ev.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-500">
                    <Icon name="clock" size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink-800">{ev.label}</p>
                  </div>
                  <p className="font-mono text-[10px] text-ink-400">{timeAgo(ev.at)}</p>
                </li>
              ))
            )}
          </ul>
        </DashboardCard>

        {/* Admin history (doc 05 §31) */}
        <DashboardCard className="p-6">
          <CardHeader title="Admin history" subtitle="Traçabilité des actions administratives" />
          <ol className="mt-4 space-y-0">
            {s.history.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
                No history yet.
              </p>
            ) : (
              [...s.history].reverse().map((ev, idx) => (
                <li key={ev.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {idx < s.history.length - 1 && (
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
                    {ev.reason && (
                      <p className="mt-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] leading-snug text-red-700">
                        Motif : {ev.reason}
                      </p>
                    )}
                  </div>
                </li>
              ))
            )}
          </ol>
        </DashboardCard>
      </div>

      {/* Notes internes (doc 05 §32) */}
      <DashboardCard className="p-6">
        <CardHeader
          title="Internal notes"
          subtitle="Réservé à l'équipe, invisible pour le vendeur"
        />
        <div className="mt-4 space-y-3">
          {s.notes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
              No internal notes yet.
            </p>
          ) : (
            s.notes.map((note) => (
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

      {/* Panneau d'actions (doc 05 §25-28) */}
      <DashboardCard className="border-gold-soft/60 p-6">
        <CardHeader
          title="Administrative actions"
          subtitle={
            actionLocked
              ? "Cette boutique est bloquée : aucune action supplémentaire n'est possible."
              : "Suspendre, réactiver ou bloquer la boutique. Les actions sensibles demandent un motif."
          }
        />
        <div className="mt-4 flex flex-wrap gap-3">
          {!isSuspended && !actionLocked && (
            <button
              onClick={() => openAction("SUSPEND")}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-400/60 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-100 active:scale-95"
            >
              <Icon name="clock" size={16} /> Suspendre
            </button>
          )}
          {isSuspended && !actionLocked && (
            <button
              onClick={() => openAction("REACTIVATE")}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-green-700/20 transition-all hover:bg-green-800 active:scale-95"
            >
              <Icon name="check" size={16} strokeWidth={2.2} /> Réactiver
            </button>
          )}
          {!actionLocked && (
            <button
              onClick={() => openAction("BLOCK")}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95"
            >
              <Icon name="x" size={16} strokeWidth={2.2} /> Bloquer
            </button>
          )}
        </div>
      </DashboardCard>

      {/* Modal de confirmation */}
      <Modal
        open={action !== null}
        onClose={() => setAction(null)}
        title={
          action === "SUSPEND"
            ? "Suspendre cette boutique ?"
            : action === "BLOCK"
              ? "Bloquer définitivement cette boutique ?"
              : "Réactiver cette boutique ?"
        }
        subtitle={
          action === "SUSPEND"
            ? "La boutique sera inaccessible au public pendant la suspension. Cette action est réversible."
            : action === "BLOCK"
              ? "Action définitive : la boutique et son vendeur perdront l'accès à la plateforme."
              : "La boutique redevient visible et opérationnelle pour le public."
        }
      >
        <div className="flex flex-col gap-4">
          {(action === "SUSPEND" || action === "BLOCK") && (
            <Field label="Motif (obligatoire)" hint="Le motif sera consigné dans l'historique administratif de la boutique.">
              <SelectInput value={reason} onChange={(e) => setReason(e.target.value)}>
                {reasons.map((r) => (
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
          )}

          {action === "REACTIVATE" && (
            <p className="rounded-xl border border-green-200 bg-green-100/60 px-4 py-3 text-xs leading-relaxed text-green-700">
              La boutique {s.name} redevient active. Le vendeur sera notifié de la décision.
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2.5">
            <button
              onClick={() => setAction(null)}
              className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-950"
            >
              Annuler
            </button>
            <button
              onClick={handleAction}
              disabled={busy}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50",
                action === "BLOCK"
                  ? "bg-red-600 hover:bg-red-700"
                  : action === "SUSPEND"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-green-700 hover:bg-green-800"
              )}
            >
              {busy
                ? "Traitement…"
                : action === "SUSPEND"
                  ? "Suspendre"
                  : action === "BLOCK"
                    ? "Bloquer"
                    : "Réactiver"}
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
