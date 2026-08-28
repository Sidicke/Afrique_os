"use client";

import Link from "next/link";
import { productChatHref } from "@/lib/chat";
import { formatFcfa } from "@/lib/utils";
import { publicProductImage } from "@/lib/api/mappers";
import type { ApiPublicProduct } from "@/lib/api/types";
import { IconChat, IconStar, IconStore } from "./icons";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";

/** Note moyenne du produit (0 si absente) */
function productRating(product: ApiPublicProduct): number {
  const rating = product.rating;
  if (typeof rating === "number" && rating > 0) return Math.min(5, rating);
  const reviews = product.reviews ?? [];
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + (r.rating ?? 0), 0);
  return sum / reviews.length;
}

/** Petite rangée d'étoiles (comme la carte de la boutique) */
function MiniStars({ rating }: { rating: number }) {
  if (rating <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <IconStar
          key={star}
          className={`h-3 w-3 ${
            star <= Math.round(rating) ? "text-amber-400" : "text-gray-300"
          }`}
        />
      ))}
    </span>
  );
}

/**
 * Carte produit du catalogue GLOBAL (multi-boutiques) — marketplace.
 * La MÊME carte qu'au niveau de la boutique : photo de couverture, note,
 * avis, description, prix — plus la boutique d'origine.
 *
 * Règle marketplace : un lien produit doit ouvrir DIRECTEMENT le produit
 * → le clic principal mène à /produit/:slug. Le pied de carte donne deux
 * actions : la boutique d'origine et la discussion avec le vendeur.
 */
export default function ProductCard({ product }: { product: ApiPublicProduct }) {
  const price = Number(product.price);
  const oldPrice = product.oldPrice !== null && product.oldPrice !== undefined
    ? Number(product.oldPrice)
    : null;
  const hasPromo = oldPrice !== null && oldPrice > price;
  const discount = hasPromo ? Math.round((1 - price / oldPrice) * 100) : 0;
  const inStock = product.stock > 0;
  const boutique = product.boutique;
  const rating = productRating(product);
  const reviewCount = product.reviews?.length ?? 0;

  // « Discuter » : ouvre la conversation avec la boutique DANS l'espace client
  // (créée si besoin, réutilisée sinon), liée à CE produit — image, nom, prix,
  // description + message initial.
  const discussHref = boutique
    ? productChatHref({
        boutiqueId: boutique.id,
        id: product.id,
        name: product.name,
        price,
        description: product.description ?? "",
        image: publicProductImage(product),
      })
    : null;

  const shopHref = boutique ? `/boutique/${boutique.slug}` : "/boutique";

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-midnight-950/8 bg-white shadow-sm shadow-midnight-950/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/50 hover:shadow-lg hover:shadow-midnight-950/10">
      {/* Clic principal → page produit (lien profond /produit/:slug) */}
      <Link
        href={`/produit/${product.slug}`}
        className="flex h-full flex-col"
        aria-label={`Voir le produit ${product.name}`}
      >
        {/* Visuel — photo de couverture plein cadre, comme les cartes boutique */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={publicProductImage(product)}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {hasPromo && (
            <span className="absolute left-3 top-3 rounded-full bg-terracotta px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
              -{discount}%
            </span>
          )}
          {!inStock && (
            <span className="absolute left-3 top-3 rounded-full bg-midnight-950/80 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              Épuisé
            </span>
          )}
          {/* Boutique d'origine */}
          {boutique && (
            <span className="absolute bottom-3 left-3 inline-flex max-w-[80%] items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-midnight-950 shadow-sm backdrop-blur-sm">
              <IconStore className="h-2.5 w-2.5 shrink-0 text-gold-600" />
              <span className="truncate">{boutique.name}</span>
              {/* Badge vérifié — logo ✓ de la boutique d'origine */}
              {boutique.verificationStatus === "VERIFIED" && (
                <VerifiedBadge className="h-3 w-3" />
              )}
            </span>
          )}
        </div>

        {/* Contenu */}
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          {product.category?.name && (
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gold-700">
              {product.category.name}
            </span>
          )}
          <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-midnight-950">
            {product.name}
          </h3>

          {/* Note + avis — comme la carte de la boutique */}
          {(rating > 0 || reviewCount > 0) && (
            <div className="flex items-center gap-1.5">
              <MiniStars rating={rating} />
              {rating > 0 && (
                <span className="text-xs font-semibold text-midnight-950/70">
                  {rating.toFixed(1)}
                </span>
              )}
              {reviewCount > 0 && (
                <span className="text-xs text-midnight-950/60">
                  ({reviewCount} avis)
                </span>
              )}
            </div>
          )}

          {/* Description courte */}
          {product.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-midnight-950/65">
              {product.description}
            </p>
          )}

          <div className="mt-auto flex items-baseline gap-2 pt-1.5">
            <span className="text-base font-bold text-gold-600">
              {formatFcfa(price)}
            </span>
            {hasPromo && (
              <span className="text-xs text-midnight-950/55 line-through">
                {formatFcfa(oldPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Actions : boutique d'origine + discussion — empilées sur mobile
          (zone tactile ≥ 44px, règle UX) puis côte à côte dès sm */}
      <div className="flex flex-col items-stretch gap-2 border-t border-midnight-950/8 p-3 sm:flex-row sm:items-center">
        <Link
          href={shopHref}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border border-midnight-950/15 px-3 py-2 text-xs font-semibold text-midnight-950/70 transition-all duration-200 hover:border-gold-400/70 hover:bg-gold-400/5 hover:text-midnight-950"
        >
          <IconStore className="h-3.5 w-3.5 text-gold-600" />
          Voir la boutique
        </Link>
        {discussHref && (
          <Link
            href={discussHref}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border border-midnight-950/15 px-3 py-2 text-xs font-semibold text-midnight-950/70 transition-all duration-200 hover:border-gold-400/70 hover:bg-gold-400/5 hover:text-midnight-950"
          >
            <IconChat className="h-3.5 w-3.5 text-gold-600" />
            Discuter
          </Link>
        )}
      </div>
    </div>
  );
}
