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
import type { AdminSubscriptionDetail } from "@/types/admin";
import { adminService } from "@/services/adminService";
import { SubscriptionStatusBadge, PlanBadge } from "@/components/admin/stores/StoreBadges";
import { BillingCycleBadge, TransactionTypeBadge } from "./SubscriptionBadges";
import { InfoRow } from "@/components/admin/ui/AdminBits";

/** Motifs de suspension d'un abonnement (doc 08 — §25) */
const SUSPEND_REASONS = [
  "Paiement en retard prolongé",
  "Violation des règles de la plateforme",
  "Demande d'investigation",
  "Autre",
];

interface SubscriptionDetailProps {
  sub: AdminSubscriptionDetail;
  adminName: string;
  /** Noms des plans disponibles, fournis par le backend (doc 08 §8) */
  planNames: string[];
  onUpdated: (updated: AdminSubscriptionDetail) => void;
}

/**
 * Détail d'un abonnement (doc 08 — §13) : boutique, plan, cycle de
 * facturation, historique, transactions, changements de plan + actions
 * administratives : changement de plan (montée/descente) et suspension.
 */
export function SubscriptionDetail({ sub, adminName, planNames, onUpdated }: SubscriptionDetailProps) {
  const { formatPrice } = useTranslation();
  const [planModal, setPlanModal] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [newPlan, setNewPlan] = useState("");
  const [planReason, setPlanReason] = useState("");
  const [suspendReason, setSuspendReason] = useState(SUSPEND_REASONS[0]);
  const [suspendCustom, setSuspendCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const s = sub;
  const closed = s.status === "CANCELLED" || s.status === "EXPIRED";
  const planOptions = planNames.filter((p) => p !== s.plan);

  const openPlanModal = () => {
    setNewPlan(planOptions[0] ?? "");
    setPlanReason("");
    setPlanModal(true);
  };

  const openSuspendModal = () => {
    setSuspendReason(SUSPEND_REASONS[0]);
    setSuspendCustom("");
    setSuspendModal(true);
  };

  const handleChangePlan = async () => {
    if (!newPlan) return;
    setBusy(true);
    const updated = await adminService.changeSubscriptionPlan(s.id, newPlan, {
      reason: planReason.trim() || undefined,
      by: adminName,
    });
    setBusy(false);
    if (updated) {
      onUpdated(updated);
      setPlanModal(false);
      setToast(`Plan changé : ${s.plan} → ${newPlan}.`);
    }
  };

  const handleSuspend = async () => {
    const reason = suspendReason === "Autre" ? suspendCustom.trim() : suspendReason;
    if (!reason) {
      setToast("Un motif est obligatoire pour suspendre.");
      return;
    }
    setBusy(true);
    const updated = await adminService.suspendSubscription(s.id, { reason, by: adminName });
    setBusy(false);
    if (updated) {
      onUpdated(updated);
      setSuspendModal(false);
      setToast("Abonnement suspendu.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/subscriptions"
            className="mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-ink-500 transition-colors hover:text-gold-strong"
          >
            <Icon name="chevronLeft" size={12} /> Subscriptions & Revenue
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-950">
              {s.store.name}
            </h1>
            <PlanBadge plan={s.plan} />
            <SubscriptionStatusBadge status={s.status} />
            <BillingCycleBadge cycle={s.billingCycle} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {s.ownerName} · abonnement {s.id}
          </p>
        </div>

        {s.status === "PAST_DUE" && (
          <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-700">
            <Icon name="alert" size={14} />
            Paiement en retard : abonnement à risque
          </span>
        )}
      </div>

      {/* Grille : boutique + plan */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard className="p-6">
          <CardHeader
            title="Store"
            action={
              <Link
                href={`/admin/stores/${s.store.id}`}
                className="font-mono text-[10px] font-semibold text-blue-700 hover:text-blue-600"
              >
                View store →
              </Link>
            }
          />
          <div className="mt-4">
            <p className="font-display text-base font-semibold text-ink-950">{s.store.name}</p>
            <p className="mt-0.5 text-xs text-ink-500">{s.ownerName}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <InfoRow label="Propriétaire ID" value={s.owner.id} mono />
              <InfoRow label="Email" value={s.owner.email} />
              <InfoRow label="Statut boutique" value={s.storeStatus} />
              <InfoRow label="Vérification" value={s.verificationStatus ?? "-"} />
            </dl>
          </div>
        </DashboardCard>

        <DashboardCard className="p-6">
          <CardHeader title="Plan & cycle" />
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <InfoRow label="Plan actuel" value={s.plan} />
            <InfoRow label="Prix (mois)" value={formatPrice(s.planPriceFcfa)} />
            <InfoRow label="Montant facturé" value={s.amountFcfa > 0 ? formatPrice(s.amountFcfa) : "-"} />
            <InfoRow label="Cycle" value={s.billingCycle === "yearly" ? "Annuel" : "Mensuel"} />
            <InfoRow label="Début" value={new Date(s.startedAt).toLocaleDateString("fr-FR")} />
            <InfoRow label="Échéance" value={s.renewalDate ? new Date(s.renewalDate).toLocaleDateString("fr-FR") : "-"} />
            <InfoRow label="Méthode de paiement" value={s.paymentMethod} />
            {s.trialEndsAt && (
              <InfoRow label="Fin d'essai" value={new Date(s.trialEndsAt).toLocaleDateString("fr-FR")} />
            )}
          </dl>
        </DashboardCard>
      </div>

      {/* Changements de plan (doc 08 §14) + Transactions (doc 08 §13) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard className="p-6">
          <CardHeader title="Plan changes" subtitle="Montées et descentes en gamme" />
          {s.planChanges.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
              Aucun changement de plan pour cet abonnement.
            </p>
          ) : (
            <ol className="mt-4 space-y-0">
              {[...s.planChanges].reverse().map((pc, idx) => (
                <li key={pc.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {idx < s.planChanges.length - 1 && (
                    <span className="absolute left-[7px] top-4 h-full w-px bg-line" />
                  )}
                  <span className="relative mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-gold-mid bg-surface">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-strong" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-950">
                      {pc.fromPlan} → {pc.toPlan}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-400">
                      {timeAgo(pc.at)}
                      {pc.reason ? ` · ${pc.reason}` : ""}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 font-mono text-[10px]",
                        pc.priceDiffFcfa >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {pc.priceDiffFcfa >= 0 ? "+" : ""}
                      {formatPrice(pc.priceDiffFcfa)} / mois
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </DashboardCard>

        <DashboardCard className="p-6">
          <CardHeader title="Transactions" subtitle="Historique financier" />
          {s.transactions.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
              Aucune transaction pour le moment (essai gratuit).
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-xs text-ink-700">
                <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-2 py-2.5">TYPE</th>
                    <th className="px-2 py-2.5 text-right">MONTANT</th>
                    <th className="px-2 py-2.5">STATUT</th>
                    <th className="px-2 py-2.5">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {s.transactions.map((tx) => (
                    <tr key={tx.id} className="transition-colors hover:bg-ink-50/70">
                      <td className="px-2 py-3">
                        <TransactionTypeBadge type={tx.type} />
                      </td>
                      <td className="px-2 py-3 text-right font-mono text-[11px] text-ink-800">
                        {formatPrice(tx.amountFcfa)}
                      </td>
                      <td className="px-2 py-3 text-ink-600">{tx.status}</td>
                      <td className="px-2 py-3 font-mono text-[10px] text-ink-400">
                        {timeAgo(tx.at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Historique (doc 08 §13) */}
      <DashboardCard className="p-6">
        <CardHeader title="History" subtitle="Traçabilité complète de l'abonnement" />
        <ol className="mt-4 space-y-0">
          {[...s.history].reverse().map((ev, idx) => (
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
              </div>
            </li>
          ))}
        </ol>
      </DashboardCard>

      {/* Actions administratives (doc 08 §25) */}
      <DashboardCard className="border-gold-soft/60 p-6">
        <CardHeader
          title="Administrative actions"
          subtitle={
            closed
              ? "Cet abonnement est clos : aucune action n'est disponible."
              : "Changer de plan ou suspendre l'abonnement. Chaque action est journalisée."
          }
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!closed && planOptions.length > 0 && (
            <button
              onClick={openPlanModal}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-100 active:scale-95"
            >
              <Icon name="refresh" size={14} />
              Changer de plan
            </button>
          )}
          {!closed && s.status !== "SUSPENDED" && (
            <button
              onClick={openSuspendModal}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-amber-600/20 transition-all hover:bg-amber-700 active:scale-95"
            >
              <Icon name="clock" size={14} /> Suspendre l&apos;abonnement
            </button>
          )}
          {closed && (
            <p className="font-mono text-[11px] text-ink-400">Abonnement {s.status}.</p>
          )}
        </div>
      </DashboardCard>

      {/* Modal changement de plan (doc 08 §14) */}
      <Modal
        open={planModal}
        onClose={() => setPlanModal(false)}
        title="Change plan?"
        subtitle="Le prorata et la facturation réels sont gérés par le backend."
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-ink-50/50 px-4 py-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              Plan actuel
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-950">{s.plan}</p>
          </div>
          <Field label="Nouveau plan">
            <SelectInput value={newPlan} onChange={(e) => setNewPlan(e.target.value)}>
              {planOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Raison (optionnelle)">
            <TextArea
              value={planReason}
              onChange={(e) => setPlanReason(e.target.value)}
              placeholder="Pourquoi ce changement de plan ?"
            />
          </Field>
          <div className="mt-1 flex justify-end gap-2.5">
            <button
              onClick={() => setPlanModal(false)}
              className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-950"
            >
              Annuler
            </button>
            <button
              onClick={handleChangePlan}
              disabled={busy || !newPlan}
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-800 active:scale-95 disabled:opacity-50"
            >
              {busy ? "Traitement…" : "Confirmer"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal suspension (doc 08 §25) */}
      <Modal
        open={suspendModal}
        onClose={() => setSuspendModal(false)}
        title="Suspend this subscription?"
        subtitle="La boutique perdra l'accès aux fonctionnalités payantes."
      >
        <div className="flex flex-col gap-4">
          <Field label="Motif (obligatoire)" hint="Journalisé avec votre nom d'administrateur.">
            <SelectInput value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}>
              {SUSPEND_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectInput>
            {suspendReason === "Autre" && (
              <div className="mt-2">
                <TextArea
                  value={suspendCustom}
                  onChange={(e) => setSuspendCustom(e.target.value)}
                  placeholder="Précisez le motif…"
                />
              </div>
            )}
          </Field>
          <div className="mt-1 flex justify-end gap-2.5">
            <button
              onClick={() => setSuspendModal(false)}
              className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-950"
            >
              Annuler
            </button>
            <button
              onClick={handleSuspend}
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-50"
            >
              {busy ? "Traitement…" : "Suspendre"}
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
