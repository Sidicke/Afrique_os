"use client";

import { cn } from "@/lib/utils";
import type {
  AdminVerificationPriority,
  AdminVerificationStatus,
} from "@/types/admin";

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold";

/** Badge de statut d'un dossier (doc 04 — §39) — texte + couleur, jamais couleur seule */
export function VerificationStatusBadge({ status }: { status: AdminVerificationStatus }) {
  const config: Record<AdminVerificationStatus, { label: string; className: string; dot: string }> = {
    PENDING: {
      label: "En attente",
      className: "bg-gold-wash text-gold-strong",
      dot: "bg-gold-strong",
    },
    IN_REVIEW: {
      label: "En examen",
      className: "bg-blue-100 text-blue-700",
      dot: "bg-blue-600",
    },
    APPROVED: {
      label: "Approuvé",
      className: "bg-green-100 text-green-700",
      dot: "bg-green-600",
    },
    CHANGES_REQUIRED: {
      label: "Corrections requises",
      className: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
    },
    REJECTED: {
      label: "Rejeté",
      className: "bg-red-100 text-red-600",
      dot: "bg-red-600",
    },
  };
  const c = config[status];
  return (
    <span className={cn(badgeBase, c.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

/** Badge de priorité de traitement (doc 04 — §8) */
export function VerificationPriorityBadge({ priority }: { priority: AdminVerificationPriority }) {
  const config: Record<AdminVerificationPriority, { label: string; className: string }> = {
    critical: { label: "Critique", className: "bg-red-100 text-red-600" },
    high: { label: "Élevée", className: "bg-amber-100 text-amber-700" },
    medium: { label: "Moyenne", className: "bg-blue-100 text-blue-700" },
    low: { label: "Faible", className: "bg-ink-100 text-ink-600" },
  };
  const c = config[priority];
  return <span className={cn(badgeBase, c.className)}>{c.label}</span>;
}

/** État d'un document fourni (doc 04 — §17) */
export function DocumentStateBadge({ state }: { state: string }) {
  const config: Record<string, { label: string; className: string }> = {
    present: { label: "Présent", className: "bg-ink-100 text-ink-600" },
    missing: { label: "Manquant", className: "bg-red-100 text-red-600" },
    expired: { label: "Expiré", className: "bg-amber-100 text-amber-700" },
    invalid: { label: "Invalide", className: "bg-red-100 text-red-600" },
    verified: { label: "Vérifié", className: "bg-green-100 text-green-700" },
  };
  const c = config[state] ?? { label: state, className: "bg-ink-100 text-ink-600" };
  return <span className={cn(badgeBase, c.className)}>{c.label}</span>;
}
