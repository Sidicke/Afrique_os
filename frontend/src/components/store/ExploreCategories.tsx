'use client';

import { useRef } from 'react';
import AssetImage from '@/components/ui/AssetImage';
import { IconChevronLeft, IconChevronRight } from './icons';
import { useCatalogueStore } from '@/lib/useCatalogueStore';
import { useShopConfig } from '@/lib/useShopConfig';

export function ExploreCategories() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const catalogue = useCatalogueStore();
  const config = useShopConfig();

  const shopCategories = catalogue.categories.filter((c) => c !== 'Tous');

  // Si la boutique n'a pas encore de catégories, on masque la section
  if (shopCategories.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth : current.offsetWidth;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-12 md:py-20 bg-white overflow-hidden">
      <div className="container mx-auto px-4 max-w-screen-2xl">
        <div className="flex justify-between items-end mb-6 md:mb-10">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-gold-600 font-bold block mb-1">
              Rayons & Collections
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-midnight-950 max-w-xl">
              Explorez les univers de {config.name}
            </h2>
          </div>
          <div className="hidden md:flex space-x-2">
            <button 
              onClick={() => scroll('left')}
              aria-label="Faire défiler les catégories vers la gauche"
              className="p-3 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-950/40"
            >
              <IconChevronLeft className="w-5 h-5 text-midnight-950" />
            </button>
            <button 
              onClick={() => scroll('right')}
              aria-label="Faire défiler les catégories vers la droite"
              className="p-3 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-950/40"
            >
              <IconChevronRight className="w-5 h-5 text-midnight-950" />
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex space-x-4 sm:space-x-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {shopCategories.map((categoryName) => {
            const sampleProduct = catalogue.products.find((p) => p.category === categoryName);
            const categoryImage = sampleProduct?.image || config.coverImage || "/assets/portraits/vitrine.jpg";

            return (
              <a 
                key={categoryName}
                href="#produits"
                className="relative min-w-[240px] sm:min-w-[300px] md:min-w-[400px] h-[190px] sm:h-[240px] md:h-[300px] rounded-2xl sm:rounded-3xl overflow-hidden snap-start shrink-0 group cursor-pointer block"
              >
                <AssetImage
                  src={categoryImage}
                  alt={categoryName}
                  label={categoryName}
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 z-10" />
                <div className="absolute bottom-6 left-6 z-20">
                  <span className="px-6 py-2.5 bg-white/95 backdrop-blur-sm rounded-full text-midnight-950 font-bold text-sm shadow-md transition-all group-hover:bg-gold-400 group-hover:text-midnight-950">
                    {categoryName}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ExploreCategories;
