"use client";

import Link from "next/link";
import Container from "@/components/ui/Container";
import { cn } from "@/lib/utils";

interface PromoBannerProps {
  variant: "coupon" | "seller";
}

export default function PromoBanner({ variant }: PromoBannerProps) {
  return (
    <Container className="my-10">
      <div 
        className={cn(
          "w-full rounded-2xl overflow-hidden relative p-8 md:p-12 transition-all duration-500 hover:shadow-lg group",
          variant === "coupon" ? "bg-gradient-to-r from-midnight-800 to-midnight-950" : "bg-gradient-to-r from-african-green/90 to-african-green"
        )}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:shimmer-gold transition-all duration-1000"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center md:text-left">
            {variant === "coupon" ? (
              <>
                <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-white/10 rounded-full border border-gold-400/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" className="text-gold-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V6a2 2 0 10-2 2h2zm7 3v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9a2 2 0 012-2h10a2 2 0 012 2zM3 11h18" />
                  </svg>
                  <span className="text-gold-300 font-mono text-xs font-bold uppercase tracking-wider">Le meilleur du catalogue</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
                  Des nouveautés chaque jour sur la plateforme
                </h3>
                <p className="text-gold-400 text-lg">
                  Promotions réelles des boutiques partenaires, mises à jour en continu.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
                  Ouvrez votre boutique gratuitement
                </h3>
                <p className="text-white/80 text-lg">
                  Business : 15 000 FCFA/mois
                </p>
              </>
            )}
          </div>
          
          <div className="flex-shrink-0">
            {variant === "coupon" ? (
              <Link
                href="/recherche"
                className="inline-block rounded-full bg-terracotta hover:bg-terracotta/90 text-white font-bold py-3 px-8 transition-colors shadow-lg"
              >
                Voir le catalogue
              </Link>
            ) : (
              <Link href="/inscription" className="inline-block rounded-full bg-midnight-950 hover:bg-midnight-900 text-gold-300 font-bold py-3 px-8 border border-midnight-950/20 transition-colors shadow-lg">
                Créer ma boutique
              </Link>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
