"use client";

import { cn } from "@/lib/utils";
import type { AdminUserRole, AdminUserStatus } from "@/types/admin";

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold";

/** Badge de rôle (doc 06 — §7) — distinguer clairement clients, vendeurs, admins */
export function UserRoleBadge({ role }: { role: AdminUserRole }) {
  const config: Record<AdminUserRole, { label: string; className: string }> = {
    CLIENT: { label: "Client", className: "bg-blue-100 text-blue-700" },
    VENDEUR: { label: "Vendeur", className: "bg-gold-wash text-gold-strong" },
    ADMIN: { label: "Admin", className: "bg-ink-950 text-white" },
  };
  const c = config[role];
  return <span className={cn(badgeBase, c.className)}>{c.label}</span>;
}

/** Badge de statut de compte (doc 06 — §6.2) — texte + couleur, jamais couleur seule */
export function UserStatusBadge({ status }: { status: AdminUserStatus }) {
  const config: Record<AdminUserStatus, { label: string; className: string; dot: string }> = {
    ACTIVE: {
      label: "Actif",
      className: "bg-green-100 text-green-700",
      dot: "bg-green-600",
    },
    PENDING: {
      label: "En attente",
      className: "bg-gold-wash text-gold-strong",
      dot: "bg-gold-strong",
    },
    SUSPENDED: {
      label: "Suspendu",
      className: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
    },
    BLOCKED: {
      label: "Bloqué",
      className: "bg-red-100 text-red-600",
      dot: "bg-red-600",
    },
    DEACTIVATED: {
      label: "Désactivé",
      className: "bg-ink-100 text-ink-600",
      dot: "bg-ink-400",
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
