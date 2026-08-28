'use client';

import { setActiveBrand } from "@/lib/catalogueStore";
import { useCatalogueStore } from "@/lib/useCatalogueStore";
import { cn } from "@/lib/utils";
import { IconChevronRight } from "./icons";

/**
 * Section « Marques » de la vitrine (#marques) — les marques définies par le
 * vendeur (ex. Samsung, Apple, Anker…). Chaque carte filtre la grille produits
 * au clic (et défile jusqu'aux produits) ; re-cliquer désélectionne.
 */
export function MarquesSection() {
  const { brands, products, activeBrand } = useCatalogueStore();

  if (brands.length === 0) return null;

  const counts = new Map<string, number>();
  for (const product of products) {
    if (product.brand) counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
  }

  const select = (brand: string) => {
    setActiveBrand(activeBrand === brand ? null : brand);
    document
      .getElementById("produits")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="marques" className="mx-auto max-w-screen-2xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-600">
            Marques
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-midnight-950 sm:text-3xl">
            Explorez nos marques
          </h2>
          <p className="mt-1 text-sm text-midnight-950/50">
            Une marque sélectionnée filtre les produits ci-dessous.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {brands.map((brand) => {
          const active = activeBrand === brand;
          const count = counts.get(brand) ?? 0;
          return (
            <button
              key={brand}
              type="button"
              onClick={() => select(brand)}
              aria-pressed={active}
              className={cn(
                "group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left transition-all duration-300",
                active
                  ? "border-gold-400 bg-midnight-950 text-gold-300 shadow-lg shadow-midnight-950/10"
                  : "border-midnight-950/10 bg-white hover:-translate-y-0.5 hover:border-gold-400/60 hover:shadow-md"
              )}
            >
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate font-display text-lg font-bold",
                    active ? "text-gold-300" : "text-midnight-950"
                  )}
                >
                  {brand}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block font-mono text-[10px] uppercase tracking-wider",
                    active ? "text-gold-300/70" : "text-midnight-950/40"
                  )}
                >
                  {count} produit{count > 1 ? "s" : ""}
                </span>
              </span>
              <IconChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5",
                  active ? "text-gold-300" : "text-midnight-950/30"
                )}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default MarquesSection;
