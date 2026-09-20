"use client";

import { cn } from "@/lib/utils";
import { OrderStatus, PaymentMethod, Customer } from "@/types/dashboard";
import { ProductItem } from "@/types/dashboard";

const base =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold";

/** Badge d'état de commande — couleurs sémantiques sur fond clair */
export function StatusBadge({ status }: { status: OrderStatus | string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "En attente", className: "bg-gold-wash text-gold-strong" },
    paid: { label: "Payée", className: "bg-green-100 text-green-700" },
    shipping: { label: "En livraison", className: "bg-ink-100 text-ink-700" },
    delivered: { label: "Livrée", className: "bg-blue-100 text-blue-700" },
    cancelled: { label: "Annulée", className: "bg-red-100 text-red-600" },
  };
  const badge = config[status] || { label: status || "Inconnu", className: "bg-gray-100 text-gray-700" };
  return (
    <span className={cn(base, badge.className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {badge.label}
    </span>
  );
}

/** Badge de moyen de paiement */
export function PaymentBadge({ method }: { method: PaymentMethod | string }) {
  const config: Record<string, { label: string; className: string }> = {
    MOBILE_MONEY: { label: "Mobile Money", className: "bg-green-100 text-green-700" },
    CASH_ON_DELIVERY: { label: "À la livraison", className: "bg-gold-wash text-gold-strong" },
    CARD: { label: "Carte", className: "bg-ink-100 text-ink-700" },
    WHATSAPP_DIRECT: { label: "Directe", className: "bg-blue-100 text-blue-700" },
    FEDAPAY: { label: "FedaPay", className: "bg-purple-100 text-purple-700" },
  };
  const badge = config[method] || { label: method || "Inconnu", className: "bg-gray-100 text-gray-700" };
  return <span className={cn(base, badge.className)}>{badge.label}</span>;
}

/** Badge de segment client */
export function SegmentBadge({ segment }: { segment: Customer["segment"] }) {
  const config: Record<Customer["segment"], string> = {
    VIP: "bg-gold-wash text-gold-strong",
    Fidèle: "bg-green-100 text-green-700",
    Régulier: "bg-ink-100 text-ink-700",
    Nouveau: "bg-blue-100 text-blue-700",
  };
  return <span className={cn(base, config[segment])}>{segment}</span>;
}

/** Badge d'état de stock produit */
export function StockBadge({ product }: { product: ProductItem }) {
  const { status, stock } = product;
  const className =
    status === "in_stock"
      ? "bg-green-100 text-green-700"
      : status === "low_stock"
        ? "bg-gold-wash text-gold-strong"
        : "bg-red-100 text-red-600";
  const label =
    status === "in_stock" ? `En stock (${stock})` : status === "low_stock" ? `Stock bas (${stock})` : "Rupture";
  return <span className={cn(base, className)}>{label}</span>;
}
