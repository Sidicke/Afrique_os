"use client";

import Link from "next/link";
import type { ApiBoutiqueCard } from "@/lib/api/types";
import { cn, initials } from "@/lib/utils";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { IconChevronRight, IconMapPin } from "./icons";

/**
 * Carte boutique de l'annuaire — nom, catégorie, description courte,
 * localisation, nombre de produits et CTA. Le clic ouvre la boutique.
 */
export default function ShopCard({ shop }: { shop: ApiBoutiqueCard }) {
  const cover = shop.coverImage;
  return (
    <Link
      href={`/boutique/${shop.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-midnight-950/8 bg-white shadow-sm shadow-midnight-950/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/50 hover:shadow-lg hover:shadow-midnight-950/10"
    >
      {/* Visuel */}
      <div className="relative h-36 overflow-hidden bg-midnight-950">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={`Boutique ${shop.name}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-midnight-900 via-midnight-950 to-midnight-950">
            <span className="font-display text-4xl font-bold text-gold-300/90">
              {initials(shop.name) || "B"}
            </span>
          </div>
        )}
        {shop.category && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-midnight-950 backdrop-blur-sm">
            {shop.category}
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-1.5 font-display text-lg font-bold leading-snug text-midnight-950">
            {shop.name}
            {/* Badge vérifié — logo ✓, la confiance en un coup d'œil */}
            {shop.verificationStatus === "VERIFIED" && (
              <VerifiedBadge className="mt-0.5" />
            )}
          </h3>
          <span
            className={cn(
              "mt-1 shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
              shop.productsCount > 0
                ? "bg-gold-400/15 text-gold-700"
                : "bg-midnight-950/5 text-midnight-950/40",
            )}
          >
            {shop.productsCount} produit{shop.productsCount > 1 ? "s" : ""}
          </span>
        </div>

        {shop.tagline && (
          <p className="text-[13px] font-semibold text-midnight-950/60">{shop.tagline}</p>
        )}

        {shop.description && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-midnight-950/65">
            {shop.description}
          </p>
        )}

        {(shop.city || shop.country) && (
          <p className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-midnight-950/65">
            <IconMapPin className="h-3.5 w-3.5 text-gold-600" />
            {[shop.city, shop.country].filter(Boolean).join(", ")}
          </p>
        )}

        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-700 transition-colors group-hover:text-gold-600">
          Découvrir la boutique
          <IconChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
