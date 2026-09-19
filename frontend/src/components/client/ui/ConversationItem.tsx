"use client";

import Link from "next/link";
import { initials } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { IconBag, IconPackage } from "../icons";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Contexte commercial d'une conversation (produit / commande) — filtre premium. */
export function ConversationContext({
  productName,
  productPrice,
  productImage,
  orderReference,
}: {
  productName?: string | null;
  productPrice?: string | null;
  productImage?: string | null;
  orderReference?: string | null;
}) {
  const { formatPrice } = useTranslation();

  if (orderReference) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/12 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-gold-700">
        <IconBag className="h-2.5 w-2.5" />
        {orderReference}
      </span>
    );
  }
  if (productName) {
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-midnight-950/5 px-2 py-0.5 font-mono text-[9px] font-semibold text-midnight-950/60">
        {productImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={productImage}
            alt=""
            className="h-4 w-4 shrink-0 rounded-full object-cover"
          />
        ) : (
          <IconPackage className="h-2.5 w-2.5 shrink-0 text-gold-600" />
        )}
        <span className="truncate">
          {productName}
          {productPrice ? ` · ${formatPrice(Number(productPrice))}` : ""}
        </span>
      </span>
    );
  }
  return null;
}

/**
 * Item de conversation — la liste « Mes discussions » : boutique, aperçu du
 * dernier message, heure, badge non-lus et contexte commercial.
 */
export function ConversationItem({
  id,
  shopName,
  shopLogo,
  lastMessage,
  lastMessageAt,
  unreadCount,
  productName,
  productPrice,
  productImage,
  orderReference,
  isMine,
}: {
  id: string;
  shopName: string;
  shopLogo?: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  productName?: string | null;
  productPrice?: string | null;
  productImage?: string | null;
  orderReference?: string | null;
  isMine?: boolean;
}) {
  const { formatPrice } = useTranslation();

  return (
    <Link
      href={`/espace-client/discussions/${id}`}
      className="group flex items-center gap-3 rounded-2xl border border-midnight-950/8 bg-white p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/50 hover:shadow-md"
    >
      <span className="relative shrink-0">
        <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-midnight-950 font-display text-sm font-bold text-gold-300">
          {shopLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shopLogo} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(shopName) || "B"
          )}
        </span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta px-1 font-mono text-[10px] font-bold text-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-display text-sm font-bold text-midnight-950">
            {shopName}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-midnight-950/40">
            {timeLabel(lastMessageAt)}
          </span>
        </span>

        {(productName || orderReference) && (
          <span className="mt-1 block">
            <ConversationContext
              productName={productName}
              productPrice={productPrice}
              productImage={productImage}
              orderReference={orderReference}
            />
          </span>
        )}

        <span
          className={`mt-0.5 block truncate text-xs ${
            unreadCount > 0 ? "font-semibold text-midnight-950" : "text-midnight-950/50"
          }`}
        >
          {lastMessage
            ? isMine
              ? `Vous : ${lastMessage}`
              : lastMessage
            : "Aucun message pour le moment"}
        </span>
      </span>
    </Link>
  );
}
