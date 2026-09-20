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
import { useSession } from "@/lib/useSession";

import { shopsApi } from "@/lib/api";

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
function AddProductLink({ boutiqueId, className }: { boutiqueId?: string; className?: string }) {
  const href = boutiqueId && boutiqueId !== "all"
    ? `/espace-vendeur/produits/nouveau?boutiqueId=${encodeURIComponent(boutiqueId)}`
    : "/espace-vendeur/produits/nouveau";

  return (
    <Link
      href={href}
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
  const [selectedBoutique, setSelectedBoutique] = useState("all");
  const [boutiques, setBoutiques] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  useEffect(() => {
    shopsApi.myShops().then((shops) => {
      setBoutiques(shops.map((s) => ({ id: s.id, name: s.name, slug: s.slug })));
    }).catch(() => {});
  }, []);

  const { data, loading, updateProduct, deleteProduct } = useProducts(selectedBoutique);
  const session = useSession();
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const boutiqueSlug = session?.user?.boutiqueSlug || getBoutiqueSlug() || "aziz-tech";

  // Modal de gestion de rupture de stock
  const [ruptureModalProduct, setRuptureModalProduct] = useState<ProductItem | null>(null);

  // Toast « produit créé » après redirection depuis /produits/nouveau
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
    return data
      .filter((p) => {
        const matchBoutique = selectedBoutique === "all" || p.boutique?.id === selectedBoutique;
        const matchStock = stockFilter === "all" || p.status === stockFilter;
        const matchCat = category === "all" || p.category === category;
        const matchBrand = brand === "all" || p.brand === brand;
        return matchBoutique && matchStock && matchCat && matchBrand;
      })
      .sort(
        (a, b) =>
          STOCK_PRIORITY[a.status] - STOCK_PRIORITY[b.status] ||
          b.salesCount - a.salesCount
      );
  }, [data, selectedBoutique, category, brand, stockFilter]);

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      inStock: list.filter((p) => p.status === "in_stock").length,
      lowStock: list.filter((p) => p.status === "low_stock").length,
      outOfStock: list.filter((p) => p.status === "out_of_stock").length,
    };
  }, [data]);

  // Action : marquer en rupture avec choix de visibilité vitrine
  const handleMarkRupture = async (keepVisible: boolean) => {
    if (!ruptureModalProduct) return;
    try {
      await updateProduct(ruptureModalProduct.id, {
        stock: 0,
        isActive: keepVisible,
        boutiqueId: ruptureModalProduct.boutique?.id,
      });
      setToast(
        keepVisible
          ? `« ${ruptureModalProduct.name} » marqué en rupture (laissé visible sur la vitrine).`
          : `« ${ruptureModalProduct.name} » retiré de la vitrine pour libérer de l'espace.`
      );
    } catch (err: any) {
      setToast(err?.message || "Erreur lors de la mise en rupture.");
    } finally {
      setRuptureModalProduct(null);
    }
  };

  // Action : bascule de visibilité rapide (Masquer/Afficher)
  const handleToggleVisibility = async (product: ProductItem) => {
    const newActiveState = !(product.isActive ?? true);
    try {
      await updateProduct(product.id, {
        isActive: newActiveState,
        boutiqueId: product.boutique?.id,
      });
      setToast(
        newActiveState
          ? `« ${product.name} » est maintenant visible sur la vitrine.`
          : `« ${product.name} » est masqué de la vitrine.`
      );
    } catch (err: any) {
      setToast(err?.message || "Erreur lors de la modification de la visibilité.");
    }
  };

  // Action : suppression d'un produit
  const handleDeleteProduct = async (product: ProductItem) => {
    if (!window.confirm(`Supprimer définitivement le produit « ${product.name} » ?`)) return;
    try {
      await deleteProduct(product.id, product.boutique?.id);
      setToast(`« ${product.name} » a été supprimé.`);
    } catch (err: any) {
      setToast(err?.message || "Erreur lors de la suppression.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Catalogue"
        title="Produits & Stocks"
        description="Gérez vos articles, surveillez les niveaux de stock et ajustez la présence de vos produits sur votre vitrine."
        actions={<AddProductLink boutiqueId={selectedBoutique} />}
      />

      {/* Cartes métriques */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Total références"
          value={String(stats.total)}
          icon="package"
          hint="Produits au catalogue"
        />
        <MiniStat
          label="En stock"
          value={String(stats.inStock)}
          icon="check"
          tone="green"
          hint="Prêts à la vente"
        />
        <MiniStat
          label="Stock faible"
          value={String(stats.lowStock)}
          icon="alert"
          tone="terracotta"
          hint="Moins de 5 pièces"
        />
        <MiniStat
          label="En rupture"
          value={String(stats.outOfStock)}
          icon="x"
          tone="terracotta"
          hint="Réapprovisionnement requis"
        />
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-1 shadow-sm shadow-ink-950/[0.02]">
          {STOCK_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStockFilter(tab.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors cursor-pointer",
                stockFilter === tab.value
                  ? "bg-blue-700 font-semibold text-white shadow-sm shadow-blue-700/20"
                  : "text-ink-600 hover:text-ink-950"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 font-mono text-[10px]",
                  stockFilter === tab.value
                    ? "bg-white/15 text-white"
                    : "bg-ink-100 text-ink-500"
                )}
              >
                {tab.value === "all"
                  ? stats.total
                  : tab.value === "in_stock"
                    ? stats.inStock
                    : tab.value === "low_stock"
                      ? stats.lowStock
                      : stats.outOfStock}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Sélecteur de boutique multi-enseignes */}
          {boutiques.length > 1 && (
            <SelectInput
              value={selectedBoutique}
              onChange={(e) => setSelectedBoutique(e.target.value)}
              className="w-full sm:w-52 font-bold text-ink-900 border-gold-soft bg-gold-wash/40"
              aria-label="Filtrer par boutique"
            >
              <option value="all">Toutes les boutiques ({boutiques.length})</option>
              {boutiques.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectInput>
          )}

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
            action={<AddProductLink boutiqueId={selectedBoutique} />}
          />
        </DashboardCard>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const isVisible = product.isActive ?? true;

            return (
              <DashboardCard key={product.id} className="group overflow-hidden flex flex-col justify-between border-line transition-all hover:border-gold-soft hover:shadow-md">
                <div>
                  {/* Image & Badges */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-ink-50">
                    <AssetImage src={product.image} alt={product.name} sizes="(max-width: 768px) 100vw, 33vw" label="Produit" />
                    
                    {/* Statut Stock */}
                    <div className="absolute right-3 top-3">
                      <StockBadge product={product} />
                    </div>

                    {/* Badge Visibilité Vitrine */}
                    <div className="absolute left-3 top-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold backdrop-blur-md shadow-xs",
                        isVisible
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                          : "bg-ink-950/80 text-ink-300 border border-ink-700/40"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", isVisible ? "bg-emerald-400" : "bg-ink-400")} />
                        {isVisible ? "Visible vitrine" : "Retiré vitrine"}
                      </span>
                    </div>
                  </div>

                  {/* Infos */}
                  <div className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-gold-strong truncate">
                        {product.category}
                        {product.brand ? <span className="text-ink-400"> · {product.brand}</span> : null}
                      </p>
                      {product.boutique && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-gold-soft/80 bg-gold-wash px-2 py-0.5 font-mono text-[10px] font-bold text-gold-strong shadow-2xs">
                          <Icon name="store" size={10} />
                          {product.boutique.name}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 truncate font-display text-base font-bold text-ink-950 transition-colors group-hover:text-gold-strong">
                      {product.name}
                    </h3>

                    <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                      <div>
                        <p className="font-mono text-sm font-extrabold text-ink-950">{formatCurrency(product.priceFcfa)}</p>
                        <p className="text-[11px] text-ink-400 font-medium">Stock : {product.stock} pcs</p>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-ink-500">
                        <span className="flex items-center gap-1">
                          <Icon name="orders" size={12} /> {product.salesCount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-gold-strong font-semibold">
                          <Icon name="star" size={12} /> {product.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barre d'outils et actions spécifiques vendeur */}
                <div className="p-4 pt-2 border-t border-line/60 bg-ink-50/40 space-y-2">
                  {/* Boutons de pilotage de stock et de vitrine */}
                  <div className="flex items-center gap-1.5">
                    {/* Bouton Rupture Directe */}
                    {product.stock > 0 ? (
                      <button
                        type="button"
                        onClick={() => setRuptureModalProduct(product)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-100 cursor-pointer"
                        title="Marquer en rupture et choisir de laisser visible ou retirer de la vitrine"
                      >
                        <Icon name="alert" size={12} />
                        <span>Mettre en rupture</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(product)}
                        className={cn(
                          "flex-1 inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors cursor-pointer",
                          isVisible
                            ? "border-ink-300 bg-white text-ink-700 hover:bg-ink-100 hover:text-ink-950"
                            : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        )}
                        title={isVisible ? "Retirer de la vitrine pour libérer de l'espace" : "Remettre visible sur la vitrine"}
                      >
                        <Icon name={isVisible ? "x" : "check"} size={12} />
                        <span>{isVisible ? "Retirer de vitrine" : "Remettre en vitrine"}</span>
                      </button>
                    )}

                    {/* Supprimer */}
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product)}
                      className="rounded-lg border border-line bg-white p-1.5 text-ink-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      title="Supprimer définitivement ce produit"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>

                  {/* Liens vitrine et partage */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={routes.product(boutiqueSlug, product.slug || product.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-[11px] font-semibold text-ink-700 transition-colors hover:border-gold-400 hover:text-ink-950 shadow-xs"
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
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-[11px] font-semibold text-ink-700 transition-colors hover:border-gold-400 hover:text-ink-950 cursor-pointer shadow-xs"
                    >
                      <Icon name="copy" size={12} />
                      <span>Lien</span>
                    </button>
                  </div>
                </div>
              </DashboardCard>
            );
          })}
        </div>
      )}

      {/* Modal de décision sur la mise en rupture */}
      {ruptureModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-gold-soft/60 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 font-bold">
                <Icon name="alert" size={20} />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-ink-950">
                  Passer en rupture de stock
                </h3>
                <p className="text-xs text-ink-500">
                  Produit : <strong>{ruptureModalProduct.name}</strong>
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-ink-600">
              Le stock de cet article passera à <strong>0</strong>. Que souhaitez-vous faire sur votre vitrine publique ?
            </p>

            <div className="mt-5 space-y-2.5">
              {/* Option 1 : Retirer de la vitrine */}
              <button
                type="button"
                onClick={() => handleMarkRupture(false)}
                className="w-full text-left rounded-2xl border border-line p-3.5 transition-all hover:border-gold-strong hover:bg-gold-wash/30 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-ink-950 group-hover:text-gold-strong">
                    🚫 Retirer de la vitrine (Libérer de l&apos;espace)
                  </p>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-600">
                    Recommandé
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink-500 leading-normal">
                  Le produit reste dans votre catalogue interne mais n&apos;encombre plus votre vitrine publique.
                </p>
              </button>

              {/* Option 2 : Laisser visible */}
              <button
                type="button"
                onClick={() => handleMarkRupture(true)}
                className="w-full text-left rounded-2xl border border-line p-3.5 transition-all hover:border-gold-strong hover:bg-gold-wash/30 cursor-pointer group"
              >
                <p className="text-xs font-bold text-ink-950 group-hover:text-gold-strong">
                  👁️ Laisser visible sur la vitrine (Badge « Rupture »)
                </p>
                <p className="mt-1 text-[11px] text-ink-500 leading-normal">
                  L&apos;article reste affiché avec la mention « Rupture de stock » pour informer vos visiteurs.
                </p>
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setRuptureModalProduct(null)}
                className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50 cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
