"use client";

import { cn } from "@/lib/utils";

/** Couleurs sémantiques par statut (mêmes statuts réels que le backend) */
const TONES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  shipping: "bg-violet-100 text-violet-800",
  delivered: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-700",
};

/** Libellés français — source unique, alignés sur les mappers */
export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente de paiement",
  paid: "Payée",
  shipping: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

/** Badge de statut de commande — partagé entre toutes les vues client. */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider",
        TONES[status] ?? "bg-midnight-950/5 text-midnight-950/50",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}
