"use client";

import { cn } from "@/lib/utils";
import type {
  AdminIncidentStatus,
  AdminReportStatus,
  AdminReportType,
  AdminSeverity,
} from "@/types/admin";

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold";

/** Statut d'un signalement (doc 10 — §8) — texte + couleur, jamais couleur seule */
export function ReportStatusBadge({ status }: { status: AdminReportStatus }) {
  const config: Record<AdminReportStatus, { label: string; className: string; dot: string }> = {
    NEW: {
      label: "Nouveau",
      className: "bg-gold-wash text-gold-strong",
      dot: "bg-gold-strong",
    },
    IN_REVIEW: {
      label: "En examen",
      className: "bg-blue-100 text-blue-700",
      dot: "bg-blue-600",
    },
    PENDING_INFO: {
      label: "Infos requises",
      className: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
    },
    ACTION_REQUIRED: {
      label: "Action requise",
      className: "bg-red-100 text-red-600",
      dot: "bg-red-600",
    },
    RESOLVED: {
      label: "Résolu",
      className: "bg-green-100 text-green-700",
      dot: "bg-green-600",
    },
    REJECTED: {
      label: "Rejeté",
      className: "bg-ink-100 text-ink-600",
      dot: "bg-ink-400",
    },
    ARCHIVED: {
      label: "Archivé",
      className: "bg-ink-100/60 text-ink-400",
      dot: "bg-ink-300",
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

/** Gravité d'un problème (doc 10 — §5) */
export function SeverityBadge({ severity }: { severity: AdminSeverity }) {
  const config: Record<AdminSeverity, { label: string; className: string }> = {
    low: { label: "Faible", className: "bg-ink-100 text-ink-600" },
    medium: { label: "Moyenne", className: "bg-blue-100 text-blue-700" },
    high: { label: "Élevée", className: "bg-amber-100 text-amber-700" },
    critical: { label: "Critique", className: "bg-red-100 text-red-600" },
  };
  const c = config[severity];
  return <span className={cn(badgeBase, c.className)}>{c.label}</span>;
}

/** Type de signalement (doc 10 — §6) */
export function ReportTypeBadge({ type }: { type: AdminReportType }) {
  const config: Record<AdminReportType, { label: string; className: string }> = {
    store: { label: "Boutique", className: "bg-gold-wash text-gold-strong" },
    product: { label: "Produit", className: "bg-blue-100 text-blue-700" },
    seller: { label: "Vendeur", className: "bg-green-100 text-green-700" },
    customer: { label: "Client", className: "bg-ink-100 text-ink-600" },
    conversation: { label: "Conversation", className: "bg-indigo-100 text-indigo-700" },
    order: { label: "Commande", className: "bg-violet-100 text-violet-700" },
    behavior: { label: "Comportement", className: "bg-amber-100 text-amber-700" },
    content: { label: "Contenu", className: "bg-pink-100 text-pink-700" },
    suspicious: { label: "Suspect", className: "bg-red-100 text-red-600" },
  };
  const c = config[type];
  return <span className={cn(badgeBase, c.className)}>{c.label}</span>;
}

/** Cycle de vie d'un incident (doc 10 — §18) */
export function IncidentStatusBadge({ status }: { status: AdminIncidentStatus }) {
  const config: Record<AdminIncidentStatus, { label: string; className: string; dot: string }> = {
    OPEN: { label: "Ouvert", className: "bg-red-100 text-red-600", dot: "bg-red-600" },
    ANALYSIS: { label: "Analyse", className: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    INTERVENTION: { label: "Intervention", className: "bg-red-100 text-red-600", dot: "bg-red-600" },
    MONITORING: { label: "Surveillance", className: "bg-blue-100 text-blue-700", dot: "bg-blue-600" },
    RESOLVED: { label: "Résolu", className: "bg-green-100 text-green-700", dot: "bg-green-600" },
    ARCHIVED: { label: "Archivé", className: "bg-ink-100/60 text-ink-400", dot: "bg-ink-300" },
  };
  const c = config[status];
  return (
    <span className={cn(badgeBase, c.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}
