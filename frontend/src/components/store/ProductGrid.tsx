'use client';

import { useState, useMemo } from 'react';
import { getPromotion } from '@/lib/shopConfig';
import { useCatalogueStore } from '@/lib/useCatalogueStore';
import { setActiveBrand } from '@/lib/catalogueStore';
import { useShopConfig } from '@/lib/useShopConfig';
import { ProductCard } from './ProductCard';
import { cn } from '@/lib/utils';
import { IconChevronLeft, IconChevronRight, IconClose } from './icons';

export function ProductGrid() {
  // Produits + catégories : chargés depuis l'API (repli sur la démo hors-ligne)
  const catalogue = useCatalogueStore();
  const { products, categories, brands, activeBrand } = catalogue;
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const config = useShopConfig();

  // Filtres de la barre latérale — « Tous » puis les catégories réelles
  const categoryFilters = useMemo(
    () => [
      { label: 'Tous les produits', value: 'Tous' },
      ...categories
        .filter((c) => c !== 'Tous')
        .map((c) => ({ label: c, value: c })),
    ],
    [categories]
  );

  // Additional filters for sidebar
  const [filters, setFilters] = useState({
    newArrival: false,
    bestSeller: false,
    onDiscount: false,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const filteredProducts = useMemo(() => {
    return products.filter((product, index) => {
      if (activeCategory !== 'Tous' && product.category !== activeCategory) return false;
      // Filtre marque — sélectionné depuis la section « Marques » ou la sidebar
      if (activeBrand && product.brand !== activeBrand) return false;
      // Le filtre « En promotion » reflète la config active
      if (filters.onDiscount && !getPromotion(config, product.id)) return false;
      // Filtre « Nouveautés » : créés récemment (ou récents dans le catalogue)
      if (filters.newArrival) {
        if (product.createdAt) {
          const isRecent = Date.now() - new Date(product.createdAt).getTime() <= 45 * 24 * 60 * 60 * 1000;
          if (!isRecent) return false;
        } else if (index >= Math.ceil(products.length / 2)) {
          return false;
        }
      }
      // Filtre « Meilleures ventes » : ventes enregistrées ou produit vedette
      if (filters.bestSeller) {
        const isBestSeller = (product.salesCount && product.salesCount > 0) || product.isFeatured;
        if (!isBestSeller) return false;
      }
      return true;
    });
  }, [products, activeCategory, activeBrand, filters, config]);

  // Reset à la page 1 si les filtres changent
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const resetBrand = () => setActiveBrand(null);

  return (
    <section id="produits" className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar - Desktop Only */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <h2 className="text-xl font-bold text-gray-900">Catégorie</h2>
          
          <div className="mt-6 space-y-4">
            {categoryFilters.map(({ label, value }) => (
              <label key={value} className="flex cursor-pointer items-center space-x-3 group">
                <input
                  type="radio"
                  name="category_sidebar"
                  checked={activeCategory === value}
                  onChange={() => setActiveCategory(value)}
                  className="h-4 w-4 border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-black">{label}</span>
              </label>
            ))}
          </div>

          <hr className="my-6 border-gray-200" />

          {/* Marques — définies par le vendeur, filtrent la grille */}
          {brands.length > 0 && (
            <>
              <h2 className="text-xl font-bold text-gray-900">Marques</h2>
              <div className="mt-4 space-y-2">
                {brands.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setActiveBrand(activeBrand === brand ? null : brand)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition-colors",
                      activeBrand === brand
                        ? "bg-gold-400/15 text-midnight-950"
                        : "text-gray-700 hover:bg-gold-400/10 hover:text-black"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-colors",
                        activeBrand === brand ? "bg-gold-600" : "bg-gray-300"
                      )}
                    />
                    {brand}
                  </button>
                ))}
              </div>
              <hr className="my-6 border-gray-200" />
            </>
          )}

          <div className="space-y-4">
            <label className="flex cursor-pointer items-center space-x-3 group">
              <input
                type="checkbox"
                checked={filters.newArrival}
                onChange={(e) => setFilters(f => ({ ...f, newArrival: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 group-hover:text-black">Nouveautés</span>
            </label>
            <label className="flex cursor-pointer items-center space-x-3 group">
              <input
                type="checkbox"
                checked={filters.bestSeller}
                onChange={(e) => setFilters(f => ({ ...f, bestSeller: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 group-hover:text-black">Meilleures ventes</span>
            </label>
            <label className="flex cursor-pointer items-center space-x-3 group">
              <input
                type="checkbox"
                checked={filters.onDiscount}
                onChange={(e) => setFilters(f => ({ ...f, onDiscount: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 group-hover:text-black">En promotion</span>
            </label>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Top category pills */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "rounded-full px-5 py-2 text-sm font-medium transition-colors border border-transparent cursor-pointer",
                    activeCategory === cat
                      ? "bg-midnight-950 text-gold-300"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gold-400/60 hover:bg-gold-400/10"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <a href="#produits" className="hidden text-sm font-semibold text-gold-600 hover:text-gold-500 hover:underline sm:block">
              Voir tous les produits
            </a>
          </div>

          {/* Chip marque active + filtre rapide — mobile (sidebar desktop à gauche) */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {activeBrand && (
              <button
                type="button"
                onClick={resetBrand}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold-500 bg-gold-400/15 px-3.5 py-1.5 text-xs font-semibold text-midnight-950 transition-colors hover:bg-gold-400/25 cursor-pointer"
              >
                <IconClose className="h-3 w-3" />
                Marque : {activeBrand}
              </button>
            )}
            <div className="ml-auto lg:hidden">
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, onDiscount: !f.onDiscount }))}
                aria-pressed={filters.onDiscount}
                className={cn(
                  "inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  filters.onDiscount
                    ? "border-gold-500 bg-gold-400/15 text-midnight-950"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gold-400/60 hover:bg-gold-400/10"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    filters.onDiscount ? "bg-gold-600" : "bg-gray-300"
                  )}
                />
                En promotion
              </button>
            </div>
          </div>

          {/* Grid ou État vide */}
          {paginatedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
              <p className="font-display text-lg font-bold text-midnight-950">Aucun produit trouvé</p>
              <p className="mt-1 text-sm text-gray-500 max-w-sm">
                Aucun article ne correspond à votre sélection pour le moment.
              </p>
              {(activeCategory !== 'Tous' || activeBrand || filters.newArrival || filters.bestSeller || filters.onDiscount) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('Tous');
                    setActiveBrand(null);
                    setFilters({ newArrival: false, bestSeller: false, onDiscount: false });
                  }}
                  className="mt-4 rounded-full bg-midnight-950 px-5 py-2 text-xs font-semibold text-gold-300 hover:bg-midnight-900 transition-colors cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination Réelle */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center space-x-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <IconChevronLeft className="h-4 w-4" />
                <span>Précédent</span>
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "min-w-[32px] h-8 rounded-lg px-2 text-sm font-medium transition-colors cursor-pointer",
                      currentPage === page
                        ? "bg-midnight-950 text-gold-300 font-bold"
                        : "text-gray-600 hover:bg-gold-400/10 hover:text-midnight-950"
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Suivant</span>
                <IconChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ProductGrid;
