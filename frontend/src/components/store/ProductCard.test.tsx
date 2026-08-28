import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { formatPrice, productRating, productReviewCount, products, stockLabel } from "@/constants/store";
import CartProvider, { useCart } from "./CartProvider";
import ProductDetailProvider from "./ProductDetail";
import ProductCard from "./ProductCard";

// Store catalogue : boutique chargée (boutiqueId présent → lien « Discuter »)
vi.mock("@/lib/useCatalogueStore", () => ({
  useCatalogueStore: () => ({
    boutiqueId: "b-test",
    boutiqueSlug: "aziz-tech",
    products: [],
    categories: [],
    loaded: true,
    loading: false,
    error: null,
  }),
}));

/** Harnais qui lit l'état du panier pour pouvoir l'asserter */
function CartStatus() {
  const { count, total, isOpen } = useCart();
  return (
    <div>
      <span>Items: {count}</span>
      <span>Total: {total}</span>
      <span>Open: {String(isOpen)}</span>
    </div>
  );
}

const product = products[0];

/** ProductCard dépend du panier ET du modal de détail */
function renderCard() {
  return render(
    <CartProvider>
      <ProductDetailProvider>
        <ProductCard product={product} />
        <CartStatus />
      </ProductDetailProvider>
    </CartProvider>
  );
}

describe("ProductCard", () => {
  it("affiche le nom, la catégorie, la note dynamique, les avis, le stock et le prix FCFA", () => {
    renderCard();

    expect(screen.getByText(product.name)).toBeInTheDocument();
    expect(screen.getByText(product.category)).toBeInTheDocument();
    expect(screen.getByText(productRating(product.reviews).toFixed(1))).toBeInTheDocument();
    expect(
      screen.getByText(`(${productReviewCount(product.reviews)} avis)`)
    ).toBeInTheDocument();
    expect(screen.getByText(stockLabel(product.stock))).toBeInTheDocument();
    expect(screen.getByText(formatPrice(product.price))).toBeInTheDocument();
  });

  it("affiche une image du produit (alt descriptif)", () => {
    renderCard();

    const image = screen.getByRole("img", { name: product.name });
    expect(image).toHaveAttribute("src", product.image);
  });

  it("ajoute le produit au panier via l'icône panier", async () => {
    const user = userEvent.setup();
    renderCard();

    expect(screen.getByText("Items: 0")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: `Ajouter ${product.name} au panier` })
    );

    expect(screen.getByText("Items: 1")).toBeInTheDocument();
    expect(screen.getByText(`Total: ${product.price}`)).toBeInTheDocument();
    expect(screen.getByText("Open: true")).toBeInTheDocument();
  });

  it("ajoute le produit et ouvre le panier au clic sur « Commander »", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Commander" }));

    expect(screen.getByText("Items: 1")).toBeInTheDocument();
    expect(screen.getByText("Open: true")).toBeInTheDocument();
  });

  it("ouvre le modal de détails quand on clique sur la carte", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(
      screen.getByRole("button", { name: `Voir les détails de ${product.name}` })
    );

    // Le modal affiche la description, les variantes et les avis
    // (on cible le dialog car la description est aussi visible sur la carte)
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(product.description)).toBeInTheDocument();
    expect(within(dialog).getByText(/Avis clients/)).toBeInTheDocument();
    expect(within(dialog).getByText(product.reviews[0].author)).toBeInTheDocument();
  });

  it("propose « Discuter » : mène à la conversation dans Mes discussions, sur CE produit", () => {
    renderCard();

    const discuss = screen.getByRole("link", { name: /Discuter/ });
    // Le lien mène à l'espace client (création/réutilisation de la
    // conversation), avec le contexte complet du produit (boutique, id,
    // nom, prix, description, image)
    expect(discuss).toHaveAttribute(
      "href",
      expect.stringContaining("/espace-client/discussions/nouvelle")
    );
    expect(discuss).toHaveAttribute(
      "href",
      expect.stringContaining(`boutique=b-test`)
    );
    expect(discuss).toHaveAttribute(
      "href",
      expect.stringContaining(`productId=${encodeURIComponent(product.id)}`)
    );
    expect(discuss).toHaveAttribute(
      "href",
      expect.stringContaining(`name=${encodeURIComponent(product.name)}`)
    );
    expect(discuss).toHaveAttribute(
      "href",
      expect.stringContaining(`price=${encodeURIComponent(String(product.price))}`)
    );
    expect(discuss).toHaveAttribute(
      "href",
      expect.stringContaining(`img=${encodeURIComponent(product.image)}`)
    );
  });
});
