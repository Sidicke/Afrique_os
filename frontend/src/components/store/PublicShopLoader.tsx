"use client";

import { useEffect, useRef } from "react";
import { loadPublicShop } from "@/lib/catalogueStore";

/**
 * Chargeur de la vitrine — déclenche `loadPublicShop(slug)` au montage ET à
 * chaque changement de slug (navigation multi-boutiques /boutique/[slug]) :
 * config boutique (identité, livraison, promotions) + catalogue produits,
 * en un seul appel public. Ne rend rien.
 *
 * Tant que rien n'est chargé (ou hors-ligne), la vitrine affiche la démo
 * `constants/store.ts` — aucune erreur à l'écran.
 */
export function PublicShopLoader({ slug }: { slug: string }) {
  const lastSlug = useRef<string | null>(null);

  useEffect(() => {
    if (lastSlug.current === slug) return;
    lastSlug.current = slug;
    void loadPublicShop(slug);
  }, [slug]);

  return null;
}
