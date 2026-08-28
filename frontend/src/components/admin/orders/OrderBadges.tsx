"use client";

import { cn } from "@/lib/utils";
import type { AdminOrderStatus, AdminPriorityLevel } from "@/types/admin";

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold";

/**
 * Badge de statut de commande — aligné sur les enums backend (doc 07 §7/§19).
 * Couleurs cohérentes avec le reste de l'Admin Dashboard.
 */
export function OrderStatusBadge({ status }: { status: AdminOrderStatus }) {
  const config: Record<AdminOrderStatus, { label: string; className: string; dot: string }> = {
    PENDING: {
      label: "En attente",
      className: "bg-gold-wash text-gold-strong",
      dot: "bg-gold-strong",
    },
    PAID: {
      label: "Payée",
      className: "bg-blue-100 text-blue-700",
      dot: "bg-blue-600",
    },
    SHIPPING: {
      label: "En livraison",
      className: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
    },
    DELIVERED: {
      label: "Livrée",
      className: "bg-green-100 text-green-700",
      dot: "bg-green-600",
    },
    CANCELLED: {
      label: "Annulée",
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

/** Badge de niveau d'anomalie (doc 07 — §25) */
export function AnomalyLevelBadge({ level }: { level: AdminPriorityLevel }) {
  const config: Record<AdminPriorityLevel, { label: string; className: string }> = {
    critical: { label: "Critique", className: "bg-red-100 text-red-600" },
    high: { label: "Élevée", className: "bg-amber-100 text-amber-700" },
    medium: { label: "Moyenne", className: "bg-blue-100 text-blue-700" },
    info: { label: "Info", className: "bg-ink-100 text-ink-600" },
  };
  const c = config[level];
  return <span className={cn(badgeBase, c.className)}>{c.label}</span>;
}
