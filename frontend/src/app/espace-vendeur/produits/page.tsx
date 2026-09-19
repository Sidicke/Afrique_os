"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useProducts } from "@/hooks/useProducts";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { StockBadge } from "@/components/dashboard/ui/Badges";
import { MiniStat } from "@/components/dashboard/ui/MiniStat";
import { Toast } from "@/components/dashboard/ui/Toast";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { GridSkeleton } from "@/components/dashboard/ui/Skeleton";
import { SelectInput } from "@/components/dashboard/ui/Field";
import { Icon } from "@/components/dashboard/icons";
import { formatCurrency, cn } from "@/lib/utils";
import { ProductItem } from "@/types/dashboard";
import AssetImage from "@/components/ui/AssetImage";
import { routes } from "@/lib/urls/routes";
import { getBoutiqueSlug } from "@/lib/api/session";

type StockFilter = "all" | ProductItem["status"];

const STOCK_TABS: Array<{ value: StockFilter; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "in_stock", label: "En stock" },
  { value: "low_stock", label: "Stock bas" },
  { value: "out_of_stock", label: "Rupture" },
];

/** Priorité d'affichage : les produits qui demandent une action apparaissent en premier */
const STOCK_PRIORITY: Record<ProductItem["status"], number> = {
  out_of_stock: 0,
  low_stock: 1,
  in_stock: 2,
};

/** Bouton « Ajouter un produit » → le formulaire complet dédié */
function AddProductLink({ className }: { className?: string }) {
  return (
    <Link
      href="/espace-vendeur/produits/nouveau"
      className={cn(
        "flex items-center gap-2 rounded-xl bg-ink-950 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-ink-950/15 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-700/20 active:scale-95",
        className
      )}
    >
      <Icon name="plus" size={14} strokeWidth={2.2} /> Ajouter un produit
    </Link>
  );
}

export default function ProduitsPage() {
  const { data, loading } = useProducts();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const boutiqueSlug = getBoutiqueSlug() || "aziz-tech";

  // Toast « produit créé » après redirection depuis /produits/nouveau — lecture
  // pure à l'initialisation (StrictMode-safe), suppression de la clé au montage.
  const [toast, setToast] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return sessionStorage.getItem("product-created");
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.removeItem("product-created");
    } catch {
      // Stockage indisponible
    }
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.map((p) => p.category)));
  }, [data]);

  const brands = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.map((p) => p.brand).filter(Boolean)));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data
      .filter((p) => {
        const matchStock = stockFilter === "all" || p.status === stockFilter;
        const matchCat = category === "all" || p.category === category;
        const matchBrand = brand === "all" || p.brand === brand;
        const matchQuery =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q);
        return matchStock && matchCat && matchBrand && matchQuery;
      })
      .sort(
        (a, b) =>
          STOCK_PRIORITY[a.status] - STOCK_PRIORITY[b.status] ||
          b.salesCount - a.salesCount
      );
  }, [data, query, category, brand, stockFilter]);

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      inStock: list.filter((p) => p.status === "in_stock").length,
      lowStock: list.filter((p) => p.status === "low_stock").length,
      outOfStock: list.filter((p) => p.status === "out_of_stock").length,
    };
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Produits"
        description="Gérez votre catalogue : disponibilité, prix et stock, pour une vitrine toujours à jour."
        actions={<AddProductLink />}
      />

      {/* Bandeau de chiffres */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon="package" label="Produits" value={String(stats.total)} tone="gold" />
        <MiniStat icon="checkCircle" label="En stock" value={String(stats.inStock)} tone="green" />
        <MiniStat icon="alert" label="Stock bas" value={String(stats.lowStock)} tone="blue" />
        <MiniStat icon="x" label="Rupture" value={String(stats.outOfStock)} tone="terracotta" />
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
          {STOCK_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStockFilter(t.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors",
                stockFilter === t.value
                  ? "bg-blue-700 font-semibold text-white shadow-sm shadow-blue-700/20"
                  : "text-ink-600 hover:text-ink-950"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink-950 placeholder-ink-400 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <SelectInput
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full sm:w-44"
            aria-label="Filtrer par catégorie"
          >
            <option value="all">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectInput>
          <SelectInput
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full sm:w-44"
            aria-label="Filtrer par marque"
          >
            <option value="all">Toutes marques</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>

      {/* Grille catalogue */}
      {loading || !data ? (
        <GridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <DashboardCard>
          <EmptyState
            icon="package"
            title="Aucun produit trouvé"
            description="Modifiez vos filtres ou ajoutez un nouveau produit à votre catalogue."
            action={<AddProductLink />}
          />
        </DashboardCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <DashboardCard key={product.id} interactive className="group overflow-hidden">
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-ink-50">
                <AssetImage src={product.image} alt={product.name} sizes="(max-width: 768px) 100vw, 33vw" label="Produit" />
                <div className="absolute right-3 top-3">
                  <StockBadge product={product} />
                </div>
              </div>

              {/* Infos */}
              <div className="p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-gold-strong">
                  {product.category}
                  {product.brand ? <span className="text-ink-400"> · {product.brand}</span> : null}
                </p>
                <h3 className="mt-1 truncate font-display text-base font-semibold text-ink-950 transition-colors group-hover:text-gold-strong">
                  {product.name}
                </h3>

                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <p className="font-mono text-sm font-bold text-ink-950">{formatCurrency(product.priceFcfa)}</p>
                  <div className="flex items-center gap-3 text-[11px] text-ink-500">
                    <span className="flex items-center gap-1">
                      <Icon name="orders" size={12} /> {product.salesCount.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-gold-strong">
                      <Icon name="star" size={12} /> {product.rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Actions directes : Voir la fiche & Copier le lien unique */}
                <div className="mt-3 flex items-center gap-2 border-t border-line/60 pt-2.5">
                  <Link
                    href={routes.product(boutiqueSlug, product.slug || product.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-[11px] font-medium text-ink-700 transition-colors hover:border-gold-400 hover:text-ink-950"
                    title="Voir la fiche publique du produit"
                  >
                    <Icon name="external" size={12} />
                    <span>Voir en ligne</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const fullUrl = `${window.location.origin}${routes.product(boutiqueSlug, product.slug || product.id)}`;
                      navigator.clipboard.writeText(fullUrl);
                      setToast("Lien produit copié dans le presse-papier !");
                    }}
                    title="Copier le lien unique du produit"
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-[11px] font-medium text-ink-700 transition-colors hover:border-gold-400 hover:text-ink-950 cursor-pointer"
                  >
                    <Icon name="copy" size={12} />
                    <span>Lien</span>
                  </button>
                </div>
              </div>
            </DashboardCard>
          ))}
        </div>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
