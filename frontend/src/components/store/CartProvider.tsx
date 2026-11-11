"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { defaultVariant, type CartLine, type Product, type ProductVariant } from "@/constants/store";
import { productPrice, type DeliveryPack } from "@/lib/shopConfig";
import { useShopConfig } from "@/lib/useShopConfig";
import { useParams } from "next/navigation";

interface CartContextValue {
  lines: CartLine[];
  isOpen: boolean;
  /** Ajoute un produit (avec sa variante, par défaut la première).
   *  N'ouvre pas le panier : c'est l'appelant qui décide (icône panier, Commander…). */
  add: (product: Product, variant?: ProductVariant, negotiatedPrice?: number, conversationId?: string) => void;
  /** Retire une ligne par sa clé unique (produit + variante) */
  remove: (lineKey: string) => void;
  setQty: (lineKey: string, qty: number) => void;
  clear: () => void;
  /** Retire UNIQUEMENT les lignes indiquées — utilisé après un paiement
   *  PARTIEL : les articles non achetés restent dans le panier. */
  removeLines: (lineKeys: string[]) => void;
  /** Clés des lignes sélectionnées (sous-ensemble du panier) */
  selectedKeys: string[];
  /** Lignes sélectionnées — c'est ce qui sera commandé */
  selectedLines: CartLine[];
  /** Bascule la sélection d'une ligne */
  toggleSelected: (lineKey: string) => void;
  /** Sélectionne tout le panier (true) ou le désélectionne entièrement (false) */
  setAllSelected: (selected: boolean) => void;
  /** Nombre d'articles sélectionnés */
  selectedCount: number;
  /** Sous-total des articles sélectionnés uniquement */
  selectedSubtotal: number;
  /** Total des articles sélectionnés + frais de livraison */
  selectedTotal: number;
  /** Ouvre le panier sur l'étape panier (défaut) */
  openCart: () => void;
  /** Ouvre le panier DIRECTEMENT sur « Vos coordonnées » (achat direct) */
  openCartAtCheckout: () => void;
  closeCart: () => void;
  /** Étape demandée à l'ouverture : "cart" (défaut) ou "checkout" (achat direct) */
  initialStep: "cart" | "checkout";
  count: number;
  /** Sous-total des produits (prix remisés appliqués) */
  subtotal: number;
  /** Packs de livraison proposés (configurés par l'admin « Ma boutique ») */
  deliveryPacks: DeliveryPack[];
  /** Pack sélectionné — null tant que non choisi (obligatoire à la commande) */
  deliveryPack: DeliveryPack | null;
  /** Sélectionne un pack (null = aucune sélection) */
  setDeliveryPackId: (id: string | null) => void;
  /** Frais de livraison du pack sélectionné (0 si aucun) */
  deliveryFee: number;
  /** Total commande = sous-total + frais de livraison */
  total: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function lineKey(productId: string, variant: ProductVariant): string {
  return `${productId}::${variant.id}`;
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  /** Clés des lignes sélectionnées — sous-ensemble du panier qui sera commandé.
   *  Par défaut TOUT est sélectionné : le client peut désélectionner ce qu'il
   *  ne veut pas acheter sans avoir à cocher quoi que ce soit. */
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [deliveryPackId, setDeliveryPackId] = useState<string | null>(null);
  const [initialStep, setInitialStep] = useState<"cart" | "checkout">("cart");
  const config = useShopConfig();
  const params = useParams();
  const boutiqueSlug = params?.boutiqueSlug || params?.slug || "unknown";

  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from local storage on mount
  useEffect(() => {
    try {
      if (boutiqueSlug === "unknown") return;
      const saved = localStorage.getItem("zennshop_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.boutiqueSlug === boutiqueSlug && Array.isArray(parsed.lines)) {
          setLines(parsed.lines);
          // Sélection restaurée si elle a été mémorisée, sinon tout est
          // sélectionné (comportement historique). Les clés qui ne
          // correspondent plus à une ligne sont écartées.
          if (Array.isArray(parsed.selectedKeys)) {
            const valid = parsed.selectedKeys.filter((k: string) =>
              parsed.lines.some((l: CartLine) => l.key === k)
            );
            setSelectedKeys(valid);
          } else {
            setSelectedKeys(parsed.lines.map((l: CartLine) => l.key));
          }
        } else if (parsed.boutiqueSlug !== boutiqueSlug) {
          // Si on change de boutique, on vide le panier de l'ancienne boutique !
          localStorage.removeItem("zennshop_cart");
        }
      }
    } catch (err) {}
    setIsLoaded(true);
  }, [boutiqueSlug]);

  // Save cart to local storage on changes
  useEffect(() => {
    if (boutiqueSlug !== "unknown" && isLoaded) {
      localStorage.setItem(
        "zennshop_cart",
        JSON.stringify({ boutiqueSlug, lines, selectedKeys })
      );
    }
  }, [lines, selectedKeys, boutiqueSlug, isLoaded]);


  const add = useCallback((product: Product, variant?: ProductVariant, negotiatedPrice?: number, conversationId?: string) => {
    const chosen = variant ?? defaultVariant(product);
    const key = lineKey(product.id, chosen);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { key, product, variant: chosen, qty: 1, negotiatedPrice, conversationId }];
    });
    // Un article qu'on vient d'ajouter est par défaut SÉLECTIONNÉ : le client
    // l'a voulu, il ne doit pas avoir à le cocher.
    setSelectedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    if (qty < 1) return;
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, qty } : l))
    );
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setSelectedKeys([]);
    setDeliveryPackId(null);
  }, []);

  /** Retire uniquement les lignes indiquées (paiement PARTIEL) : les articles
   *  non achetés restent dans le panier pour un prochain achat. */
  const removeLines = useCallback((lineKeys: string[]) => {
    const targeted = new Set(lineKeys);
    setLines((prev) => prev.filter((l) => !targeted.has(l.key)));
    setSelectedKeys((prev) => prev.filter((k) => !targeted.has(k)));
  }, []);

  /** Bascule la sélection d'une ligne */
  const toggleSelected = useCallback((key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  /** Tout sélectionner / tout désélectionner */
  const setAllSelected = useCallback((selected: boolean) => {
    setSelectedKeys((prev) => (selected ? lines.map((l) => l.key) : []));
  }, [lines]);

  const openCart = useCallback(() => {
    setInitialStep("cart");
    setIsOpen(true);
  }, []);

  /**
   * Achat direct (« Commander ») : ouvre le tiroir sur l'étape commande. Un
   * pack de livraison est présélectionné (sinon l'étape coordonnées ne peut
   * pas aboutir) — l'acheteur peut toujours le changer via « Retour au panier ».
   */
  const openCartAtCheckout = useCallback(() => {
    setDeliveryPackId((prev) => prev ?? config.deliveryPacks[0]?.id ?? null);
    setInitialStep("checkout");
    setIsOpen(true);
  }, [config.deliveryPacks]);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const { count, subtotal } = useMemo(
    () => ({
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      // Prix remisés : une ligne est calculée avec la promotion active du produit
      subtotal: lines.reduce(
        (sum, l) => sum + (l.negotiatedPrice ?? productPrice(config, l.product).current) * l.qty,
        0
      ),
    }),
    [lines, config]
  );

  const deliveryPack = useMemo(
    () => config.deliveryPacks.find((p) => p.id === deliveryPackId) ?? null,
    [config, deliveryPackId]
  );
  const deliveryFee = deliveryPack?.price ?? 0;
  const total = subtotal + deliveryFee;

  /* ——— Sélection : c'est elle qui détermine ce qui sera commandé ———
     `subtotal` / `total` décrivent le panier ENTIER (badge, panier complet) ;
     `selectedSubtotal` / `selectedTotal` décrivent la commande en cours. */
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const selectedLines = useMemo(
    () => lines.filter((l) => selectedSet.has(l.key)),
    [lines, selectedSet]
  );

  const { selectedCount, selectedSubtotal } = useMemo(
    () => ({
      selectedCount: selectedLines.reduce((sum, l) => sum + l.qty, 0),
      selectedSubtotal: selectedLines.reduce(
        (sum, l) => sum + (l.negotiatedPrice ?? productPrice(config, l.product).current) * l.qty,
        0
      ),
    }),
    [selectedLines, config]
  );

  const selectedTotal = selectedSubtotal + deliveryFee;

  const value = useMemo(
    () => ({
      lines,
      isOpen,
      add,
      remove,
      setQty,
      clear,
      removeLines,
      selectedKeys,
      selectedLines,
      toggleSelected,
      setAllSelected,
      selectedCount,
      selectedSubtotal,
      selectedTotal,
      openCart,
      openCartAtCheckout,
      closeCart,
      initialStep,
      count,
      subtotal,
      deliveryPacks: config.deliveryPacks,
      deliveryPack,
      setDeliveryPackId,
      deliveryFee,
      total,
    }),
    [lines, isOpen, add, remove, setQty, clear, removeLines, selectedKeys, selectedLines, toggleSelected, setAllSelected, selectedCount, selectedSubtotal, selectedTotal, openCart, openCartAtCheckout, closeCart, initialStep, count, subtotal, config, deliveryPack, deliveryFee, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
