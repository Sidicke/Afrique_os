import type { Metadata } from "next";
import { Suspense } from "react";
import CartProvider from "@/components/store/CartProvider";
import ProductDetailProvider from "@/components/store/ProductDetail";
import { AutoOpenProduct } from "@/components/store/AutoOpenProduct";
import StoreHeader from "@/components/store/StoreHeader";
import ProductGrid from "@/components/store/ProductGrid";
import StoreFooter from "@/components/store/StoreFooter";
import CartDrawer from "@/components/store/CartDrawer";
import { PublicShopLoader } from "@/components/store/PublicShopLoader";
import Container from "@/components/ui/Container";
import Link from "next/link";
import { IconArrowLeft } from "@/components/client/icons";

interface Props {
  params: Promise<{ boutiqueSlug: string; categorySlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boutiqueSlug, categorySlug } = await params;
  const catName = categorySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const storeName = boutiqueSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${catName} — ${storeName} | ZennShop`,
    description: `Découvrez la collection ${catName} de la boutique ${storeName}. Produits disponibles en direct.`,
    alternates: {
      canonical: `/b/${boutiqueSlug}/c/${categorySlug}`,
    },
  };
}

/**
 * Route Canonique Rayon Boutique : /b/:boutiqueSlug/c/:categorySlug
 * Filtrage RESTful par catégorie au sein de la boutique.
 */
export default async function BoutiqueCategoryPage({ params }: Props) {
  const { boutiqueSlug, categorySlug } = await params;
  const catName = categorySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const storeName = boutiqueSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <CartProvider>
      <ProductDetailProvider>
        <PublicShopLoader slug={boutiqueSlug} />
        <Suspense fallback={null}>
          <AutoOpenProduct />
        </Suspense>
        <StoreHeader />
        <main id="main-content" className="bg-white min-h-screen pt-24 pb-16">
          <Container className="px-5">
            {/* Fil d'Ariane */}
            <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-sm mb-8">
              <Link
                href={`/b/${boutiqueSlug}`}
                className="inline-flex items-center gap-1.5 font-semibold text-midnight-950/60 transition-colors hover:text-gold-700"
              >
                <IconArrowLeft className="h-4 w-4" />
                {storeName}
              </Link>
              <span className="text-midnight-950/25">/</span>
              <span className="font-semibold text-midnight-950/80">{catName}</span>
            </nav>

            <div className="mb-8">
              <h1 className="text-3xl font-display font-bold text-midnight-950">
                Rayon : {catName}
              </h1>
              <p className="text-sm text-midnight-950/60 mt-1">
                Tous les articles de la catégorie {catName} chez {storeName}.
              </p>
            </div>

            <ProductGrid />
          </Container>
        </main>
        <StoreFooter />
        <CartDrawer />
      </ProductDetailProvider>
    </CartProvider>
  );
}
