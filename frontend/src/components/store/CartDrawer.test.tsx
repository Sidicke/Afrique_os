import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { products } from "@/constants/store";
import { resetShopConfig, updateShopConfig } from "@/lib/shopConfig";
import CartProvider, { useCart } from "./CartProvider";
import CartDrawer from "./CartDrawer";

/** Bouton de test qui ajoute un produit puis ouvre le panier */
function AddProduct({ productId }: { productId: string }) {
  const { add, openCart } = useCart();
  const product = products.find((p) => p.id === productId)!;
  return (
    <button
      type="button"
      onClick={() => {
        add(product);
        openCart();
      }}
    >
      add-{productId}
    </button>
  );
}

/** Bouton de test qui ouvre le tiroir sans rien ajouter */
function OpenCartButton() {
  const { openCart } = useCart();
  return (
    <button type="button" onClick={openCart}>
      open-cart
    </button>
  );
}

function renderDrawer() {
  return render(
    <CartProvider>
      <AddProduct productId="smartphone-pro" />
      <OpenCartButton />
      <CartDrawer />
    </CartProvider>
  );
}

/** Sélectionne le pack Premium puis passe à l'étape coordonnées */
async function goToCheckout(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "add-smartphone-pro" }));
  const premiumBtn = screen.getByRole("button", { name: /Premium.*5 000 FCFA/ });
  await user.click(premiumBtn);
  await user.click(screen.getByRole("button", { name: "Passer la commande" }));
}

describe("CartDrawer", () => {
  // Chaque test repart d'une config propre (sans numéro WhatsApp par défaut)
  afterEach(() => {
    resetShopConfig();
    vi.useRealTimers();
  });

  it("affiche l'état vide avec une invitation à voir les produits", async () => {
    const user = userEvent.setup();
    renderDrawer();

    // Le tiroir n'apparaît qu'une fois ouvert
    await user.click(screen.getByRole("button", { name: "open-cart" }));

    expect(screen.getByText("Votre panier est vide")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Voir les produits" })
    ).toBeInTheDocument();
  });

  it("affiche le produit ajouté avec sa variante et le prix FCFA", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "add-smartphone-pro" }));

    expect(screen.getByText("Smartphone Pro")).toBeInTheDocument();
    expect(screen.getByText("Noir")).toBeInTheDocument(); // première variante
    // Le prix de la ligne, le sous-total et le total affichent tous 350 000 FCFA
    const prices = screen.getAllByText("350 000 FCFA");
    expect(prices.length).toBeGreaterThanOrEqual(2);
  });

  it("permet de retirer une ligne du panier", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "add-smartphone-pro" }));
    expect(screen.getByText("Smartphone Pro")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Retirer Smartphone Pro" })
    );

    expect(screen.queryByText("Smartphone Pro")).not.toBeInTheDocument();
    expect(screen.getByText("Votre panier est vide")).toBeInTheDocument();
  });

  it("propose les packs de livraison et interdit la commande sans choix", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "add-smartphone-pro" }));

    // Le sélecteur de livraison est visible
    expect(screen.getByText("Mode de livraison")).toBeInTheDocument();
    expect(screen.getByText("Obligatoire")).toBeInTheDocument();
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();

    // Tenter de passer commande sans choisir la livraison → message d'erreur
    await user.click(screen.getByRole("button", { name: "Passer la commande" }));
    expect(
      screen.getByText("Veuillez choisir un mode de livraison avant de continuer.")
    ).toBeInTheDocument();
  });

  it("permet de sélectionner un pack et d'atteindre l'étape coordonnées", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "add-smartphone-pro" }));

    // Choisir le pack Premium (le nom accessible inclut badge + description + prix)
    const premiumBtn = screen.getByRole("button", { name: /Premium.*5 000 FCFA/ });
    await user.click(premiumBtn);

    // Passer à l'étape coordonnées
    await user.click(screen.getByRole("button", { name: "Passer la commande" }));

    // L'étape coordonnées est visible (le paiement vient APRÈS la commande)
    expect(screen.getByText("Vos coordonnées")).toBeInTheDocument();
    expect(screen.getByText("Récapitulatif")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmer la commande" })
    ).toBeInTheDocument();
  });

  it("ne propose plus WhatsApp ni le paiement à la livraison", async () => {
    updateShopConfig({ whatsappNumber: "+2250700000000" });
    const user = userEvent.setup();
    renderDrawer();
    await goToCheckout(user);

    // WhatsApp a disparu du checkout (canal principal = messagerie interne)
    expect(
      screen.queryByRole("link", { name: "Commander sur WhatsApp" })
    ).not.toBeInTheDocument();

    // Le paiement à la livraison n'est plus proposé non plus
    expect(
      screen.queryByText("Paiement à la livraison")
    ).not.toBeInTheDocument();

    // Seuls Mobile Money et Carte sont proposés — choix à l'étape coordonnées,
    // la commande est créée AVEC le moyen sélectionné
    expect(screen.getByRole("button", { name: /Mobile Money/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Carte bancaire/ })).toBeInTheDocument();
  });

  it("refuse la confirmation sans numéro de téléphone", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await goToCheckout(user);

    await user.click(screen.getByRole("button", { name: "Confirmer la commande" }));

    expect(
      screen.getByText(
        "Merci de renseigner votre numéro de téléphone pour confirmer la commande."
      )
    ).toBeInTheDocument();
  });

  it("confirme le paiement Mobile Money : états puis statut Payée", async () => {
    // Timers RÉELS : la simulation de paiement dure ~3,6 s, on attend la fin
    // via findByText (timeout généreux).
    const user = userEvent.setup();
    renderDrawer();
    await goToCheckout(user);

    // Coordonnées (le téléphone est obligatoire) — Mobile Money est le défaut
    await user.type(screen.getByLabelText("Votre téléphone"), "+2250700000000");

    // Confirmation → étape paiement (Mobile Money par défaut)
    await user.click(screen.getByRole("button", { name: "Confirmer la commande" }));
    expect(screen.getByText("Paiement sécurisé")).toBeInTheDocument();

    // Numéro Mobile Money requis (pas de compte pré-rempli dans ce test)
    await user.type(screen.getByLabelText("Numéro Mobile Money"), "+2250700000001");

    // Lancer le paiement → états animés puis confirmation réelle (PAID)
    await user.click(screen.getByRole("button", { name: /Payer/ }));

    // Premier état de la simulation
    expect(
      screen.getByText("Envoi de la demande de paiement…")
    ).toBeInTheDocument();

    // Statut réel : Payée (le backend/repli local confirme le paiement)
    expect(
      await screen.findByText("Paiement confirmé !", {}, { timeout: 10000 })
    ).toBeInTheDocument();
    expect(screen.getByText("Payée")).toBeInTheDocument();
    expect(screen.getByText("Mobile Money")).toBeInTheDocument();
  });
});
