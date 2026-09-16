import type { Metadata } from "next";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";
import ProductPage from "@/components/marketplace/ProductPage";

export const metadata: Metadata = {
  title: "Produit | ZennShop",
  description:
    "Fiche produit du marketplace : prix, variantes, disponibilité, avis, discussion avec le vendeur et commande sans compte.",
};

/**
 * /produit/:slug — lien profond direct vers un produit (règle marketplace :
 * un lien produit ouvre le produit, sans jamais passer par le landing).
 */
export default async function ProduitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-ivory-50">
        <ProductPage slug={slug} />
      </main>
      {/* Public : même footer que la landing page */}
      <Footer />
    </>
  );
}
