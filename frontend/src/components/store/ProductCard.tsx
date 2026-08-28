'use client';

import Link from 'next/link';
import { Product, productRating, productReviewCount } from '@/constants/store';
import { productChatHref } from '@/lib/chat';
import { productPrice } from '@/lib/shopConfig';
import { useCatalogueStore } from '@/lib/useCatalogueStore';
import { useShopConfig } from '@/lib/useShopConfig';
import { useCart } from './CartProvider';
import { useProductDetail } from './ProductDetail';
import { ProductCardVisual } from './ProductCardVisual';
import { IconCart, IconChat } from './icons';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { add, openCart } = useCart();
  const { open, reviewsFor } = useProductDetail();
  const config = useShopConfig();
  const catalogue = useCatalogueStore();

  // « Discuter » : ouvre la conversation avec la boutique DANS l'espace client
  // (créée si besoin, réutilisée sinon), liée à CE produit — image, nom, prix,
  // description + message initial.
  const discussHref = catalogue.boutiqueId
    ? productChatHref({
        boutiqueId: catalogue.boutiqueId,
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        image: product.image,
      })
    : null;

  // Note et compteur calculés depuis les avis (catalogue + avis des visiteurs)
  const reviews = reviewsFor(product);
  const rating = productRating(reviews);
  const reviewCount = productReviewCount(reviews);
  // Promotion éventuelle (prix barré + badge animé)
  const { base, current, percent } = productPrice(config, product);

  const inStock = product.stock > 0;

  // Ajoute le produit (variante par défaut) puis ouvre le panier —
  // utilisé par l'icône panier et le bouton « Commander ».
  const handleAddAndOpen = () => {
    add(product);
    openCart();
  };

  return (
    <ProductCardVisual
      name={product.name}
      category={product.category}
      price={product.price}
      basePrice={base}
      currentPrice={current}
      discountPercent={percent ?? undefined}
      rating={rating}
      reviewCount={reviewCount}
      stock={product.stock}
      description={product.description}
      image={product.image}
      imageLabel={product.name}
      className="shadow-sm hover:-translate-y-1 hover:border-gold-400/60 hover:shadow-xl"
      imageWrapper={(image) => (
        <button
          type="button"
          onClick={() => open(product)}
          aria-label={`Voir les détails de ${product.name}`}
          className="relative aspect-square overflow-hidden bg-ivory-50 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          {image}
          {/* Overlay « Voir les détails » au survol */}
          <span className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1.5 bg-gradient-to-t from-midnight-950/90 to-transparent py-4 pt-10 font-display text-sm font-semibold text-gold-300 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            Voir les détails
          </span>
        </button>
      )}
      actions={
        <div className="w-full space-y-2">
          {/* Ligne principale : ajout rapide + commander */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddAndOpen}
              aria-label={`Ajouter ${product.name} au panier`}
              disabled={!inStock}
              className="flex h-10 w-12 shrink-0 items-center justify-center rounded-full bg-midnight-950 text-gold-300 transition-colors hover:bg-gold-400 hover:text-midnight-950 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <IconCart className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleAddAndOpen}
              disabled={!inStock}
              className="flex-1 rounded-full bg-midnight-950 px-2 py-2 text-sm font-bold text-white transition-colors hover:bg-midnight-800 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              Commander
            </button>
          </div>
          {/* Discuter — la conversation s'ouvre dans Mes discussions */}
          {discussHref && (
            <Link
              href={discussHref}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-midnight-950/15 px-3 py-2 text-xs font-semibold text-midnight-950/70 transition-all duration-200 hover:border-gold-400/70 hover:bg-gold-400/5 hover:text-midnight-950"
            >
              <IconChat className="h-3.5 w-3.5 text-gold-600" />
              Discuter
            </Link>
          )}
        </div>
      }
    />
  );
}

export default ProductCard;
