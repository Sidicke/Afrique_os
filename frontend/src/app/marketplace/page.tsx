import type { Metadata } from "next";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";
import MarketplaceHome from "@/components/marketplace/MarketplaceHome";

export const metadata: Metadata = {
  title: "Marketplace | ZennShop",
  description:
    "Découvrez les boutiques et produits de la plateforme : cherchez, filtrez par catégorie, ouvrez une boutique ou un produit, discutez avec les vendeurs ou commandez, sans compte obligatoire.",
};

/**
 * /marketplace — l'accueil commercial public de la plateforme.
 * Le landing (/) reste la présentation ; ici commence l'expérience d'achat.
 */
export default function MarketplacePage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="bg-ivory-50">
        <MarketplaceHome />
      </main>
      {/* Public : même footer que la landing page */}
      <Footer />
    </>
  );
}
