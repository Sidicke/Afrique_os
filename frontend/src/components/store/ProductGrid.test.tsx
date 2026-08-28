import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { products } from "@/constants/store";
import CartProvider from "./CartProvider";
import ProductDetailProvider from "./ProductDetail";
import ProductGrid from "./ProductGrid";

/** La grille rend des ProductCard qui dépendent du panier ET du modal de détail */
function renderGrid() {
  return render(
    <CartProvider>
      <ProductDetailProvider>
        <ProductGrid />
      </ProductDetailProvider>
    </CartProvider>
  );
}

describe("ProductGrid", () => {
  it("affiche tous les produits par défaut (catégorie « Tous »)", () => {
    renderGrid();

    for (const product of products) {
      expect(screen.getByText(product.name)).toBeInTheDocument();
    }
  });

  it("filtre la grille quand une catégorie est sélectionnée", async () => {
    const user = userEvent.setup();
    renderGrid();

    await user.click(screen.getByRole("button", { name: "Audio" }));

    // Seuls les produits Audio restent visibles
    const audioProducts = products.filter((p) => p.category === "Audio");
    const otherProducts = products.filter((p) => p.category !== "Audio");

    for (const product of audioProducts) {
      expect(screen.getByText(product.name)).toBeInTheDocument();
    }
    for (const product of otherProducts) {
      expect(screen.queryByText(product.name)).not.toBeInTheDocument();
    }
  });

  it("revient à l'affichage complet en recliquant sur « Tous »", async () => {
    const user = userEvent.setup();
    renderGrid();

    await user.click(screen.getByRole("button", { name: "Audio" }));
    await user.click(screen.getByRole("button", { name: "Tous" }));

    for (const product of products) {
      expect(screen.getByText(product.name)).toBeInTheDocument();
    }
  });
});
