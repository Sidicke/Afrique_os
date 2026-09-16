import type { Metadata } from "next";
import { Suspense } from "react";
import CartProvider from "@/components/store/CartProvider";
import ProductDetailProvider from "@/components/store/ProductDetail";
import { AutoOpenProduct } from "@/components/store/AutoOpenProduct";
import StoreHeader from "@/components/store/StoreHeader";
import StoreHero from "@/components/store/StoreHero";
import ProductGrid from "@/components/store/ProductGrid";
import MarquesSection from "@/components/store/MarquesSection";
import VideoSection from "@/components/store/VideoSection";
import FeaturedProduct from "@/components/store/FeaturedProduct";
import ExploreCategories from "@/components/store/ExploreCategories";
import { Newsletter } from "@/components/store/Newsletter";
import StoreFooter from "@/components/store/StoreFooter";
import CartDrawer from "@/components/store/CartDrawer";
import { PublicShopLoader } from "@/components/store/PublicShopLoader";

interface Props {
  params: Promise<{ boutiqueSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boutiqueSlug } = await params;
  const capitalized = boutiqueSlug.charAt(0).toUpperCase() + boutiqueSlug.slice(1).replace(/-/g, " ");
  return {
    title: `${capitalized} | ZennShop`,
    description: `Découvrez la vitrine officielle de ${capitalized} : produits authentiques, livraison rapide et service client direct.`,
    alternates: {
      canonical: `/b/${boutiqueSlug}`,
    },
    openGraph: {
      title: `${capitalized} — Vitrine Officielle`,
      description: `Achetez directement auprès de ${capitalized} sur ZennShop.`,
      url: `/b/${boutiqueSlug}`,
      type: "website",
    },
  };
}

/**
 * Route Canonique Vitrine Boutique : /b/:boutiqueSlug
 * Architecture modulaire RESTful pour l'identité des boutiques.
 */
export default async function BoutiqueVitrinePage({ params }: Props) {
  const { boutiqueSlug } = await params;

  return (
    <CartProvider>
      <ProductDetailProvider>
        <PublicShopLoader slug={boutiqueSlug} />
        {/* ?product=<id> → auto-ouverture modal produit */}
        <Suspense fallback={null}>
          <AutoOpenProduct />
        </Suspense>
        <StoreHeader />
        <main id="main-content" className="bg-white min-h-screen">
          <StoreHero />
          <MarquesSection />
          <ProductGrid />
          <VideoSection />
          <FeaturedProduct />
          <ExploreCategories />
          <Newsletter />
        </main>
        <StoreFooter />
        <CartDrawer />
      </ProductDetailProvider>
    </CartProvider>
  );
}
