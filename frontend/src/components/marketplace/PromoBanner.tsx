"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface PromoBannerProps {
  variant?: "seller" | "coupon";
  className?: string;
}

export default function PromoBanner({ variant = "seller", className }: PromoBannerProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("my-6 w-full", className)}>
      <div 
        className={cn(
          "w-full rounded-2xl overflow-hidden relative p-6 sm:p-8 transition-all duration-300 hover:shadow-lg",
          "bg-gradient-to-r from-[#1b533a] via-african-green to-[#204e38]"
        )}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 mb-2 px-2.5 py-0.5 bg-white/15 rounded-full border border-white/20 text-gold-300 font-mono text-[11px] font-bold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-300" aria-hidden="true" />
              {t.marketplace.promoPlan}
            </div>
            
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-white mb-1.5">
              {t.marketplace.promoTitle}
            </h3>
            
            <p className="text-white/90 text-sm sm:text-base max-w-xl">
              {t.marketplace.promoDesc}
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <Link
              href="/tarifs"
              className="inline-flex items-center justify-center rounded-xl bg-gold-400 hover:bg-gold-300 text-midnight-950 font-bold py-3 px-6 text-sm transition-all duration-200 shadow-md active:scale-[0.98]"
            >
              {t.marketplace.promoCta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
