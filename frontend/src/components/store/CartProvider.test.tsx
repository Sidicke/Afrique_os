import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { products } from "@/constants/store";
import CartProvider, { useCart } from "./CartProvider";

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

const smartphone = products[0];

describe("CartProvider", () => {
  it("démarre avec un panier vide, fermé et à zéro", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.lines).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.total).toBe(0);
    expect(result.current.isOpen).toBe(false);
  });

  it("ajoute un produit avec la première variante par défaut (sans ouvrir le panier)", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].variant.id).toBe(smartphone.variants[0].id);
    expect(result.current.lines[0].qty).toBe(1);
    expect(result.current.count).toBe(1);
    // Smartphone Pro n'a pas de promo, prix normal
    expect(result.current.total).toBe(smartphone.price);
    // L'ajout n'ouvre plus le panier : l'appelant décide (icône, Commander…)
    expect(result.current.isOpen).toBe(false);
  });

  it("incrémente la quantité quand le même produit+variante est ajouté deux fois", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone, smartphone.variants[0]));
    act(() => result.current.add(smartphone, smartphone.variants[0]));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].qty).toBe(2);
    expect(result.current.count).toBe(2);
    // Smartphone Pro n'a pas de promo, prix normal
    expect(result.current.total).toBe(smartphone.price * 2);
  });

  it("crée deux lignes distinctes pour deux variantes du même produit", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone, smartphone.variants[0]));
    act(() => result.current.add(smartphone, smartphone.variants[1]));

    expect(result.current.lines).toHaveLength(2);
    expect(new Set(result.current.lines.map((l) => l.key)).size).toBe(2);
    expect(result.current.count).toBe(2);
  });

  it("ajoute deux produits distincts comme deux lignes séparées", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(products[0]));
    act(() => result.current.add(products[1]));

    expect(result.current.lines).toHaveLength(2);
    expect(result.current.count).toBe(2);
    // Le second produit (ecouteurs-sans-fil) a une promo -20% active, donc
    // son prix est remisé : 350 000 + 36 000 = 386 000
    const expected = products[0].price + Math.round(products[1].price * 0.8);
    expect(result.current.total).toBe(expected);
  });

  it("retire une ligne du panier par sa clé", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(products[0]));
    act(() => result.current.add(products[1]));
    const key = result.current.lines[0].key;
    act(() => result.current.remove(key));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].product.id).toBe(products[1].id);
  });

  it("met à jour la quantité d'une ligne existante", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone));
    const key = result.current.lines[0].key;
    act(() => result.current.setQty(key, 3));

    expect(result.current.lines[0].qty).toBe(3);
    expect(result.current.count).toBe(3);
    // Smartphone Pro n'a pas de promo, prix normal
    expect(result.current.total).toBe(smartphone.price * 3);
  });

  it("ignore les quantités inférieures à 1 (protection)", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone));
    const key = result.current.lines[0].key;
    act(() => result.current.setQty(key, 0));
    act(() => result.current.setQty(key, -2));

    expect(result.current.lines[0].qty).toBe(1);
  });

  it("vide entièrement le panier", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(products[0]));
    act(() => result.current.add(products[1]));
    act(() => result.current.clear());

    expect(result.current.lines).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it("ouvre et ferme le panier indépendamment des ajouts", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.openCart());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.closeCart());
    expect(result.current.isOpen).toBe(false);
  });

  it("lève une erreur explicite quand il est utilisé hors du provider", () => {
    expect(() => renderHook(() => useCart())).toThrow(/CartProvider/);
  });
});

/**
 * Paiement PARTIEL : le client peut ne commander qu'une partie de son
 * panier. La sélection détermine ce qui est commandé ET ce qui reste.
 */
describe("CartProvider — sélection partielle", () => {
  it("sélectionne tout le panier par défaut", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone));
    act(() => result.current.add(products[1]));

    expect(result.current.selectedKeys).toHaveLength(2);
    expect(result.current.selectedLines).toHaveLength(2);
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.selectedSubtotal).toBe(result.current.subtotal);
  });

  it("décoche une ligne : elle sort de la sélection et du sous-total", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone));
    act(() => result.current.add(products[1]));
    const key = result.current.lines[0].key;
    const priceOfFirst = result.current.lines[0].qty * smartphone.price;

    act(() => result.current.toggleSelected(key));

    expect(result.current.selectedKeys).not.toContain(key);
    expect(result.current.selectedLines).toHaveLength(1);
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.selectedSubtotal).toBe(
      result.current.subtotal - priceOfFirst
    );
    // La ligne reste dans le panier : elle n'a pas été achetée
    expect(result.current.lines).toHaveLength(2);
  });

  it("recoche une ligne décochée", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone));
    const key = result.current.lines[0].key;
    act(() => result.current.toggleSelected(key));
    expect(result.current.selectedKeys).toHaveLength(0);

    act(() => result.current.toggleSelected(key));
    expect(result.current.selectedKeys).toContain(key);
    expect(result.current.selectedCount).toBe(1);
  });

  it("décoche tout puis recoche tout", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone));
    act(() => result.current.add(products[1]));

    act(() => result.current.setAllSelected(false));
    expect(result.current.selectedKeys).toHaveLength(0);
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedSubtotal).toBe(0);

    act(() => result.current.setAllSelected(true));
    expect(result.current.selectedKeys).toHaveLength(2);
    expect(result.current.selectedCount).toBe(2);
  });

  it("retire du panier UNIQUEMENT les articles achetés", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone));
    act(() => result.current.add(products[1]));
    const boughtKey = result.current.lines[0].key;

    // Paiement partiel : seul le premier article a été commandé
    act(() => result.current.removeLines([boughtKey]));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].product.id).toBe(products[1].id);
    // Le reste du panier est conservé et toujours sélectionnable
    expect(result.current.selectedKeys).toHaveLength(1);
    expect(result.current.selectedCount).toBe(1);
  });

  it("un article ajouté est sélectionné automatiquement", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone));
    const key = result.current.lines[0].key;

    act(() => result.current.toggleSelected(key));
    expect(result.current.selectedKeys).toHaveLength(0);

    // Ré-ajouter le même produit (donc même clé) le re-sélectionne
    act(() => result.current.add(smartphone));
    expect(result.current.selectedKeys).toContain(key);
  });

  it("retirer une ligne du panier la retire aussi de la sélection", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone));
    act(() => result.current.add(products[1]));
    const key = result.current.lines[0].key;

    act(() => result.current.remove(key));

    expect(result.current.selectedKeys).not.toContain(key);
    expect(result.current.selectedKeys).toHaveLength(1);
  });

  it("vider le panier vide aussi la sélection", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(smartphone));
    act(() => result.current.clear());

    expect(result.current.selectedKeys).toHaveLength(0);
    expect(result.current.selectedLines).toHaveLength(0);
    expect(result.current.selectedCount).toBe(0);
  });
});
