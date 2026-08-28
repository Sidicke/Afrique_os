"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import { cn, timeAgo } from "@/lib/utils";
import { adminService } from "@/services/adminService";
import { InfoRow } from "@/components/admin/ui/AdminBits";
import {
  ReportStatusBadge,
  ReportTypeBadge,
  SeverityBadge,
} from "@/components/admin/moderation/ModerationBadges";
import type {
  AdminModerationCase,
  AdminReportStatus,
} from "@/types/admin";

type DecisionIntent = AdminReportStatus;

type DecisionTone = "green" | "red" | "amber" | "blue";

const DECISIONS: Array<{
  value: DecisionIntent;
  label: string;
  tone: DecisionTone;
  requiresReason: boolean;
  description: string;
}> = [
  {
    value: "IN_REVIEW",
    label: "Prendre en examen",
    tone: "blue",
    requiresReason: false,
    description: "Vous vous attribuez ce dossier pour analyse.",
  },
  {
    value: "PENDING_INFO",
    label: "Demander des infos",
    tone: "amber",
    requiresReason: true,
    description: "Des informations complémentaires sont nécessaires : le motif sera transmis au demandeur.",
  },
  {
    value: "RESOLVED",
    label: "Résoudre",
    tone: "green",
    requiresReason: false,
    description: "Le problème a été traité. Le dossier sera clos.",
  },
  {
    value: "REJECTED",
    label: "Rejeter",
    tone: "red",
    requiresReason: true,
    description: "Le signalement n'est pas suffisamment fondé. Un motif est obligatoire.",
  },
];

/** Styles par ton — actif (plein) et repos (fantôme) */
const TONE_STYLES: Record<DecisionTone, { active: string; idle: string; confirm: string }> = {
  green: {
    active: "border-green-600 bg-green-600 text-white shadow-md shadow-green-600/20",
    idle: "border-green-200 bg-green-100/60 text-green-700 hover:border-green-300 hover:bg-green-100",
    confirm: "bg-green-600 hover:bg-green-700",
  },
  red: {
    active: "border-red-600 bg-red-600 text-white shadow-md shadow-red-600/20",
    idle: "border-red-200 bg-red-100/60 text-red-700 hover:border-red-300 hover:bg-red-100",
    confirm: "bg-red-600 hover:bg-red-700",
  },
  amber: {
    active: "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20",
    idle: "border-amber-200 bg-amber-100/70 text-amber-700 hover:border-amber-300 hover:bg-amber-100",
    confirm: "bg-amber-500 hover:bg-amber-600",
  },
  blue: {
    active: "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20",
    idle: "border-blue-200 bg-blue-100/70 text-blue-700 hover:border-blue-300 hover:bg-blue-100",
    confirm: "bg-blue-600 hover:bg-blue-700",
  },
};

const NEXT_STEPS: Partial<Record<AdminReportStatus, DecisionIntent[]>> = {
  NEW: ["IN_REVIEW", "PENDING_INFO", "RESOLVED", "REJECTED"],
  IN_REVIEW: ["PENDING_INFO", "RESOLVED", "REJECTED"],
  PENDING_INFO: ["IN_REVIEW", "RESOLVED", "REJECTED"],
  ACTION_REQUIRED: ["IN_REVIEW", "PENDING_INFO", "RESOLVED", "REJECTED"],
  RESOLVED: ["IN_REVIEW"],
  REJECTED: ["IN_REVIEW"],
  ARCHIVED: ["IN_REVIEW"],
};

/**
 * Détail d'un signalement (doc 10 — §9/§10) : contexte complet, notes
 * internes, historique et panneau de décision. Chaque action est confirmée
 * (motif obligatoire pour le rejet) et journalisée dans l'historique.
 */
export function ModerationDetail({
  caseData,
  adminName,
  onUpdated,
}: {
  caseData: AdminModerationCase;
  adminName: string;
  onUpdated: (updated: AdminModerationCase) => void;
}) {
  const [intent, setIntent] = useState<DecisionIntent | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const allowed = NEXT_STEPS[caseData.status] ?? [];

  const confirmDecision = async () => {
    if (!intent) return;
    const decision = DECISIONS.find((d) => d.value === intent)!;
    if (decision.requiresReason && !reason.trim()) {
      setActionError("Un motif est obligatoire pour cette action.");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const updated = await adminService.updateModerationStatus(caseData.id, {
        status: intent,
        reason: reason.trim() || undefined,
        by: adminName,
      });
      if (updated) onUpdated(updated);
      setIntent(null);
      setReason("");
    } catch {
      setActionError("Impossible d'enregistrer cette action. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setNoteSaving(true);
    try {
      const updated = await adminService.addModerationNote(caseData.id, {
        author: adminName,
        content: note.trim(),
      });
      if (updated) onUpdated(updated);
      setNote("");
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête du dossier */}
      <DashboardCard className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={caseData.target.label} size="lg" />
            <div>
              <p className="font-mono text-[10px] text-ink-400">{caseData.id}</p>
              <h2 className="font-display text-xl font-semibold text-ink-950">
                {caseData.target.label}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ReportTypeBadge type={caseData.type} />
                <SeverityBadge severity={caseData.severity} />
                <ReportStatusBadge status={caseData.status} />
                {caseData.relatedCount > 1 && (
                  <span className="rounded-full bg-ink-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-ink-600">
                    {caseData.relatedCount} signalements liés
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="font-mono text-[10px] text-ink-400">
            Mis à jour {timeAgo(caseData.updatedAt)}
          </p>
        </div>
      </DashboardCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cible + contexte */}
        <DashboardCard className="p-6">
          <CardHeader title="Élément concerné" subtitle="Contexte du signalement (doc 10 §3)" />
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoRow label="Type" value={caseData.target.kind} />
            <InfoRow label="Statut" value={caseData.status} mono />
            <div className="sm:col-span-2">
              <dt className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
                Cible
              </dt>
              <dd className="mt-0.5">
                <Link
                  href={caseData.target.href}
                  className="text-xs font-semibold text-blue-700 transition-colors hover:text-blue-900 hover:underline"
                >
                  {caseData.target.label} ↗
                </Link>
              </dd>
            </div>
            {caseData.context.map((c) => (
              <InfoRow key={c.label} label={c.label} value={c.value} />
            ))}
          </dl>
        </DashboardCard>

        {/* Auteur + description */}
        <DashboardCard className="p-6">
          <CardHeader title="Auteur du signalement" />
          <div className="mt-4 flex items-center gap-3">
            <Avatar name={caseData.reporter.name} />
            <div>
              <p className="text-xs font-semibold text-ink-950">{caseData.reporter.name}</p>
              <p className="font-mono text-[10px] text-ink-400">{caseData.reporter.detail}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-line bg-ink-50/40 p-4">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              Description
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-700">{caseData.description}</p>
          </div>
        </DashboardCard>
      </div>

      {/* Panneau de décision (doc 10 §10) */}
      <DashboardCard className="border-gold-soft p-6">
        <CardHeader
          title="Décision"
          subtitle="Toute action est confirmée et enregistrée dans l'historique administratif."
        />
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {allowed.map((value) => {
            const d = DECISIONS.find((x) => x.value === value);
            if (!d) return null;
            const style = TONE_STYLES[d.tone];
            return (
              <button
                key={value}
                onClick={() => {
                  setIntent(value);
                  setActionError(null);
                  setReason("");
                }}
                className={cn(
                  "cursor-pointer rounded-xl border px-4 py-2 font-mono text-xs font-semibold transition-all active:scale-95",
                  intent === value ? style.active : style.idle
                )}
                aria-pressed={intent === value}
              >
                {d.label}
              </button>
            );
          })}
        </div>

        {intent && (
          <div className="mt-4 rounded-xl border border-line bg-ink-50/50 p-4">
            <p className="text-xs leading-relaxed text-ink-700">
              {DECISIONS.find((d) => d.value === intent)?.description}
            </p>
            {DECISIONS.find((d) => d.value === intent)?.requiresReason && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motif obligatoire (transmis au journal et à l'utilisateur concerné)…"
                rows={3}
                className="mt-3 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
              />
            )}
            {actionError && <p className="mt-2 text-xs font-medium text-red-600">{actionError}</p>}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => void confirmDecision()}
                disabled={saving}
                className={cn(
                  "cursor-pointer rounded-xl px-4 py-2 font-mono text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50",
                  TONE_STYLES[DECISIONS.find((d) => d.value === intent)?.tone ?? "green"].confirm
                )}
              >
                {saving ? "Enregistrement…" : "Confirmer"}
              </button>
              <button
                onClick={() => {
                  setIntent(null);
                  setReason("");
                  setActionError(null);
                }}
                className="cursor-pointer rounded-xl border border-line bg-surface px-4 py-2 font-mono text-xs font-semibold text-ink-600 transition-colors hover:text-ink-950"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </DashboardCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notes internes (doc 10 §10) */}
        <DashboardCard className="p-6">
          <CardHeader
            title="Notes internes"
            subtitle="Jamais visibles par l'utilisateur concerné"
          />
          <div className="mt-4 space-y-2.5">
            {caseData.notes.length === 0 && (
              <p className="rounded-xl border border-dashed border-line bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-400">
                Aucune note pour l&apos;instant.
              </p>
            )}
            {caseData.notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-line bg-ink-50/40 px-4 py-3">
                <p className="text-xs leading-relaxed text-ink-700">{n.content}</p>
                <p className="mt-1.5 font-mono text-[9px] text-ink-400">
                  {n.author} · {timeAgo(n.at)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-end gap-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajouter une note interne…"
              rows={2}
              className="flex-1 rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
            <button
              onClick={() => void addNote()}
              disabled={!note.trim() || noteSaving}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-800 active:scale-95 disabled:opacity-40"
            >
              <Icon name="plus" size={14} strokeWidth={2.2} />
              {noteSaving ? "…" : "Ajouter"}
            </button>
          </div>
        </DashboardCard>

        {/* Historique (doc 10 §13) */}
        <DashboardCard className="p-6">
          <CardHeader title="Historique" subtitle="Traçabilité complète du dossier" />
          <ol className="mt-4 space-y-0">
            {caseData.history.map((h, i) => (
              <li key={h.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i < caseData.history.length - 1 && (
                  <span className="absolute left-[5px] top-4 h-full w-px bg-line" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    "mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2",
                    i === caseData.history.length - 1
                      ? "border-gold-strong bg-gold-wash"
                      : "border-ink-300 bg-surface"
                  )}
                />
                <div>
                  <p className="text-xs font-medium text-ink-800">{h.action}</p>
                  <p className="font-mono text-[9px] text-ink-400">
                    {timeAgo(h.at)}
                    {h.by ? ` · ${h.by}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </DashboardCard>
      </div>
    </div>
  );
}
