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

export const metadata: Metadata = {
  title: "Boutique | Afrique Commerce OS",
  description:
    "Découvrez la boutique et son catalogue : produits, livraison et discussion avec le vendeur.",
};

/**
 * Vitrine dynamique d'une boutique — /boutique/[slug].
 * La même coquille premium que `/boutique` (StoreHero, ProductGrid…), mais le
 * profil public (config + catalogue) est chargé par `PublicShopLoader` pour
 * le slug demandé. C'est LA page unique de la vitrine, quelle que soit la
 * boutique : on ne réinvente rien, on route vers l'existant.
 */
export default async function BoutiqueSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <CartProvider>
      <ProductDetailProvider>
        <PublicShopLoader slug={slug} />
        {/* ?product=<id> (flux Marketplace) → ouvre le produit dans le modal */}
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
