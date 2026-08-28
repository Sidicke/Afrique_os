"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { catalogueApi } from "@/lib/api";
import { publicProductImage } from "@/lib/api/mappers";
import { ApiPublicProduct } from "@/lib/api/types";
import { formatFcfa } from "@/lib/utils";

export default function MarketplaceLatestProducts() {
  const [products, setProducts] = useState<ApiPublicProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await catalogueApi.allProducts({ sort: 'newest', limit: 4 });
        setProducts(response.items);
      } catch (error) {
        console.error("Failed to fetch latest products", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. eMarket Left Promo Card (Vertical Banner like in image) */}
      <div className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-b from-[#fef5e7] via-[#fff9f0] to-[#f5e6d3] p-5 shadow-sm">
        <span className="inline-block rounded bg-terracotta/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-terracotta mb-2">
          DÉCOUVERTE
        </span>
        <h3 className="font-display text-base font-extrabold text-midnight-950">
          Toute la plateforme
        </h3>
        <p className="mt-2 text-xs text-ink-600 leading-relaxed">
          Meubles, tech, mode, beauté et plus : explorez le catalogue de toutes
          les boutiques partenaires.
        </p>
        <Link
          href="/recherche"
          className="mt-4 inline-block rounded-lg bg-midnight-950 px-4 py-2 text-center text-xs font-bold text-gold-300 shadow transition-all hover:bg-midnight-800"
        >
          Découvrir →
        </Link>
      </div>

      {/* 2. Top Rated / Latest Items List */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
        <div className="mb-4 border-b border-line pb-2 flex items-center justify-between">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-midnight-950">
            DERNIERS PRODUITS
          </h3>
          <span className="text-terracotta font-bold text-xs">•••</span>
        </div>

        <div className="flex flex-col divide-y divide-line/60">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex gap-3 py-2.5 items-center animate-pulse">
                <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : (
            products.map((product) => {
              const imageUrl = publicProductImage(product);
              
              return (
                <Link 
                  key={product.id} 
                  href={`/produit/${product.slug}`}
                  className="group flex gap-3 items-center py-2.5 transition-colors hover:bg-gold-wash/40 rounded-lg px-1"
                >
                  <div className="relative w-12 h-12 rounded border border-line overflow-hidden bg-gray-50 flex-shrink-0">
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      sizes="48px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-0.5 text-gold-500 mb-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="text-[10px]">★</span>
                      ))}
                    </div>
                    <h4 className="text-xs font-semibold text-ink-900 truncate group-hover:text-terracotta transition-colors">
                      {product.name}
                    </h4>
                    <span className="font-mono text-xs font-bold text-terracotta mt-0.5">
                      {formatFcfa(Number(product.price))}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
