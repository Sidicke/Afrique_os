"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCatalogueStore } from "@/lib/useCatalogueStore";
import { useCart } from "./CartProvider";
import { useProductDetail } from "./ProductDetail";

/**
 * Auto-ouverture d'un produit sur la vitrine via `?product=<id>`.
 * --------------------------------------------------------------------------
 * Le Marketplace (/produit/:slug) amène l'acheteur ici pour finaliser :
 *  - « Discuter »  → le produit s'ouvre dans le modal (catalogue boutique).
 *  - « Commander » → `?product=<id>&commander=1` : le produit entre dans le
 *    panier et la commande s'ouvre DIRECTEMENT (étape « Vos coordonnées ») —
 *    fini le détour par le modal + un deuxième clic sur « Commander ».
 */
export function AutoOpenProduct() {
  const params = useSearchParams();
  const productId = params.get("product");
  const directOrder = params.get("commander") === "1";
  const catalogue = useCatalogueStore();
  const { open } = useProductDetail();
  const { add, openCartAtCheckout } = useCart();
  const openedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    if (!catalogue.loaded) return;
    if (openedRef.current === productId) return;
    const product = catalogue.products.find((p) => p.id === productId);
    if (product) {
      openedRef.current = productId;
      if (directOrder) {
        // Achat direct : ajoute au panier (variante par défaut) et ouvre la
        // commande — le vrai checkout de la boutique.
        add(product);
        openCartAtCheckout();
      } else {
        open(product);
      }
    }
  }, [
    productId,
    directOrder,
    catalogue.loaded,
    catalogue.products,
    open,
    add,
    openCartAtCheckout,
  ]);

  return null;
}
