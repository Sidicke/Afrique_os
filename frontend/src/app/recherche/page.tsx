import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";
import SearchResults from "@/components/marketplace/SearchResults";

export const metadata: Metadata = {
  title: "Recherche | Afrique Commerce OS",
  description:
    "Recherchez des produits, des boutiques et des catégories sur le marketplace Afrique Commerce.",
};

/** Repli léger pendant le chargement des résultats (Suspense) */
function SearchFallback() {
  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-12 px-5 pb-14 pt-16 sm:pt-20 md:pb-20">
      <div className="h-8 w-64 animate-pulse rounded-2xl border border-midnight-950/8 bg-white" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-3xl border border-midnight-950/8 bg-white"
          />
        ))}
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
      {/* Public : même footer que la landing page */}
      <Footer />
    </>
  );
}
