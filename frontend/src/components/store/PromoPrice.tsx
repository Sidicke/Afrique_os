"use client";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/constants/store";

interface PromoPriceProps {
  /** Prix de base (barré) en FCFA */
  base: number;
  /** Prix remisé en FCFA */
  current: number;
  /** Pourcentage de remise (1-90) — plus il est élevé, plus l'animation attire l'œil */
  percent: number;
  size?: "md" | "lg";
  className?: string;
}

/**
 * Prix en promotion — le prix actuel « respire » (halo + pulsation douce)
 * avec une intensité proportionnelle au pourcentage de remise, sur un fond
 * naturel or/ambre. `prefers-reduced-motion` coupe toute l'animation.
 */
export function PromoPrice({ base, current, percent, size = "md", className }: PromoPriceProps) {
  const clamped = Math.min(90, Math.max(1, percent));
  // Intensité 0 → 1 sur 0 → 40 % : au-delà, l'effet est à pleine puissance.
  const intensity = Math.min(1, clamped / 40);
  const breatheDuration = (3.4 - 1.4 * intensity).toFixed(2);
  const glowDuration = (2.8 - 1.2 * intensity).toFixed(2);
  const showHalo = clamped >= 20;
  const showSparkle = clamped >= 15;

  const currentCls = size === "lg" ? "text-3xl" : "text-xl";
  const baseCls = size === "lg" ? "text-lg" : "text-sm";

  return (
    <div className={cn("relative inline-flex flex-wrap items-baseline gap-x-2", className)}>
      {/* Halo doré derrière le prix remisé (visible dès 20 % de remise) */}
      {showHalo && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-x-1 -inset-y-0.5 animate-[promo-glow_2.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-gold-300/40 via-amber-200/30 to-gold-400/40 blur-md"
          style={{ animationDuration: `${glowDuration}s` }}
        />
      )}
      {/* Prix barré — glisse en place à l'apparition */}
      <span
        className={cn(
          "animate-[promo-strike_0.5s_ease-out] font-semibold text-gray-400 line-through",
          baseCls
        )}
      >
        {formatPrice(base)}
      </span>
      {/* Prix remisé — respire doucement (intensité ∝ %) */}
      <span className={cn("relative inline-flex items-baseline gap-1 font-bold text-gold-600", currentCls)}>
        <span
          className="inline-block animate-[promo-breathe_3.4s_ease-in-out_infinite]"
          style={{ animationDuration: `${breatheDuration}s` }}
        >
          {formatPrice(current)}
        </span>
        {showSparkle && (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="h-3 w-3 animate-[promo-twinkle_2.2s_ease-in-out_infinite] text-amber-400"
          >
            <path d="M12 2l2.2 6.6 6.8.6-5.2 4.2 1.6 6.8-5.4-3.8-5.4 3.8 1.6-6.8L3 9.2l6.8-.6z" />
          </svg>
        )}
      </span>
    </div>
  );
}

export default PromoPrice;
