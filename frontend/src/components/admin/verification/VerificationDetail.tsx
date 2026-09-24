"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Modal } from "@/components/dashboard/ui/Modal";
import { Toast } from "@/components/dashboard/ui/Toast";
import { Field, TextArea, SelectInput } from "@/components/dashboard/ui/Field";
import { Icon } from "@/components/dashboard/icons";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import type {
  AdminChecklistItem,
  AdminVerificationCase,
} from "@/types/admin";
import { adminService } from "@/services/adminService";
import {
  DocumentStateBadge,
  VerificationStatusBadge,
  VerificationPriorityBadge,
} from "./VerificationBadges";
import { InfoRow } from "@/components/admin/ui/AdminBits";

/** Motifs prédéfinis pour « demander des corrections » (doc 04 — §24) */
const CHANGE_REASONS = [
  "Document manquant",
  "Informations invalides",
  "Document illisible",
  "Informations supplémentaires requises",
  "Autre",
];

const GROUP_LABELS: Record<AdminChecklistItem["group"], string> = {
  identity: "Identity",
  business: "Business",
  store: "Store",
};

interface VerificationDetailProps {
  caseData: AdminVerificationCase;
  /** Nom de l'administrateur connecté (pour les décisions + notes) */
  adminName: string;
  onUpdated: (updated: AdminVerificationCase) => void;
}

/**
 * Dossier de vérification complet (doc 04 — §13 à §27) : identité du vendeur,
 * boutique, documents, checklist, notes internes, historique et le panneau de
 * décision — approuver / demander des corrections / rejeter (motif obligatoire).
 */
export function VerificationDetail({ caseData, adminName, onUpdated }: VerificationDetailProps) {
  const [decisionModal, setDecisionModal] = useState<"APPROVE" | "CHANGES" | "REJECT" | null>(null);
  const [reason, setReason] = useState(CHANGE_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ label: string; url?: string } | null>(null);

  const c = caseData;
  const decisionLocked = c.status === "APPROVED" || c.status === "REJECTED";

  const handleDecide = async () => {
    if (!decisionModal) return;
    // Motif selon l'action : select pour CHANGES (sauf « Autre »), TextArea
    // pour REJECT — toujours obligatoire (doc 04 §24/§25).
    const finalReason =
      decisionModal === "APPROVE"
        ? undefined
        : decisionModal === "CHANGES" && reason !== "Autre"
          ? reason
          : customReason.trim();
    if (decisionModal !== "APPROVE" && !finalReason) {
      setToast("Un motif est obligatoire pour cette action.");
      return;
    }
    setBusy(true);
    const updated = await adminService.decideVerification(c.id, {
      action: decisionModal,
      reason: finalReason,
      by: adminName,
    });
    setBusy(false);
    if (updated) {
      onUpdated(updated);
      setDecisionModal(null);
      setCustomReason("");
      setToast(
        decisionModal === "APPROVE"
          ? "Vendeur approuvé avec succès."
          : decisionModal === "CHANGES"
            ? "Corrections demandées avec succès."
            : "Dossier rejeté."
      );
    }
  };

  const handleAddNote = async () => {
    const content = noteDraft.trim();
    if (!content || noteBusy) return;
    setNoteBusy(true);
    const updated = await adminService.addInternalNote(c.id, content, adminName);
    setNoteBusy(false);
    if (updated) {
      onUpdated(updated);
      setNoteDraft("");
      setToast("Note interne ajoutée.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête du dossier */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/verification"
            className="mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-ink-500 transition-colors hover:text-gold-strong"
          >
            <Icon name="chevronLeft" size={12} /> Verification Center
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-950">
              {c.merchant.name}
            </h1>
            <VerificationStatusBadge status={c.status} />
            <VerificationPriorityBadge priority={c.priority} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Boutique {c.store.name} · soumis {timeAgo(c.submittedAt)}
            {c.assignedTo ? ` · en examen par ${c.assignedTo}` : ""}
          </p>
        </div>

        {c.status === "IN_REVIEW" && (
          <span className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-700">
            <Icon name="clock" size={14} />
            {c.assignedTo ?? "Un administrateur"} est en train de l&apos;examiner
          </span>
        )}
      </div>

      {/* Grille : identité + boutique */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Merchant identity (doc 04 §14) */}
        <DashboardCard className="p-6">
          <CardHeader
            title="Merchant identity"
            action={
              <Link
                href={`/admin/users/${c.merchant.id}`}
                className="font-mono text-[10px] font-semibold text-blue-700 hover:text-blue-600"
              >
                View merchant →
              </Link>
            }
          />
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={c.merchant.name} size="lg" />
            <div>
              <p className="font-display text-base font-semibold text-ink-950">{c.merchant.name}</p>
              <p className="text-xs text-ink-500">{c.merchant.email}</p>
              <p className="text-xs text-ink-500">{c.merchant.phone}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <InfoRow label="Merchant ID" value={c.merchant.id} mono />
            <InfoRow label="Inscrit le" value={new Date(c.merchant.joinedAt).toLocaleDateString("fr-FR")} />
            <InfoRow label="Compte" value={c.merchant.accountStatus} />
          </dl>
        </DashboardCard>

        {/* Store information (doc 04 §15) */}
        <DashboardCard className="p-6">
          <CardHeader
            title="Store information"
            action={
              <Link
                href={`/admin/stores/${c.store.id}`}
                className="font-mono text-[10px] font-semibold text-blue-700 hover:text-blue-600"
              >
                View store →
              </Link>
            }
          />
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-semibold text-ink-950">{c.store.name}</p>
              <span className="font-mono text-[10px] text-ink-400">/{c.store.slug}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <InfoRow label="Catégorie" value={c.store.category ?? "-"} />
              <InfoRow label="Localisation" value={c.store.location ?? "-"} />
              <InfoRow label="Produits" value={String(c.store.productsCount)} />
              <InfoRow label="Créée le" value={new Date(c.store.createdAt).toLocaleDateString("fr-FR")} />
            </dl>
          </div>
        </DashboardCard>
      </div>

      {/* Documents (doc 04 §17) */}
      <DashboardCard className="p-6">
        <CardHeader title="Documents" subtitle="Pièces fournies pour la vérification" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {c.documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-line bg-ink-50/40 p-3.5 transition-colors hover:border-gold-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-500">
                  <Icon name="package" size={16} />
                </span>
                <DocumentStateBadge state={doc.state} />
              </div>
              <p className="mt-2.5 text-xs font-semibold text-ink-950">{doc.label}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-mono text-[10px] text-ink-400">
                  {doc.uploadedAt ? timeAgo(doc.uploadedAt) : doc.hasPreview ? "À vérifier" : "-"}
                </span>
                {doc.hasPreview && (
                  <button
                    onClick={() => setPreviewDoc({ label: doc.label, url: doc.url })}
                    className="cursor-pointer rounded-lg border border-line bg-surface px-2 py-1 font-mono text-[10px] font-semibold text-ink-600 transition-colors hover:border-blue-600 hover:text-blue-700"
                  >
                    Aperçu
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Checklist de vérification (doc 04 §19) */}
      <DashboardCard className="p-6">
        <CardHeader title="Verification checklist" subtitle="Critères à valider avant décision" />
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {(["identity", "business", "store"] as const).map((group) => {
            const items = c.checklist.filter((i) => i.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-strong">
                  {GROUP_LABELS[group]}
                </p>
                <ul className="mt-2.5 space-y-2">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full",
                          item.done ? "bg-green-100 text-green-700" : "border border-line text-ink-300"
                        )}
                      >
                        {item.done && <Icon name="check" size={10} strokeWidth={3} />}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          item.done ? "text-ink-800" : "text-ink-400"
                        )}
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </DashboardCard>

      {/* Notes internes (doc 04 §20) + Historique (doc 04 §21) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard className="p-6">
          <CardHeader
            title="Internal notes"
            subtitle="Réservé à l'équipe, invisible pour le vendeur"
          />
          <div className="mt-4 space-y-3">
            {c.notes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
                No internal notes yet.
              </p>
            ) : (
              c.notes.map((note) => (
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

        <DashboardCard className="p-6">
          <CardHeader title="History" subtitle="Traçabilité complète du dossier" />
          <ol className="mt-4 space-y-0">
            {[...c.history].reverse().map((ev, idx) => (
              <li key={ev.id} className="relative flex gap-3 pb-5 last:pb-0">
                {idx < c.history.length - 1 && (
                  <span className="absolute left-[7px] top-4 h-full w-px bg-line" />
                )}
                <span className="relative mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-gold-mid bg-surface">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-strong" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink-950">{ev.action}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-400">
                    {timeAgo(ev.at)}
                    {ev.by ? ` · ${ev.by}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </DashboardCard>
      </div>

      {/* Panneau de décision (doc 04 §22) */}
      <DashboardCard className="border-gold-soft/60 p-6">
        <CardHeader
          title="Decision"
          subtitle={
            decisionLocked
              ? "Ce dossier est clos : aucune nouvelle décision possible."
              : "Validez le dossier, demandez des corrections ou rejetez la demande."
          }
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => setDecisionModal("APPROVE")}
            disabled={decisionLocked}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-green-700/20 transition-all hover:bg-green-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="check" size={16} strokeWidth={2.2} /> Approuver
          </button>
          <button
            onClick={() => setDecisionModal("CHANGES")}
            disabled={decisionLocked}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gold-mid bg-gold-wash px-4 py-3 text-sm font-semibold text-gold-strong transition-all hover:bg-gold-soft/60 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="edit" size={16} /> Demander des corrections
          </button>
          <button
            onClick={() => setDecisionModal("REJECT")}
            disabled={decisionLocked}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="x" size={16} strokeWidth={2.2} /> Rejeter
          </button>
        </div>
      </DashboardCard>

      {/* Modal de décision */}
      <Modal
        open={decisionModal !== null}
        onClose={() => setDecisionModal(null)}
        title={
          decisionModal === "APPROVE"
            ? "Approuver ce vendeur ?"
            : decisionModal === "CHANGES"
              ? "Demander des corrections"
              : "Rejeter cette demande ?"
        }
        subtitle={
          decisionModal === "APPROVE"
            ? "Une fois approuvé, le vendeur pourra opérer selon les règles de la plateforme."
            : decisionModal === "REJECT"
              ? "Cette action est définitive et sera transmise au vendeur."
              : "Le motif sera transmis au vendeur pour qu'il puisse corriger son dossier."
        }
      >
        <div className="flex flex-col gap-4">
          {(decisionModal === "CHANGES" || decisionModal === "REJECT") && (
            <Field label="Motif (obligatoire)">
              {decisionModal === "CHANGES" ? (
                <>
                  <SelectInput value={reason} onChange={(e) => setReason(e.target.value)}>
                    {CHANGE_REASONS.map((r) => (
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
                        placeholder="Précisez les corrections à apporter…"
                      />
                    </div>
                  )}
                </>
              ) : (
                <TextArea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Pourquoi cette demande est-elle rejetée ?"
                  required
                />
              )}
            </Field>
          )}

          {decisionModal === "APPROVE" && (
            <p className="rounded-xl border border-green-200 bg-green-100/60 px-4 py-3 text-xs leading-relaxed text-green-700">
              La boutique {c.store.name} deviendra active et le vendeur obtiendra les
              fonctionnalités correspondant à son niveau d&apos;autorisation.
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2.5">
            <button
              onClick={() => setDecisionModal(null)}
              className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-950"
            >
              Annuler
            </button>
            <button
              onClick={handleDecide}
              disabled={busy}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50",
                decisionModal === "APPROVE"
                  ? "bg-green-700 hover:bg-green-800"
                  : decisionModal === "REJECT"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-ink-950 hover:bg-blue-700"
              )}
            >
              {busy ? "Traitement…" : decisionModal === "APPROVE" ? "Approuver" : "Confirmer"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Aperçu document (doc 04 §17) */}
      <Modal
        open={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.label ?? "Document"}
        subtitle="Document fourni par le vendeur"
        size="lg"
      >
        <div className="flex flex-col items-center gap-3 py-6">
          {previewDoc?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewDoc.url}
              alt={previewDoc.label}
              className="max-h-[420px] w-auto rounded-xl border border-line object-contain"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-gold-soft bg-gold-wash/60 text-gold-mid">
              <Icon name="package" size={32} strokeWidth={1.5} />
            </span>
          )}
          <p className="text-sm font-medium text-ink-700">{previewDoc?.label}</p>
          {!previewDoc?.url && (
            <p className="max-w-sm text-center text-xs leading-relaxed text-ink-400">
              Le fichier original n&apos;est pas hébergé : seul le statut du document
              est suivi par la plateforme.
            </p>
          )}
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
