"use client";

import { ReactNode } from "react";
import AssetImage from "@/components/ui/AssetImage";
import { formatPrice, stockLabel } from "@/constants/store";
import { useShopConfig } from "@/lib/useShopConfig";
import { IconTruck } from "./icons";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { RatingStars } from "./RatingStars";
import { PromoBadge } from "./PromoBadge";
import { PromoPrice } from "./PromoPrice";

export interface ProductCardVisualProps {
  name: string;
  category: string;
  /** Prix de base en FCFA */
  price: number;
  /** Prix barré (uniquement si en promotion) */
  basePrice?: number;
  /** Prix remisé (uniquement si en promotion) */
  currentPrice?: number;
  /** Pourcentage de remise — déclenche le badge animé */
  discountPercent?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  description: string;
  image: string;
  imageLabel: string;
  /**
   * Enveloppe la zone image : bouton cliquable côté boutique (ouvre la fiche),
   * simple div décorative côté Hero. Reçoit l'image + les badges.
   */
  imageWrapper: (image: ReactNode) => ReactNode;
  /** Rangée d'actions sous le prix (boutons réels ou visuels) */
  actions: ReactNode;
  className?: string;
}

/**
 * Carte produit VISUELLE — source unique de vérité du design.
 * Utilisée par `ProductCard` (interactive, boutique) et `FloatingProducts`
 * (décorative, Hero) pour garantir une présentation 100 % identique partout
 * où un produit est affiché. Affiche la promotion (prix barré + badge animé)
 * quand `discountPercent` est fourni.
 */
export function ProductCardVisual({
  name,
  category,
  price,
  basePrice,
  currentPrice,
  discountPercent,
  rating,
  reviewCount,
  stock,
  description,
  image,
  imageLabel,
  imageWrapper,
  actions,
  className,
}: ProductCardVisualProps) {
  const inStock = stock > 0;
  const config = useShopConfig();
  const onSale = !!discountPercent && discountPercent > 0;
  // Prix affiché : remisé si promo, sinon prix de base
  const displayPrice = onSale && currentPrice != null ? currentPrice : price;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 ${className ?? ""}`}
    >
      {imageWrapper(
        <>
          <AssetImage
            src={image}
            alt={name}
            label={imageLabel}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Pile de badges en haut à gauche : promotion puis stock */}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {onSale && <PromoBadge percent={discountPercent!} />}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm ${
                inStock ? "bg-emerald-50/95 text-emerald-700" : "bg-red-50/95 text-red-600"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-emerald-500" : "bg-red-500"}`}
              />
              {stockLabel(stock)}
            </span>
          </div>

          {/* Catégorie */}
          <span className="absolute bottom-3 right-3 rounded-full bg-midnight-950/85 px-3 py-1 text-xs font-medium text-gold-300 shadow-md">
            {category}
          </span>

          {/* Badge vérifié — image officielle sur les produits d'une boutique vérifiée */}
          {config.isVerified && (
            <VerifiedBadge className="absolute right-3 top-3 h-5 w-5 drop-shadow-md" />
          )}
        </>
      )}

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-bold text-gray-900 line-clamp-1">{name}</h3>

        {/* Note dynamique complète */}
        <div className="mt-1 flex items-center space-x-1">
          <RatingStars rating={rating} size="h-4 w-4" />
          <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
          <span className="text-sm text-gray-400">({reviewCount} avis)</span>
        </div>

        <p className="mt-2 line-clamp-2 text-sm text-gray-500">{description}</p>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            {onSale ? (
              <PromoPrice
                base={basePrice ?? price}
                current={displayPrice}
                percent={discountPercent!}
              />
            ) : (
              <div className="text-xl font-bold text-gold-600">{formatPrice(price)}</div>
            )}
          </div>
          <span className="hidden items-center gap-1 text-[11px] text-midnight-950/45 sm:inline-flex">
            <IconTruck className="h-3.5 w-3.5 text-gold-600" />
            {config.deliveryShortLabel}
          </span>
        </div>

        <div className="mt-4 flex gap-2">{actions}</div>
      </div>
    </article>
  );
}

export default ProductCardVisual;
