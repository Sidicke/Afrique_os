import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";
import SearchResults from "@/components/marketplace/SearchResults";

export const metadata: Metadata = {
  title: "Recherche | ZennShop",
  description:
    "Recherchez des produits, des boutiques et des catégories sur le marketplace ZennShop — électronique, mode, beauté, artisanat africain et bien plus.",
  openGraph: {
    title: "Recherche — ZennShop Marketplace",
    description:
      "Trouvez les meilleurs produits et boutiques africains en quelques secondes.",
    type: "website",
  },
};

/**
 * Skeleton Suspense — reflète fidèlement la mise en page réelle
 * pour éviter le layout shift (CLS) au chargement.
 */
function SearchFallback() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 h-4 w-28 animate-pulse rounded-full bg-midnight-950/8" />

      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-3 w-36 animate-pulse rounded-full bg-gold-400/30" />
        <div className="h-9 w-72 animate-pulse rounded-2xl bg-midnight-950/8" />
        <div className="h-4 w-48 animate-pulse rounded-full bg-midnight-950/6" />
      </div>

      {/* Barre de recherche skeleton */}
      <div className="mt-8 h-12 w-full max-w-2xl animate-pulse rounded-2xl border border-midnight-950/8 bg-white shadow-sm" />

      {/* Section boutiques skeleton */}
      <div className="mt-14 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-24 animate-pulse rounded-full bg-midnight-950/8" />
          <div className="h-5 w-8 animate-pulse rounded-full bg-gold-400/20" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-3xl border border-midnight-950/8 bg-white"
            >
              <div className="h-36 bg-midnight-950/6" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-3/4 rounded-xl bg-midnight-950/8" />
                <div className="h-3 w-full rounded-full bg-midnight-950/6" />
                <div className="h-3 w-2/3 rounded-full bg-midnight-950/6" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Séparateur */}
      <div className="my-10 border-t border-midnight-950/8" />

      {/* Section produits skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-24 animate-pulse rounded-full bg-midnight-950/8" />
          <div className="h-5 w-8 animate-pulse rounded-full bg-gold-400/20" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-3xl border border-midnight-950/8 bg-white"
            >
              <div className="aspect-square bg-midnight-950/6" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded-xl bg-midnight-950/8" />
                <div className="h-3 w-1/2 rounded-full bg-midnight-950/6" />
                <div className="h-4 w-1/3 rounded-full bg-gold-400/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RecherchePage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-ivory-50">
        <Suspense fallback={<SearchFallback />}>
          <SearchResults />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
