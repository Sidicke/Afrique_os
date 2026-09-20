import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { formatPrice, productRating, productReviewCount, products, stockLabel, store } from "@/constants/store";
import CartProvider, { useCart } from "./CartProvider";
import ProductDetailProvider, { useProductDetail } from "./ProductDetail";

/** Bouton de test qui ouvre le modal pour un produit donné */
function OpenDetail({ productId }: { productId: string }) {
  const { open } = useProductDetail();
  const product = products.find((p) => p.id === productId)!;
  return (
    <button type="button" onClick={() => open(product)}>
      open-{productId}
    </button>
  );
}

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

function renderDetail() {
  return render(
    <CartProvider>
      <ProductDetailProvider>
        <OpenDetail productId="smartphone-pro" />
        <CartStatus />
      </ProductDetailProvider>
    </CartProvider>
  );
}

async function openModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "open-smartphone-pro" }));
}

// Les avis des visiteurs sont persistés : on isole chaque test
afterEach(() => {
  cleanup();
  try {
    window.localStorage?.clear();
  } catch {
    // ignore
  }
});

/** Remplit et publie un avis complet via le formulaire */
async function publishReview(
  user: ReturnType<typeof userEvent.setup>,
  { author = "Kouassi B.", comment = "Super produit, je recommande !" } = {}
) {
  await user.type(screen.getByLabelText("Votre nom"), author);
  await user.click(screen.getByRole("radio", { name: "Noter 5 étoiles" }));
  await user.type(screen.getByLabelText("Votre avis"), comment);
  await user.click(screen.getByRole("button", { name: "Publier mon avis" }));
}

describe("ProductDetail (modal produit)", () => {
  it("affiche la description, le prix FCFA et la note dynamique", async () => {
    const user = userEvent.setup();
    renderDetail();
    await openModal(user);

    const product = products[0];
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(product.name)).toBeInTheDocument();
    expect(screen.getByText(product.description)).toBeInTheDocument();
    expect(screen.getByText(formatPrice(product.price))).toBeInTheDocument();
    expect(
      screen.getByText(`(${productReviewCount(product.reviews)} avis)`)
    ).toBeInTheDocument();
    expect(screen.getByText(productRating(product.reviews).toFixed(1))).toBeInTheDocument();
  });

  it("propose toutes les variantes et sélectionne la première par défaut", async () => {
    const user = userEvent.setup();
    renderDetail();
    await openModal(user);

    const product = products[0];
    for (const variant of product.variants) {
      const chip = screen.getByRole("button", { name: variant.label });
      expect(chip).toBeInTheDocument();
    }

    const first = screen.getByRole("button", { name: product.variants[0].label });
    expect(first).toHaveAttribute("aria-pressed", "true");
  });

  it("affiche la liste des avis clients (dynamique)", async () => {
    const user = userEvent.setup();
    renderDetail();
    await openModal(user);

    const product = products[0];
    expect(screen.getByText(/Avis clients/)).toBeInTheDocument();
    for (const review of product.reviews) {
      expect(screen.getByText(review.author)).toBeInTheDocument();
      expect(screen.getByText(review.comment)).toBeInTheDocument();
    }
  });

  it("ajoute au panier avec la variante sélectionnée (modal reste ouvert)", async () => {
    const user = userEvent.setup();
    renderDetail();
    await openModal(user);

    const product = products[0];
    // On choisit la variante « Argent » puis on ajoute
    await user.click(screen.getByRole("button", { name: "Argent" }));
    await user.click(
      screen.getByRole("button", { name: "Ajouter au panier" })
    );

    expect(screen.getByText("Items: 1")).toBeInTheDocument();
    expect(screen.getByText(`Total: ${product.price}`)).toBeInTheDocument();
    // Le panier ne s'ouvre pas derrière le modal
    expect(screen.getByText("Open: false")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("« Commander » ajoute, ferme le modal et ouvre le panier", async () => {
    const user = userEvent.setup();
    renderDetail();
    await openModal(user);

    await user.click(screen.getByRole("button", { name: "Commander" }));

    expect(screen.getByText("Items: 1")).toBeInTheDocument();
    expect(screen.getByText("Open: true")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ferme le modal avec le bouton Fermer", async () => {
    const user = userEvent.setup();
    renderDetail();
    await openModal(user);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("affiche les mini-détails de confiance (stock, réf, livraison, garantie)", async () => {
    const user = userEvent.setup();
    renderDetail();
    await openModal(user);

    const product = products[0];
    expect(screen.getByText(product.sku, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(stockLabel(product.stock))).toBeInTheDocument();
    expect(screen.getByText(store.deliveryNote)).toBeInTheDocument();
    expect(screen.getByText(store.warrantyNote)).toBeInTheDocument();
    expect(screen.getByText(store.paymentNote)).toBeInTheDocument();
  });

  it("permet de publier un avis qui met à jour la note et le compteur", async () => {
    const user = userEvent.setup();
    renderDetail();
    await openModal(user);

    const product = products[0];
    const before = productReviewCount(product.reviews);

    // Le formulaire « Donner votre avis »
    await publishReview(user);

    // Feedback de succès + nouvel avis visible
    expect(screen.getByText(/Merci pour votre avis/)).toBeInTheDocument();
    expect(screen.getByText("Kouassi B.")).toBeInTheDocument();
    expect(screen.getByText("Super produit, je recommande !")).toBeInTheDocument();

    // Le compteur et la note se recalculent dynamiquement
    expect(screen.getByText(`(${before + 1} avis)`)).toBeInTheDocument();
    expect(screen.getByText("Avis clients (5)")).toBeInTheDocument();
  });

  it("conserve l'avis publié après un rechargement (localStorage)", async () => {
    const user = userEvent.setup();
    renderDetail();
    await openModal(user);
    await publishReview(user);
    expect(screen.getByText(/Merci pour votre avis/)).toBeInTheDocument();

    // Simule un rechargement : nouveau montage complet du provider
    cleanup();
    const user2 = userEvent.setup();
    renderDetail();
    await openModal(user2);

    expect(await screen.findByText("Kouassi B.")).toBeInTheDocument();
    expect(screen.getByText("Super produit, je recommande !")).toBeInTheDocument();
    // Le compteur intègre l'avis persisté (4 du catalogue + 1 visiteur)
    expect(screen.getByText("Avis clients (5)")).toBeInTheDocument();
  });

  it("permet de laisser un autre avis après le message de succès", async () => {
    const user = userEvent.setup();
    renderDetail();
    await openModal(user);

    await publishReview(user);
    expect(screen.getByText(/Merci pour votre avis/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Laisser un autre avis" }));

    // Le formulaire revient, prêt pour une nouvelle saisie
    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(screen.getByLabelText("Votre nom")).toHaveValue("");
  });

  it("signale une erreur si le formulaire d'avis est incomplet", async () => {
    const user = userEvent.setup();
    renderDetail();
    await openModal(user);

    // On publie sans nom ni note
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));

    expect(
      screen.getByText(/Merci de renseigner votre nom/)
    ).toBeInTheDocument();
  });
});
