"use client";

import { cn } from "@/lib/utils";
import type { AdminBillingCycle, AdminSubscriptionTransaction } from "@/types/admin";

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold";

/** Badge de cycle de facturation (doc 08 — §11) */
export function BillingCycleBadge({ cycle }: { cycle: AdminBillingCycle }) {
  return (
    <span
      className={cn(
        badgeBase,
        cycle === "yearly" ? "bg-gold-wash text-gold-strong" : "bg-ink-100 text-ink-600"
      )}
    >
      {cycle === "yearly" ? "Annuel" : "Mensuel"}
    </span>
  );
}

/** Badge de type de transaction (doc 08 — §13) */
export function TransactionTypeBadge({ type }: { type: AdminSubscriptionTransaction["type"] }) {
  const config: Record<AdminSubscriptionTransaction["type"], { label: string; className: string }> = {
    charge: { label: "Prélèvement", className: "bg-blue-100 text-blue-700" },
    renewal: { label: "Renouvellement", className: "bg-green-100 text-green-700" },
    refund: { label: "Remboursement", className: "bg-amber-100 text-amber-700" },
    downgrade_credit: { label: "Avoir downgrade", className: "bg-ink-100 text-ink-600" },
  };
  const c = config[type];
  return <span className={cn(badgeBase, c.className)}>{c.label}</span>;
}
