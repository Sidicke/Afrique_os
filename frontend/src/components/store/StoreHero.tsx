'use client';

import { IconSearch } from './icons';
import AssetImage from '@/components/ui/AssetImage';
import Reveal from '@/components/animations/Reveal';
import { useShopConfig } from '@/lib/useShopConfig';

export default function StoreHero() {
  const config = useShopConfig();
  return (
    <section className="w-full flex flex-col">
      {/* Hero Image Section */}
      <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden bg-gray-100 flex items-center justify-center">
        {config.coverImage.startsWith("data:") ? (
          /* Image importée depuis l'appareil (data URL) : next/image ne la supporte pas */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.coverImage}
            alt={`Vitrine de ${config.name}`}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <AssetImage
            src={config.coverImage || "/assets/portraits/vitrine.jpg"}
            alt={`Vitrine de ${config.name}`}
            className="object-cover object-center"
            priority
          />
        )}
        
        {/* Overlay Text — taille responsive : jamais plus large que l'écran */}
        <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
          <h1 className="text-[40px] sm:text-[64px] md:text-[110px] font-fraunces font-bold text-white/40 tracking-tighter mix-blend-overlay text-center leading-none">
            BOUTIQUE
          </h1>
        </div>
      </div>

      {/* Title & Search Section */}
      <div className="w-full bg-white py-8 px-4 md:px-6 md:py-12 border-b border-gray-100">
        <div className="container mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-fraunces font-bold text-black tracking-tight">
              {config.tagline}
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex w-full md:w-[400px] items-center bg-gray-50 rounded-full p-1 border border-gray-200">
              <div className="pl-3 pr-2 flex items-center text-gray-400">
                <IconSearch className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder={`Rechercher sur ${config.name}`}
                aria-label={`Rechercher sur ${config.name}`}
                className="min-w-0 flex-1 bg-transparent border-none text-black placeholder:text-gray-400 text-sm py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-midnight-950/40 rounded-full"
              />
              <button className="shrink-0 bg-midnight-950 text-white px-4 sm:px-6 py-2.5 rounded-full text-sm font-medium hover:bg-gold-400 hover:text-midnight-950 transition-colors ml-2 cursor-pointer">
                Rechercher
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
