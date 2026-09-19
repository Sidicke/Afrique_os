"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ApiOrder } from "@/lib/api/types";
import { initials } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { StatusBadge, STATUS_LABELS } from "./StatusBadge";
import { StatusTimeline } from "./StatusTimeline";
import { IconChat, IconChevronRight } from "../icons";

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** Libellé du moyen de paiement (source unique côté client) */
export const PAYMENT_LABELS: Record<string, string> = {
  MOBILE_MONEY: "Mobile Money",
  CASH_ON_DELIVERY: "Paiement à la livraison",
  CARD: "Carte bancaire",
  WHATSAPP_DIRECT: "Directe",
};

/**
 * Carte commande — une commande = une histoire complète : boutique, statut,
 * timeline d'avancement, articles, livraison, total et lien vers la
 * discussion avec la boutique.
 */
export function OrderCard({
  order,
  footer,
  onToggle,
  expanded,
}: {
  order: ApiOrder;
  footer?: ReactNode;
  onToggle?: () => void;
  expanded?: boolean;
}) {
  const { formatPrice, t } = useTranslation();
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const paymentLabel = PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod;

  return (
    <article className="overflow-hidden rounded-2xl border border-midnight-950/8 bg-white shadow-sm shadow-midnight-950/[0.02]">
      {/* En-tête cliquable (si onToggle fourni) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-gray-50"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-midnight-950 font-display text-xs font-bold text-gold-300">
            {order.boutique ? initials(order.boutique.name) : "B"}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-gold-600">
                {order.orderNumber}
              </span>
              <StatusBadge status={order.status} label={statusLabel} />
            </span>
            <span className="mt-1 block truncate text-xs text-midnight-950/50">
              {order.boutique?.name ?? "Boutique"} ·{" "}
              {order.items.slice(0, 2).map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
              {order.items.length > 2 ? ` +${order.items.length - 2}` : ""}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-midnight-950/35">
              <span>{timeAgo(order.createdAt)}</span>
              <span>· {paymentLabel}</span>
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-bold text-gold-600">{formatPrice(order.totalPriceFcfa)}</span>
          {onToggle && (
            <IconChevronRight
              className={`h-4 w-4 text-midnight-950/30 transition-transform duration-300 ${expanded ? "rotate-90" : ""}`}
            />
          )}
        </span>
      </button>

      {/* Détail déplié : timeline + articles + livraison + total */}
      {expanded && (
        <div className="space-y-4 border-t border-midnight-950/8 p-4">
          <StatusTimeline status={order.status} />

          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-midnight-950/70">
                  {item.quantity}× {item.productName}
                  {item.variantLabel ? ` (${item.variantLabel})` : ""}
                </span>
                <span className="font-medium text-midnight-950">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-midnight-950/8 pt-2.5 text-sm">
              <span className="text-midnight-950/60">Livraison ({order.deliveryName || "À déterminer"})</span>
              <span className="font-medium text-midnight-950">
                {order.deliveryPrice === 0 ? "Gratuite" : formatPrice(order.deliveryPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-midnight-950">Total</span>
              <span className="font-display text-base font-semibold text-gold-600">
                {formatPrice(order.totalPriceFcfa)}
              </span>
            </div>
          </div>

          {order.status === "cancelled" && order.cancellationReason && (
            <div className="rounded-xl border border-red-100 bg-red-50/60 px-3.5 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-400">
                Motif d&rsquo;annulation
              </p>
              <p className="mt-1 text-sm text-red-700">{order.cancellationReason}</p>
            </div>
          )}

          {footer}
        </div>
      )}
    </article>
  );
}

/** Lien standard « Discuter de cette commande » — ouvre la discussion liée. */
export function DiscussOrderLink({
  order,
  onClick,
}: {
  order: ApiOrder;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-midnight-950/8 pt-3">
      <span className="text-xs text-midnight-950/45">Une question sur cette commande ?</span>
      <Link
        href={`/espace-client/discussions/nouvelle?boutique=${order.boutique?.id ?? ""}&orderId=${order.id}&orderReference=${encodeURIComponent(order.orderNumber)}`}
        onClick={onClick}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-700 transition-colors hover:text-gold-600"
      >
        <IconChat className="h-3.5 w-3.5" />
        Discuter de cette commande
      </Link>
    </div>
  );
}
