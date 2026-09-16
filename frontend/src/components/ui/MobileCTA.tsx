'use client';
import { useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import Link from 'next/link';

export default function MobileCTA() {
  const [hidden, setHidden] = useState(true);
  const [scrollingDown, setScrollingDown] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? 0;

    // Apparaît après 300px de scroll
    setHidden(latest < 300);

    // Se cache quand on scroll vers le bas (>10px de delta)
    if (latest > previous && latest - previous > 10) {
      setScrollingDown(true);
    } else if (latest < previous) {
      setScrollingDown(false);
    }
  });

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{
        y: hidden || scrollingDown ? 100 : 0,
        opacity: hidden || scrollingDown ? 0 : 1
      }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 flex justify-center px-4 md:hidden"
    >
      <Link
        href="/inscription"
        className="flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-gold-400 px-8 font-display text-base font-semibold text-midnight-950 shadow-2xl shadow-gold-400/30 backdrop-blur-sm transition-transform active:scale-95"
      >
        Créer ma boutique
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </motion.div>
  );
}
