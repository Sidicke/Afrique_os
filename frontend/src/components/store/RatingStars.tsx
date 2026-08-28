"use client";

import { IconStar } from "./icons";

interface RatingStarsProps {
  rating: number;
  /** Taille des étoiles (classes Tailwind), ex. "h-4 w-4" */
  size?: string;
  className?: string;
}

/**
 * Rangée d'étoiles de note — conçue pour être TRÈS visible sur fond clair
 * comme sur fond sombre :
 *   • étoiles pleines en or vif (amber) → on voit immédiatement la note ;
 *   • étoiles restantes en gris net → on voit aussi ce qui manque.
 * Affichage uniquement (aria-hidden) — source unique de vérité du rendu
 * des notes, utilisée par ProductCardVisual, FeaturedProduct, ProductDetail
 * et le mockup du Hero.
 */
export function RatingStars({ rating, size = "h-4 w-4", className }: RatingStarsProps) {
  return (
    <span className={`flex items-center gap-0.5 ${className ?? ""}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <IconStar
          key={star}
          className={`${size} ${star <= Math.round(rating) ? "text-amber-400" : "text-gray-300"}`}
        />
      ))}
    </span>
  );
}

export default RatingStars;
