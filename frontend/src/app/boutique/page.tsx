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
import { store } from "@/constants/store";

export const metadata: Metadata = {
  title: `${store.name} · ${store.tagline} | Afrique Commerce OS`,
  description: store.description,
};

/**
 * Page boutique « Aziz Tech » — vitrine e-commerce branchée sur le backend :
 * le profil public (config + catalogue) est chargé depuis l'API par
 * `PublicShopLoader` (repli sur la démo si le backend est injoignable).
 */
export default function BoutiquePage() {
  return (
    <CartProvider>
      <ProductDetailProvider>
        <PublicShopLoader slug="aziz-tech" />
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
