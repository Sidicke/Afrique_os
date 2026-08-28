'use client';

import AssetImage from '@/components/ui/AssetImage';
import { IconPlay } from './icons';
import { motion } from 'framer-motion';
import { store } from '@/constants/store';

export function VideoSection() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4 max-w-screen-2xl">
        <div className="relative w-full h-[350px] md:h-[420px] rounded-3xl overflow-hidden group cursor-pointer">
          <AssetImage
            src="/assets/scenes/ambiance-tech.jpg"
            alt="Boutique d'électronique"
            label="Vidéo"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-4 z-10">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 bg-gold-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-gold-400/30"
            >
              <IconPlay className="w-6 h-6 text-midnight-950 ml-1" />
            </motion.div>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
              Quand votre quotidien s&apos;illumine avec {store.name}
            </h2>
            <p className="text-white/80 max-w-lg text-lg">
              Des produits soigneusement sélectionnés pour accompagner vos envies et simplifier votre quotidien.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default VideoSection;
