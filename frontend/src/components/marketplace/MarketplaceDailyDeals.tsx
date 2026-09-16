"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { routes } from "@/lib/urls/routes";
import Container from "@/components/ui/Container";
import { formatFcfa } from "@/lib/utils";
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
  const [products, setProducts] = useState<ApiPublicProduct[]>([]);
  const [hasPromos, setHasPromos] = useState(false);
  const [loading, setLoading] = useState(true);

  // Timer state — fin de journée réelle
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    mins: 0,
    secs: 0,
  });

  useEffect(() => {
    // End of day
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const difference = endOfDay.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          mins: Math.floor((difference / 1000 / 60) % 60),
          secs: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await catalogueApi.allProducts({ sort: "popular", limit: 12 });
        // Priorité aux promos RÉELLES (ancien prix du backend) ; sinon on met en
        // avant les produits populaires sans inventer de rabais.
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="bg-midnight-950 text-gold-300 rounded px-3 py-1.5 font-mono text-xs font-bold tracking-wider uppercase">
              {hasPromos ? "DAILY DEALS" : "SÉLECTION DU JOUR"}
            </span>
            <h2 className="font-display text-xl font-extrabold text-midnight-950">
              {hasPromos ? "Ventes Flash du Jour" : "Nos produits populaires"}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-terracotta font-mono text-xs font-bold uppercase tracking-wider">Offres limitées :</span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="bg-surface border border-line text-midnight-950 rounded-md w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-mono font-bold text-xs shadow-xs">
                {String(timeLeft.days).padStart(2, "0")}
              </div>
              <span className="text-ink-400 text-xs font-bold">:</span>
              <div className="bg-surface border border-line text-midnight-950 rounded-md w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-mono font-bold text-xs shadow-xs">
                {String(timeLeft.hours).padStart(2, "0")}
              </div>
              <span className="text-ink-400 text-xs font-bold">:</span>
              <div className="bg-surface border border-line text-midnight-950 rounded-md w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-mono font-bold text-xs shadow-xs">
                {String(timeLeft.mins).padStart(2, "0")}
              </div>
              <span className="text-ink-400 text-xs font-bold">:</span>
              <div className="bg-surface border border-line text-midnight-950 rounded-md w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-mono font-bold text-xs shadow-xs">
                {String(timeLeft.secs).padStart(2, "0")}
              </div>
            </div>
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
                : `/b/_/p/${product.slug}`;

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
                      {product.description || "Offre exclusive à ne pas manquer ! Profitez d'une réduction exceptionnelle aujourd'hui."}
                    </p>

                    <div className="mt-auto mb-4">
                      <div className="flex items-end gap-3 mb-1">
                        <span className="text-2xl font-bold text-gold-600">
                          {formatFcfa(Number(product.price))}
                        </span>
                        {promo && (
                          <span className="text-sm text-midnight-950/40 line-through mb-1">
                            {formatFcfa(Number(product.oldPrice))}
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
