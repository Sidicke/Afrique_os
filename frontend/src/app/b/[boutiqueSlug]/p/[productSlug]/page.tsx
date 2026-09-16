import type { Metadata } from "next";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";
import ProductPage from "@/components/marketplace/ProductPage";

interface Props {
  params: Promise<{ boutiqueSlug: string; productSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boutiqueSlug, productSlug } = await params;
  const productName = productSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const storeName = boutiqueSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${productName} — ${storeName} | ZennShop`,
    description: `Achetez ${productName} chez ${storeName}. Prix garanti, livraison rapide, avis vérifiés et discussion directe avec le vendeur.`,
    alternates: {
      canonical: `/b/${boutiqueSlug}/p/${productSlug}`,
    },
    openGraph: {
      title: `${productName} | ${storeName}`,
      description: `Commandez ${productName} en direct sur la boutique ${storeName}.`,
      url: `/b/${boutiqueSlug}/p/${productSlug}`,
      type: "website",
    },
  };
}

/**
 * Route Canonique RESTful Fiche Produit : /b/:boutiqueSlug/p/:productSlug
 * L'identité du produit est indissociable de sa boutique d'origine.
 */
export default async function ScopedProductPage({ params }: Props) {
  const { boutiqueSlug, productSlug } = await params;

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-ivory-50">
        <ProductPage slug={productSlug} storeSlug={boutiqueSlug} />
      </main>
      <Footer />
    </>
  );
}
