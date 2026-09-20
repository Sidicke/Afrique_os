'use client';

import { formatPrice, productRating, productReviewCount, stockLabel } from '@/constants/store';
import { productPrice } from '@/lib/shopConfig';
import { useShopConfig } from '@/lib/useShopConfig';
import { useCatalogueStore } from '@/lib/useCatalogueStore';
import { useProductDetail } from './ProductDetail';
import AssetImage from '@/components/ui/AssetImage';
import { IconSound, IconBattery, IconDesign } from './icons';
import { RatingStars } from './RatingStars';
import { PromoBadge } from './PromoBadge';
import { PromoPrice } from './PromoPrice';

export function FeaturedProduct() {
  const { open, reviewsFor } = useProductDetail();
  const config = useShopConfig();
  const catalogue = useCatalogueStore();

  // Produit mis en avant : le premier marqué isFeatured ou le premier produit du catalogue
  const featured = catalogue.products.find((p) => p.isFeatured) || catalogue.products[0];

  // Si la boutique n'a aucun produit, masquer la section
  if (!featured) {
    return null;
  }

  // Note et compteur dynamiques
  const reviews = reviewsFor(featured);
  const rating = productRating(reviews);
  const reviewCount = productReviewCount(reviews);
  // Promotion éventuelle du produit phare
  const { base, current, percent } = productPrice(config, featured);

  const features = [
    {
      icon: 'design',
      title: 'Qualité & Authenticité',
      description: 'Article certifié et rigoureusement sélectionné pour vous offrir la meilleure satisfaction.',
    },
    {
      icon: 'battery',
      title: 'Disponibilité en stock',
      description: featured.stock > 0 ? `${featured.stock} pièces disponibles immédiatement.` : 'Actuellement indisponible.',
    },
    {
      icon: 'sound',
      title: 'Livraison & Service',
      description: config.deliveryShortLabel ? `${config.deliveryShortLabel} — Service client dédié.` : 'Expédition rapide et service client dédié.',
    },
  ];

  return (
    <section className="py-20 bg-ivory-50/40">
      <div className="container mx-auto px-4 max-w-screen-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col space-y-6">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-gold-600 font-bold">
              {featured.category || "Coup de cœur boutique"}
            </span>
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-midnight-950">
              {featured.name}
            </h2>

            <div className="flex items-center gap-2">
              <RatingStars rating={rating} size="h-4 w-4" />
              <span className="text-sm font-semibold text-midnight-950">{rating.toFixed(1)}</span>
              <span className="text-sm text-midnight-950/50">({reviewCount} avis)</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {percent ? (
                <>
                  <PromoPrice base={base} current={current} percent={percent} size="lg" />
                  <PromoBadge percent={percent} />
                </>
              ) : (
                <p className="font-display text-3xl font-semibold text-gold-600">
                  {formatPrice(featured.price)}
                </p>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  featured.stock > 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    featured.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                {stockLabel(featured.stock)}
              </span>
            </div>

            <p className="text-gray-600 leading-relaxed max-w-lg">
              {featured.description || "Découvrez ce produit incontournable sélectionné avec soin par la boutique."}
            </p>

            <div className="space-y-6 mt-4">
              {features.map((feature, index) => {
                let Icon = IconDesign;
                if (feature.icon === 'battery') Icon = IconBattery;
                if (feature.icon === 'sound') Icon = IconSound;

                return (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="p-3 bg-gold-400/15 rounded-lg shrink-0">
                      <Icon className="w-6 h-6 text-gold-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-midnight-950">{feature.title}</h4>
                      <p className="text-gray-500 text-sm">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => open(featured)}
              className="mt-4 inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-gold-400 px-8 py-3.5 text-sm font-semibold text-midnight-950 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-300 cursor-pointer"
            >
              Voir les détails
            </button>
          </div>

          <button
            type="button"
            onClick={() => open(featured)}
            aria-label={`Voir les détails de ${featured.name}`}
            className="group relative rounded-3xl bg-ivory-50 aspect-square overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            <AssetImage
              src={featured.image}
              alt={featured.name}
              label={featured.name}
              className="object-contain transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-x-4 bottom-4 rounded-2xl bg-midnight-950/85 py-3 text-center font-display text-sm font-semibold text-gold-300 backdrop-blur-sm opacity-0 transition-all duration-300 group-hover:opacity-100">
              Voir les détails
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default FeaturedProduct;
