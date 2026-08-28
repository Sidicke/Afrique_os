'use client';

import { featuredProduct, formatPrice, productRating, productReviewCount, stockLabel } from '@/constants/store';
import { productPrice } from '@/lib/shopConfig';
import { useShopConfig } from '@/lib/useShopConfig';
import { useProductDetail } from './ProductDetail';
import AssetImage from '@/components/ui/AssetImage';
import { IconSound, IconBattery, IconDesign } from './icons';
import { RatingStars } from './RatingStars';
import { PromoBadge } from './PromoBadge';
import { PromoPrice } from './PromoPrice';

export function FeaturedProduct() {
  const { open, reviewsFor } = useProductDetail();
  const config = useShopConfig();
  // Note et compteur dynamiques (avis catalogue + avis des visiteurs)
  const reviews = reviewsFor(featuredProduct);
  const rating = productRating(reviews);
  const reviewCount = productReviewCount(reviews);
  // Promotion éventuelle du produit phare
  const { base, current, percent } = productPrice(config, featuredProduct);

  return (
    <section className="py-20 bg-ivory-50/40">
      <div className="container mx-auto px-4 max-w-screen-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col space-y-6">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-gold-600">
              {featuredProduct.subtitle}
            </span>
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-midnight-950">
              {featuredProduct.name}
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
                  {formatPrice(featuredProduct.price)}
                </p>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  featuredProduct.stock > 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    featuredProduct.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                {stockLabel(featuredProduct.stock)}
              </span>
            </div>

            <p className="text-gray-600 leading-relaxed max-w-lg">
              {featuredProduct.description}
            </p>

            <div className="space-y-6 mt-4">
              {featuredProduct.features.map((feature, index) => {
                let Icon = IconSound;
                if (feature.icon === 'battery') Icon = IconBattery;
                if (feature.icon === 'design') Icon = IconDesign;

                return (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="p-3 bg-gold-400/15 rounded-lg shrink-0">
                      <Icon className="w-6 h-6 text-gold-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-midnight-950">{feature.title}</h4>
                      <p className="text-gray-500">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => open(featuredProduct)}
              className="mt-4 inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-gold-400 px-8 py-3.5 text-sm font-semibold text-midnight-950 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-300 cursor-pointer"
            >
              Voir les détails
            </button>
          </div>

          <button
            type="button"
            onClick={() => open(featuredProduct)}
            aria-label={`Voir les détails de ${featuredProduct.name}`}
            className="group relative rounded-3xl bg-ivory-50 aspect-square overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            <AssetImage
              src={featuredProduct.image}
              alt={featuredProduct.name}
              label={featuredProduct.name}
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
