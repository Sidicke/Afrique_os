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
import type { AdminUserDetail } from "@/types/admin";
import { adminService } from "@/services/adminService";
import { UserRoleBadge, UserStatusBadge } from "./UserBadges";
import { PlanBadge, SubscriptionStatusBadge } from "@/components/admin/stores/StoreBadges";
import { InfoRow, StatBox } from "@/components/admin/ui/AdminBits";

/** Motifs prédéfinis pour suspendre (doc 06 — §16) */
const SUSPEND_REASONS = [
  "Violation des règles de la plateforme",
  "Comportement abusif",
  "Non-respect des conditions d'utilisation",
  "Paiement en retard (abonnement)",
  "Autre",
];

/** Motifs prédéfinis pour bloquer (doc 06 — §18) */
const BLOCK_REASONS = [
  "Fraude avérée",
  "Récidive après suspension",
  "Activité illégale",
  "Usurpation d'identité",
  "Autre",
];

/** Motifs prédéfinis pour désactiver (doc 06 — §19) */
const DEACTIVATE_REASONS = [
  "Demande de l'utilisateur",
  "Compte inactif prolongé",
  "Fermeture d'entreprise",
  "Autre",
];

type AdminAction = "SUSPEND" | "REACTIVATE" | "BLOCK" | "DEACTIVATE";

interface UserDetailProps {
  user: AdminUserDetail;
  /** Nom de l'administrateur connecté (actions + notes) */
  adminName: string;
  onUpdated: (updated: AdminUserDetail) => void;
}

/**
 * Détail d'un utilisateur (doc 06 — §9 à §23) : profil, informations du
 * compte, sections vendeur/client, timeline d'activité, commandes associées,
 * historique administratif, notes internes et panneau d'actions — suspendre /
 * réactiver / bloquer / désactiver, chaque action sensible demandant une
 * confirmation avec motif obligatoire.
 */
export function UserDetail({ user, adminName, onUpdated }: UserDetailProps) {
  const { formatPrice } = useTranslation();
  const [action, setAction] = useState<AdminAction | null>(null);
  const [reason, setReason] = useState(SUSPEND_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [noteBusy, setNoteBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const u = user;
  const isAdminAccount = u.role === "ADMIN";
  const isBlocked = u.status === "BLOCKED";
  const isSuspended = u.status === "SUSPENDED";
  const isDeactivated = u.status === "DEACTIVATED";
  // Un compte admin ne peut pas être suspendu depuis cette interface (doc 06 §21)
  const actionLocked = isBlocked || isDeactivated || isAdminAccount;

  const reasons =
    action === "BLOCK"
      ? BLOCK_REASONS
      : action === "DEACTIVATE"
        ? DEACTIVATE_REASONS
        : SUSPEND_REASONS;

  /** Ouvre le modal en réinitialisant le motif selon l'action (jamais de valeur
   *  obsolète d'un autre modal : les listes de motifs diffèrent) */
  const openAction = (a: AdminAction) => {
    setAction(a);
    setReason(
      a === "BLOCK"
        ? BLOCK_REASONS[0]
        : a === "DEACTIVATE"
          ? DEACTIVATE_REASONS[0]
          : SUSPEND_REASONS[0]
    );
    setCustomReason("");
  };

  const handleAction = async () => {
    if (!action) return;
    const needsReason = action === "SUSPEND" || action === "BLOCK" || action === "DEACTIVATE";
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
    const updated = await adminService.setUserStatus(u.id, action, {
      reason: finalReason,
      by: adminName,
    });
    setBusy(false);
    if (updated) {
      onUpdated(updated);
      setAction(null);
      setCustomReason("");
      setToast(
        action === "SUSPEND"
          ? "Compte suspendu."
          : action === "BLOCK"
            ? "Compte bloqué."
            : action === "DEACTIVATE"
              ? "Compte désactivé."
              : "Compte réactivé."
      );
    }
  };

  const handleAddNote = async () => {
    const content = noteDraft.trim();
    if (!content || noteBusy) return;
    setNoteBusy(true);
    const updated = await adminService.addUserNote(u.id, content, adminName);
    setNoteBusy(false);
    if (updated) {
      onUpdated(updated);
      setNoteDraft("");
      setToast("Note interne ajoutée.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête profil (doc 06 §9) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/users"
            className="mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-ink-500 transition-colors hover:text-gold-strong"
          >
            <Icon name="chevronLeft" size={12} /> Users Management
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-950">
              {u.name}
            </h1>
            <UserRoleBadge role={u.role} />
            <UserStatusBadge status={u.status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {u.email} · {u.phone}
          </p>
        </div>

        {actionLocked && (
          <span className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-2 text-xs font-medium text-ink-600">
            <Icon name="shield" size={14} />
            {isBlocked
              ? "Compte bloqué : aucune action disponible"
              : isDeactivated
                ? "Compte désactivé : aucune action disponible"
                : "Compte administrateur : actions limitées"}
          </span>
        )}
      </div>

      {/* Grille : profil + informations du compte */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profil (doc 06 §9) */}
        <DashboardCard className="p-6">
          <CardHeader title="Profile" />
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={u.name} size="lg" />
            <div>
              <p className="font-display text-base font-semibold text-ink-950">{u.name}</p>
              <p className="text-xs text-ink-500">{u.email}</p>
              <p className="text-xs text-ink-500">{u.phone}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <InfoRow label="Rôle" value={u.role} />
            <InfoRow label="Statut" value={u.status} />
            <InfoRow label="Inscrit le" value={new Date(u.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} />
            <InfoRow label="Dernière activité" value={timeAgo(u.lastActiveAt)} />
          </dl>
        </DashboardCard>

        {/* Informations du compte (doc 06 §10) */}
        <DashboardCard className="p-6">
          <CardHeader title="Account information" />
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <InfoRow label="User ID" value={u.id} mono />
            <InfoRow label="Nom complet" value={u.name} />
            <InfoRow label="Email" value={u.email} />
            <InfoRow label="Téléphone" value={u.phone} />
            <InfoRow label="Dernière connexion" value={u.lastLoginAt ? timeAgo(u.lastLoginAt) : "-"} />
            <InfoRow label="Modifié le" value={new Date(u.updatedAt).toLocaleDateString("fr-FR")} />
          </dl>
        </DashboardCard>
      </div>

      {/* Section vendeur (doc 06 §11) */}
      {u.store ? (
        <DashboardCard className="p-6">
          <CardHeader
            title="Seller · Store"
            action={
              <div className="flex items-center gap-3">
                {u.store.verificationId && (
                  <Link
                    href={`/admin/verification/${u.store.verificationId}`}
                    className="font-mono text-[10px] font-semibold text-blue-700 hover:text-blue-600"
                  >
                    View verification →
                  </Link>
                )}
                <Link
                  href={`/admin/stores/${u.store.id}`}
                  className="font-mono text-[10px] font-semibold text-blue-700 hover:text-blue-600"
                >
                  View store →
                </Link>
              </div>
            }
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-display text-base font-semibold text-ink-950">{u.store.name}</p>
                <span className="font-mono text-[10px] text-ink-400">/{u.store.slug}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <InfoRow label="Store ID" value={u.store.id} mono />
                <InfoRow label="Créée le" value={new Date(u.store.createdAt).toLocaleDateString("fr-FR")} />
                <InfoRow label="Vérification" value={u.store.verificationStatus ?? "Non soumis"} />
              </dl>
            </div>
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
                Abonnement
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PlanBadge plan={u.store.plan} />
                <SubscriptionStatusBadge status={u.store.subscriptionStatus} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <InfoRow label="Statut boutique" value={u.store.status} />
                <InfoRow label="Slug" value={u.store.slug} mono />
              </dl>
            </div>
          </div>
        </DashboardCard>
      ) : u.clientStats ? (
        /* Section client (doc 06 §12) */
        <DashboardCard className="p-6">
          <CardHeader title="Customer overview" />
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatBox label="Commandes" value={String(u.clientStats.ordersCount)} />
            <StatBox label="Total dépensé" value={formatPrice(u.clientStats.totalSpentFcfa)} />
            <StatBox label="Conversations" value={String(u.clientStats.conversationsCount)} />
            <StatBox
              label="Dernière commande"
              value={u.clientStats.lastOrderAt ? timeAgo(u.clientStats.lastOrderAt) : "-"}
            />
          </div>
        </DashboardCard>
      ) : null}

      {/* Timeline d'activité (doc 06 §13) + Commandes (doc 06 §14) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity timeline */}
        <DashboardCard className="p-6">
          <CardHeader title="Recent activity" subtitle="Parcours récent de l'utilisateur" />
          <ol className="mt-4 space-y-0">
            {u.activity.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
                No activity yet.
              </p>
            ) : (
              [...u.activity].reverse().map((ev, idx) => (
                <li key={ev.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {idx < u.activity.length - 1 && (
                    <span className="absolute left-[7px] top-4 h-full w-px bg-line" />
                  )}
                  <span className="relative mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-gold-mid bg-surface">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-strong" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-950">{ev.label}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-400">{timeAgo(ev.at)}</p>
                  </div>
                </li>
              ))
            )}
          </ol>
        </DashboardCard>

        {/* Orders summary (doc 06 §14) */}
        <DashboardCard className="p-6">
          <CardHeader
            title="Orders"
            action={
              u.clientStats && u.clientStats.ordersCount > 0 ? (
                <Link
                  href="/admin/orders"
                  className="font-mono text-[10px] font-semibold text-blue-700 hover:text-blue-600"
                >
                  View all orders →
                </Link>
              ) : undefined
            }
          />
          {u.orders.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
              Aucune commande associée à ce compte.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[360px] text-left text-xs text-ink-700">
                <thead className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-2 py-2.5">COMMANDE</th>
                    <th className="px-2 py-2.5">BOUTIQUE</th>
                    <th className="px-2 py-2.5 text-right">MONTANT</th>
                    <th className="px-2 py-2.5">STATUT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {u.orders.slice(0, 5).map((o) => (
                    <tr key={o.id} className="transition-colors hover:bg-ink-50/70">
                      <td className="px-2 py-3 font-mono text-[11px] text-ink-800">#{o.id}</td>
                      <td className="px-2 py-3 text-ink-600">{o.storeName}</td>
                      <td className="px-2 py-3 text-right font-mono text-[11px] text-ink-800">
                        {formatPrice(o.amountFcfa)}
                      </td>
                      <td className="px-2 py-3 text-ink-600">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {u.clientStats && u.clientStats.lastOrderAt && (
            <p className="mt-3 font-mono text-[10px] text-ink-400">
              Dernière commande : {timeAgo(u.clientStats.lastOrderAt)}
            </p>
          )}
        </DashboardCard>
      </div>

      {/* Historique administratif (doc 06 §23 audit log) + Notes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Admin history — audit log */}
        <DashboardCard className="p-6">
          <CardHeader title="Admin history" subtitle="Traçabilité des actions administratives" />
          <ol className="mt-4 space-y-0">
            {u.history.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
                No history yet.
              </p>
            ) : (
              [...u.history].reverse().map((ev, idx) => (
                <li key={ev.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {idx < u.history.length - 1 && (
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

        {/* Internal notes */}
        <DashboardCard className="p-6">
          <CardHeader
            title="Internal notes"
            subtitle="Réservé à l'équipe, invisible pour l'utilisateur"
          />
          <div className="mt-4 space-y-3">
            {u.notes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
                No internal notes yet.
              </p>
            ) : (
              u.notes.map((note) => (
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

      {/* Panneau d'actions (doc 06 §16-19) */}
      <DashboardCard className="border-gold-soft/60 p-6">
        <CardHeader
          title="Administrative actions"
          subtitle={
            actionLocked
              ? isBlocked
                ? "Ce compte est bloqué : aucune action supplémentaire n'est possible."
                : isDeactivated
                  ? "Ce compte est désactivé : aucune action supplémentaire n'est possible."
                  : "Ce compte administrateur ne peut pas être modifié depuis cette interface."
              : "Suspendre, réactiver, bloquer ou désactiver le compte. Les actions sensibles demandent un motif."
          }
        />
        {!actionLocked && (
          <div className="mt-4 flex flex-wrap gap-3">
            {!isSuspended && (
              <button
                onClick={() => openAction("SUSPEND")}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-400/60 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-100 active:scale-95"
              >
                <Icon name="clock" size={16} /> Suspendre
              </button>
            )}
            {isSuspended && (
              <button
                onClick={() => openAction("REACTIVATE")}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-green-700/20 transition-all hover:bg-green-800 active:scale-95"
              >
                <Icon name="check" size={16} strokeWidth={2.2} /> Réactiver
              </button>
            )}
            {!isSuspended && (
              <button
                onClick={() => openAction("DEACTIVATE")}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink-300 bg-surface px-4 py-3 text-sm font-semibold text-ink-700 transition-all hover:border-ink-500 hover:text-ink-950 active:scale-95"
              >
                <Icon name="x" size={16} /> Désactiver
              </button>
            )}
            <button
              onClick={() => openAction("BLOCK")}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95"
            >
              <Icon name="shield" size={16} /> Bloquer
            </button>
          </div>
        )}
      </DashboardCard>

      {/* Modal de confirmation */}
      <Modal
        open={action !== null}
        onClose={() => setAction(null)}
        title={
          action === "SUSPEND"
            ? "Suspendre ce compte ?"
            : action === "BLOCK"
              ? "Bloquer définitivement ce compte ?"
              : action === "DEACTIVATE"
                ? "Désactiver ce compte ?"
                : "Réactiver ce compte ?"
        }
        subtitle={
          action === "SUSPEND"
            ? "Le compte sera temporairement inaccessible. Cette action est réversible."
            : action === "BLOCK"
              ? "Action définitive : l'utilisateur perdra l'accès à la plateforme."
              : action === "DEACTIVATE"
                ? "Le compte sera fermé mais ses données historiques resteront cohérentes."
                : "Le compte retrouvera l'accès à la plateforme."
        }
      >
        <div className="flex flex-col gap-4">
          {(action === "SUSPEND" || action === "BLOCK" || action === "DEACTIVATE") && (
            <Field label="Motif (obligatoire)" hint="Le motif sera consigné dans l'historique administratif du compte.">
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
              Le compte {u.name} retrouvera l&apos;accès à la plateforme. L&apos;utilisateur sera
              notifié de la décision.
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
                    : action === "DEACTIVATE"
                      ? "bg-ink-800 hover:bg-ink-950"
                      : "bg-green-700 hover:bg-green-800"
              )}
            >
              {busy
                ? "Traitement…"
                : action === "SUSPEND"
                  ? "Suspendre"
                  : action === "BLOCK"
                    ? "Bloquer"
                    : action === "DEACTIVATE"
                      ? "Désactiver"
                      : "Réactiver"}
            </button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
