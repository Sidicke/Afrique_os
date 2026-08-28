"use client";

import { cn } from "@/lib/utils";

interface PromoBadgeProps {
  /** Pourcentage de remise (1-90) — plus il est élevé, plus l'animation attire l'œil */
  percent: number;
  /** Taille du badge (md = cartes, lg = fiche produit) */
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Badge « -X% » animé, ton naturel chaud (or/ambre) — pas de couleurs criardes.
 * L'intensité (durée + amplitude du halo) dépend du pourcentage : plus la remise
 * est forte, plus l'animation est visible. `prefers-reduced-motion` coupe tout.
 */
export function PromoBadge({ percent, size = "md", className }: PromoBadgeProps) {
  const clamped = Math.min(90, Math.max(1, percent));
  // Intensité 0 → 1 sur 0 → 40 % : au-delà, l'effet est à pleine puissance.
  const intensity = Math.min(1, clamped / 40);
  const pulseDuration = (2.8 - 1.5 * intensity).toFixed(2);
  const breatheDuration = (3.4 - 1.6 * intensity).toFixed(2);

  const pad = size === "lg" ? "px-3 py-1.5 text-xs" : size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]";

  return (
    <span
      className={cn("relative inline-flex animate-[promo-pop_0.5s_cubic-bezier(0.22,1,0.36,1)_both]", className)}
      role="status"
      aria-label={`Promotion : -${clamped} %`}
    >
      {/* Halo lumineux qui palpite derrière le badge */}
      <span
        aria-hidden
        className="absolute -inset-1 animate-[promo-pulse_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-gold-300/80 via-amber-300/70 to-gold-500/80 blur-[7px]"
        style={{ animationDuration: `${pulseDuration}s` }}
      />
      <span
        className={cn(
          "relative inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-[#f3e9d3] via-[#e7d3a8] to-[#c9a86a] font-mono font-bold uppercase tracking-wider text-[#3d3114] shadow-[0_2px_12px_rgba(180,140,70,0.5)] animate-[promo-breathe_3s_ease-in-out_infinite]",
          pad
        )}
        style={{ animationDuration: `${breatheDuration}s` }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-2.5 w-2.5">
          <path d="M20 12 4 12" />
          <path d="m18 10 2 2-2 2" />
        </svg>
        {clamped}%
      </span>
    </span>
  );
}

export default PromoBadge;
