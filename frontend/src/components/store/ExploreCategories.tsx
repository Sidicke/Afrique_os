'use client';

import { useRef } from 'react';
import { recommendationCategories } from '@/constants/store';
import AssetImage from '@/components/ui/AssetImage';
import { IconChevronLeft, IconChevronRight } from './icons';

export function ExploreCategories() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth : current.offsetWidth;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="container mx-auto px-4 max-w-screen-2xl">
        <div className="flex justify-between items-end mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-midnight-950 max-w-xl">
            Explorez nos catégories et trouvez l&apos;essentiel de la tech
          </h2>
          <div className="flex space-x-2 hidden md:flex">
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
          className="flex space-x-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {recommendationCategories.map((category) => (
            <div 
              key={category.id} 
              className="relative min-w-[300px] md:min-w-[400px] h-[250px] md:h-[300px] rounded-3xl overflow-hidden snap-start shrink-0 group cursor-pointer"
            >
              <AssetImage
                src={category.image}
                alt={category.name}
                label={category.name}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 z-10" />
              <div className="absolute bottom-6 left-6 z-20">
                <span className="px-6 py-2 bg-white/90 backdrop-blur-sm rounded-full text-midnight-950 font-semibold text-sm shadow-sm">
                  {category.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ExploreCategories;
