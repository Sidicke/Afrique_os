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
 *
 * `?checkout=1` (sans product) :
 *  - Ouvre directement le CartDrawer à l'étape checkout si le panier a des articles.
 *  - Utilisé par la carte « Panier en attente » de l'espace client pour
 *    reprendre une commande en cours sans étape intermédiaire.
 */
export function AutoOpenProduct() {
  const params = useSearchParams();
  const productId = params.get("product");
  const directOrder = params.get("commander") === "1";
  const directCheckout = params.get("checkout") === "1";
  const catalogue = useCatalogueStore();
  const { open } = useProductDetail();
  const { add, openCartAtCheckout, lines } = useCart();
  const openedRef = useRef<string | null>(null);
  const checkoutOpenedRef = useRef(false);

  // ?product=<id> → auto-ouverture modal ou achat direct
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

  // ?checkout=1 → ouvre le CartDrawer directement à l'étape checkout
  // (panier en attente depuis l'espace client)
  useEffect(() => {
    if (!directCheckout) return;
    if (!catalogue.loaded) return;
    if (checkoutOpenedRef.current) return;
    if (lines.length === 0) return; // panier vide — rien à faire
    checkoutOpenedRef.current = true;
    openCartAtCheckout();
  }, [directCheckout, catalogue.loaded, lines.length, openCartAtCheckout]);

  return null;
}
