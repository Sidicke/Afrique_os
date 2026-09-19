"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { routes } from "@/lib/urls/routes";
import Container from "@/components/ui/Container";
import { useTranslation } from "@/lib/i18n";
import { catalogueApi } from "@/lib/api";
import { publicProductImage } from "@/lib/api/mappers";
import { ApiPublicProduct } from "@/lib/api/types";

/** Une promo est RÉELLE quand le backend fournit un ancien prix supérieur au prix actuel. */
function isRealPromo(p: ApiPublicProduct): boolean {
  return (
    p.oldPrice !== null &&
    p.oldPrice !== undefined &&
    Number(p.oldPrice) > Number(p.price)
  );
}

function discountPercent(p: ApiPublicProduct): number {
  if (!isRealPromo(p)) return 0;
  return Math.round((1 - Number(p.price) / Number(p.oldPrice)) * 100);
}

export default function MarketplaceDailyDeals() {
    const { formatPrice, t } = useTranslation();

  const [products, setProducts] = useState<ApiPublicProduct[]>([]);
  const [hasPromos, setHasPromos] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await catalogueApi.allProducts({ sort: "popular", limit: 12 });
        // Priorité aux promos RÉELLES (ancien prix du backend) ; sinon on met en
        // avant les produits populaires sans inventer de rabais ni de faux compteurs.
        const promos = response.items.filter(isRealPromo).slice(0, 4);
        if (promos.length > 0) {
          setHasPromos(true);
          setProducts(promos);
        } else {
          const featured = response.items.filter((p) => p.isFeatured).slice(0, 4);
          setHasPromos(false);
          setProducts(featured.length > 0 ? featured : response.items.slice(0, 4));
        }
      } catch (error) {
        console.error("Failed to fetch daily deals", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="py-8 bg-ivory-50">
      <Container size="wide">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="bg-midnight-950 text-gold-300 rounded-lg px-3 py-1.5 font-mono text-xs font-bold tracking-wider uppercase">
              {hasPromos ? t.marketplace.dealsDirect : t.marketplace.dealsSelection}
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-midnight-950">
              {hasPromos ? "Promotions des boutiques" : "Produits les plus populaires"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {hasPromos ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/10 px-3 py-1 font-mono text-xs font-bold text-terracotta">
                <span className="h-1.5 w-1.5 rounded-full bg-terracotta" aria-hidden="true" />
                {t.marketplace.dealsSubtitle}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-400/15 px-3 py-1 font-mono text-xs font-bold text-gold-800">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />
                Tendances de la semaine
              </span>
            )}
            <Link
              href="/recherche"
              className="text-xs sm:text-sm font-bold text-midnight-950 hover:text-gold-strong transition-colors"
            >
              Voir tout →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            Array(2).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-4 flex gap-6 animate-pulse h-48 border border-midnight-950/8"></div>
            ))
          ) : (
            products.map((product) => {
              const imageUrl = publicProductImage(product);
              const discount = discountPercent(product);
              const promo = isRealPromo(product);

              const href = product.boutique?.slug
                ? routes.product(product.boutique.slug, product.slug)
                : `/produit/${product.slug}`;

              return (
                <Link
                  key={product.id}
                  href={href}
                  className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 border border-midnight-950/8 hover:border-gold-400/50 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                >
                  {promo && (
                    <div className="absolute top-4 left-4 bg-terracotta text-white text-xs font-bold px-2 py-1 rounded-lg z-10">
                      -{discount}%
                    </div>
                  )}

                  <div className="relative w-full sm:w-48 aspect-square rounded-2xl overflow-hidden bg-ivory-100 flex-shrink-0">
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 192px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="flex flex-col flex-1 py-1">
                    <h3 className="font-display font-semibold text-lg text-midnight-950 line-clamp-2 mb-2 group-hover:text-gold-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-midnight-950/60 line-clamp-2 mb-4">
                      {product.description || t.marketplace.dealsDefaultDesc}
                    </p>

                    <div className="mt-auto mb-4">
                      <div className="flex items-end gap-3 mb-1">
                        <span className="text-2xl font-bold text-gold-600">
                          {formatPrice(Number(product.price))}
                        </span>
                        {promo && (
                          <span className="text-sm text-midnight-950/40 line-through mb-1">
                            {formatPrice(Number(product.oldPrice))}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="inline-flex items-center gap-1.5 text-ink-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-6 9 6v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V9z" />
                          </svg>
                          {product.boutique?.name ?? "ZennShop"}
                        </span>
                        {product.rating ? (
                          <span className="inline-flex items-center gap-1 text-gold-600">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M12 2l2.9 6.26L21.5 9.3l-4.75 4.63 1.12 6.57L12 17.27l-5.87 3.23 1.12-6.57L2.5 9.3l6.6-1.04L12 2z" />
                            </svg>
                            {Number(product.rating).toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </Container>
    </section>
  );
}
