"use client";

import { cn } from "@/lib/utils";
import type {
  AdminStoreStatus,
  AdminSubscriptionStatus,
} from "@/types/admin";

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold";

/** Badge de statut d'une boutique (doc 05 — §9) — texte + couleur, jamais couleur seule */
export function StoreStatusBadge({ status }: { status: AdminStoreStatus }) {
  const config: Record<AdminStoreStatus, { label: string; className: string; dot: string }> = {
    ACTIVE: {
      label: "Active",
      className: "bg-green-100 text-green-700",
      dot: "bg-green-600",
    },
    PENDING: {
      label: "En attente",
      className: "bg-gold-wash text-gold-strong",
      dot: "bg-gold-strong",
    },
    SUSPENDED: {
      label: "Suspendue",
      className: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
    },
    BLOCKED: {
      label: "Bloquée",
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

/** Badge de statut d'abonnement (doc 05 — §22) */
export function SubscriptionStatusBadge({ status }: { status: AdminSubscriptionStatus }) {
  const config: Record<AdminSubscriptionStatus, { label: string; className: string }> = {
    TRIAL: { label: "Essai", className: "bg-blue-100 text-blue-700" },
    ACTIVE: { label: "Actif", className: "bg-green-100 text-green-700" },
    PAST_DUE: { label: "En retard", className: "bg-amber-100 text-amber-700" },
    CANCELLED: { label: "Annulé", className: "bg-ink-100 text-ink-600" },
    EXPIRED: { label: "Expiré", className: "bg-ink-100 text-ink-600" },
    SUSPENDED: { label: "Suspendu", className: "bg-red-100 text-red-600" },
  };
  const c = config[status];
  return <span className={cn(badgeBase, c.className)}>{c.label}</span>;
}

/** Badge de formule d'abonnement (Starter / Growth / Pro / Business) */
export function PlanBadge({ plan }: { plan: string }) {
  const planClass = (p: string) => {
    if (p === "Business") return "bg-ink-950 text-white";
    if (p === "Pro") return "bg-gold-strong text-white";
    if (p === "Growth") return "bg-blue-700 text-white";
    return "bg-ink-100 text-ink-700";
  };
  return (
    <span className={cn(badgeBase, planClass(plan))}>{plan}</span>
  );
}
