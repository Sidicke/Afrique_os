"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn, formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { Field, TextInput, TextArea, SelectInput } from "@/components/dashboard/ui/Field";
import { Icon } from "@/components/dashboard/icons";
import { dashboardService } from "@/services/dashboardService";
import { useProducts } from "@/hooks/useProducts";
import { shopsApi } from "@/lib/api";
import type { ApiShop } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import type { BrandOption, CategoryOption, NewProductDraft } from "@/types/dashboard";

interface VariantRow {
  key: string;
  name: string;
  value: string;
  priceDelta: string;
  stock: string;
  image: string; // base64 ou URL
}

const EMPTY_VARIANT: () => VariantRow = () => ({
  key: Math.random().toString(36).slice(2, 8),
  name: "Couleur",
  value: "",
  priceDelta: "",
  stock: "",
  image: "",
});

/** Compression automatique côté navigateur pour éviter l'erreur 413 (Payload Too Large) */
function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

/** Bascule stylée (visibilité / mis en avant) */
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3 text-left transition-colors hover:border-ink-300"
    >
      <span>
        <span className="block text-sm font-semibold text-ink-950">{label}</span>
        <span className="block text-xs text-ink-400">{description}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-blue-700" : "bg-ink-200"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}

/** En-tête de section de formulaire */
function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: "package" | "wallet" | "basket" | "store" | "more" | "eye" | "sparkle";
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-wash text-gold-strong">
        <Icon name={icon} size={17} strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="font-display text-base font-semibold text-ink-950">{title}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>
      </div>
    </div>
  );
}

function NouveauProduitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryBoutiqueId = searchParams.get("boutiqueId");
  const { addProduct, data: allProducts } = useProducts("all");
  const session = useSession();
  const activeBoutiqueId = session?.user?.boutiqueId ?? null;

  // Multi-boutique et gestion du plan
  const [shops, setShops] = useState<ApiShop[]>([]);
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    shopsApi.myShops().then((list) => {
      setShops(list);
      if (queryBoutiqueId && list.some((b) => b.id === queryBoutiqueId)) {
        setSelectedBoutiqueId(queryBoutiqueId);
      } else {
        const active = list.find((s) => s.id === activeBoutiqueId) ?? list[0];
        if (active) setSelectedBoutiqueId(active.id);
      }
    }).catch(() => {});
  }, [activeBoutiqueId, queryBoutiqueId]);

  // Contrôle des quotas selon le plan du vendeur
  const userPlan = shops.some((s) => s.plan === "enterprise")
    ? "enterprise"
    : shops.some((s) => s.plan === "business")
    ? "business"
    : "starter";
  const planLimit = userPlan === "enterprise" ? Infinity : userPlan === "business" ? 150 : 20;
  const currentTotalProducts = allProducts?.length ?? 0;
  const isAtLimit = planLimit !== Infinity && currentTotalProducts >= planLimit;
  const remainingSlots = planLimit === Infinity ? Infinity : Math.max(0, planLimit - currentTotalProducts);

  const [form, setForm] = useState({
    name: "",
    description: "",
    sku: "",
    price: "",
    oldPrice: "",
    stock: "1",
    categoryId: "",
    newCategory: "",
    brandId: "",
    newBrand: "",
    isFeatured: false,
    isActive: true,
  });
  const [images, setImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [categoriesError, setCategoriesError] = useState(false);
  const [brands, setBrands] = useState<BrandOption[] | null>(null);
  const [brandsError, setBrandsError] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const fetchCategories = useCallback(() => {
    dashboardService
      .getCategories()
      .then(setCategories)
      .catch(() => setCategoriesError(true));
  }, []);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const fetchBrands = useCallback(() => {
    dashboardService
      .getBrands()
      .then(setBrands)
      .catch(() => setBrandsError(true));
  }, []);
  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const price = Number(form.price) || 0;
  const oldPrice = Number(form.oldPrice) || 0;
  const discountPercent =
    oldPrice > price && price > 0
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : null;

  const categoryCreating = form.categoryId === "__new__";
  const brandCreating = form.brandId === "__new__";

  /** Validation */
  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2)
      errs.name = "Le nom du produit est requis (2 caractères minimum).";
    if (
      form.price.trim() === "" ||
      Number.isNaN(Number(form.price)) ||
      Number(form.price) < 0
    )
      errs.price = "Indiquez un prix de vente valide (≥ 0 FCFA).";
    if (form.oldPrice.trim() !== "" && (Number.isNaN(oldPrice) || oldPrice <= 0))
      errs.oldPrice = "Prix barré invalide.";
    else if (oldPrice > 0 && oldPrice <= price)
      errs.oldPrice = "Le prix barré doit être supérieur au prix pour afficher une remise.";
    if (form.stock.trim() !== "" && (Number.isNaN(Number(form.stock)) || Number(form.stock) < 0))
      errs.stock = "Quantité en stock invalide.";
    if (categoryCreating && form.newCategory.trim().length < 2)
      errs.newCategory = "Nommez la nouvelle catégorie (2 caractères minimum).";
    if (brandCreating && form.newBrand.trim().length < 2)
      errs.newBrand = "Nommez la nouvelle marque (2 caractères minimum).";
    const badVariant = variants.find(
      (v) =>
        (v.name.trim() || v.value.trim() || v.priceDelta.trim() || v.stock.trim()) &&
        (!v.name.trim() || !v.value.trim())
    );
    if (badVariant) errs.variants = "Chaque variante doit avoir un type et une valeur.";
    return errs;
  };

  const removeImage = (url: string) =>
    setImages((prev) => prev.filter((i) => i !== url));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAtLimit) {
      setSubmitError(
        `Votre formule ${userPlan.toUpperCase()} est limitée à ${planLimit} produits. Passez à la formule supérieure pour ajouter ce produit.`
      );
      return;
    }

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      document.getElementById(`produit-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      let categoryId = form.categoryId || undefined;
      if (categoryCreating) {
        const created = await dashboardService.createCategory(form.newCategory.trim());
        categoryId = created.id;
      }
      let brandId = form.brandId || undefined;
      if (brandCreating) {
        const created = await dashboardService.createBrand(form.newBrand.trim());
        brandId = created.id;
      }
      const cleanVariants = variants
        .filter((v) => v.name.trim() && v.value.trim())
        .map((v) => ({
          name: v.name.trim(),
          value: v.value.trim(),
          ...(v.priceDelta.trim() !== ""
            ? { priceDelta: Math.max(0, Number(v.priceDelta) || 0) }
            : {}),
          ...(v.stock.trim() !== ""
            ? { stock: Math.max(0, Number(v.stock) || 0) }
            : {}),
          ...(v.image.trim() ? { image: v.image.trim() } : {}),
        }));

      const draft: NewProductDraft = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price,
        oldPrice: discountPercent ? oldPrice : undefined,
        stock: form.stock.trim() !== "" ? Math.max(0, Number(form.stock) || 0) : undefined,
        sku: form.sku.trim() || undefined,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        categoryId,
        brandId,
        images: images.length ? images : undefined,
        variants: cleanVariants.length ? cleanVariants : undefined,
        ...(selectedBoutiqueId ? { boutiqueId: selectedBoutiqueId } : {}),
      };

      const created = await addProduct(draft);
      try {
        sessionStorage.setItem("product-created", created.name);
      } catch {}
      router.push("/espace-vendeur/produits");
    } catch (err: any) {
      setSubmitError(
        err?.message || "Impossible de créer le produit. Vérifiez les champs ou votre formule."
      );
    } finally {
      setSaving(false);
    }
  };

  const cover = images[0];
  const selectedShop = shops.find((s) => s.id === selectedBoutiqueId) || shops[0];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      {/* En-tête */}
      <PageHeader
        eyebrow="Catalogue · Nouveau produit"
        title="Ajouter un produit"
        description="Remplissez les informations essentielles : le produit sera immédiatement visible sur votre vitrine."
        actions={
          <Link
            href="/espace-vendeur/produits"
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink-600 shadow-sm transition-colors hover:border-ink-300 hover:text-ink-950"
          >
            <Icon name="chevronLeft" size={13} /> Retour au catalogue
          </Link>
        }
      />

      {/* Bannière de Quota & Restriction de Plan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display font-bold text-sm",
              userPlan === "enterprise"
                ? "bg-purple-100 text-purple-700 border border-purple-200"
                : userPlan === "business"
                ? "bg-gold-wash text-gold-strong border border-gold-soft"
                : "bg-ink-100 text-ink-700"
            )}
          >
            {userPlan === "enterprise" ? "ENT" : userPlan === "business" ? "PRO" : "STD"}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-950">
                Formule {userPlan.toUpperCase()}
              </span>
              <span className="rounded-full bg-ink-100 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-700">
                {currentTotalProducts} / {planLimit === Infinity ? "Illimité" : `${planLimit} produits`}
              </span>
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              {planLimit === Infinity
                ? "Formule Enterprise : ajout illimité de produits sur toutes vos enseignes."
                : isAtLimit
                ? "Limite de votre formule atteinte. Passez à la formule supérieure pour continuer."
                : `Quota : il vous reste ${remainingSlots} place${remainingSlots > 1 ? "s" : ""} produit disponible${remainingSlots > 1 ? "s" : ""}.`}
            </p>
          </div>
        </div>

        {planLimit !== Infinity && (
          <div className="w-full sm:w-44 flex flex-col gap-1.5">
            <div className="flex justify-between text-[10px] font-mono text-ink-400">
              <span>Utilisation</span>
              <span>{Math.round((currentTotalProducts / planLimit) * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isAtLimit ? "bg-red-500" : "bg-gold-strong"
                )}
                style={{
                  width: `${Math.min(100, (currentTotalProducts / planLimit) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Attribution Multi-Boutique */}
      {shops.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gold-soft bg-gold-wash/80 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gold-strong shadow-xs">
              <Icon name="store" size={18} strokeWidth={2.2} />
            </span>
            <div>
              <label htmlFor="boutique-destinataire" className="block text-xs font-bold text-ink-950 uppercase tracking-wider">
                Boutique d&apos;attribution
              </label>
              <p className="text-xs text-ink-500">
                Choisissez sur quelle vitrine ce produit sera mis en vente.
              </p>
            </div>
          </div>
          <select
            id="boutique-destinataire"
            value={selectedBoutiqueId}
            onChange={(e) => setSelectedBoutiqueId(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-gold-mid/80 bg-white px-3.5 py-2.5 text-sm font-bold text-ink-950 shadow-xs focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            {shops.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {submitError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <Icon name="alert" size={16} className="shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ————— Colonne Formulaire ————— */}
        <div className="flex flex-col gap-6">
          {/* Étape 1 : L'Essentiel (Nom, Photos, Prix, Stock, Catégorie) */}
          <DashboardCard className="flex flex-col gap-5 p-6 border-blue-100 shadow-sm">
            <SectionHeader
              icon="package"
              title="1. L'Essentiel du produit"
              description="Remplissez ces champs pour créer et mettre en vente votre produit en quelques secondes."
            />

            {/* Nom */}
            <Field label="Nom de l'article *" hint="Nom accrocheur et descriptif">
              <TextInput
                id="produit-name"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex. Chargeur Rapide 65W ou Robe Wax Traditionnelle"
                className={cn(
                  "text-base py-3 font-medium",
                  errors.name && "border-red-300 focus:border-red-400 focus:ring-red-100"
                )}
              />
              {errors.name && (
                <p className="mt-1 text-xs font-semibold text-red-600">{errors.name}</p>
              )}
            </Field>

            {/* Photos du produit — Placées en avant pour une UX fluide */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-ink-900">
                Photos du produit <span className="text-ink-400 font-normal">(la 1ère sera la couverture)</span>
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/50 p-6 text-center hover:bg-blue-50/40 hover:border-blue-400 transition-all">
                <Icon name="upload" size={26} className="text-blue-600 mb-1.5" />
                <span className="text-sm font-bold text-ink-900">
                  Ajouter des photos (ordinateur ou smartphone)
                </span>
                <span className="text-xs text-ink-400 mt-0.5">
                  Glissez vos images ici ou cliquez pour parcourir · PNG, JPG, WEBP (max 5 Mo)
                </span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    if (imageError) setImageError(null);
                    const files = Array.from(e.target.files || []);
                    for (const file of files) {
                      try {
                        const compressed = await compressImage(file, 1200, 1200, 0.82);
                        if (compressed) {
                          setImages((prev) => [...prev, compressed]);
                        }
                      } catch {
                        setImageError("Erreur lors de la lecture d'une des photos.");
                      }
                    }
                    e.target.value = "";
                  }}
                />
              </label>

              {imageError && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600 mt-1">
                  <Icon name="alert" size={13} /> {imageError}
                </p>
              )}

              {/* Galerie des vignettes ajoutées */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 mt-2">
                  {images.map((url, i) => (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-white shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                      {i === 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-blue-700/90 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-white">
                          ★ Couverture
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-950/80 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                        title="Supprimer la photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prix & Stock en 2 colonnes simples */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prix de vente (FCFA) *">
                <TextInput
                  id="produit-price"
                  required
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="Ex. 15000"
                  className={cn(
                    "text-base font-bold",
                    errors.price && "border-red-300 focus:border-red-400 focus:ring-red-100"
                  )}
                />
                {errors.price && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.price}</p>
                )}
              </Field>

              <Field label="Quantité en stock *">
                <TextInput
                  id="produit-stock"
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value)}
                  placeholder="1"
                  className={cn(errors.stock && "border-red-300 focus:border-red-400 focus:ring-red-100")}
                />
                {errors.stock && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.stock}</p>
                )}
              </Field>
            </div>

            {/* Catégorie */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-ink-900">Catégorie</label>
              {categoriesError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                  Impossible de charger vos catégories.
                </div>
              ) : !categories ? (
                <Skeleton className="h-11 w-full" />
              ) : (
                <div className="flex flex-col gap-2">
                  <SelectInput
                    id="produit-categoryId"
                    value={form.categoryId}
                    onChange={(e) => set("categoryId", e.target.value)}
                    className="font-medium text-sm"
                  >
                    <option value="">Sélectionnez une catégorie (ou Sans catégorie)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__new__">+ Créer une nouvelle catégorie…</option>
                  </SelectInput>

                  {categoryCreating && (
                    <div className="mt-1 flex flex-col gap-1">
                      <TextInput
                        id="produit-newCategory"
                        autoFocus
                        value={form.newCategory}
                        onChange={(e) => set("newCategory", e.target.value)}
                        placeholder="Nom de la nouvelle catégorie (ex: Accessoires Tech)"
                      />
                      {errors.newCategory && (
                        <p className="text-xs font-semibold text-red-600">{errors.newCategory}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </DashboardCard>

          {/* Bouton dépliant pour les options avancées */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-blue-400 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
                <Icon name={showAdvanced ? "chevronUp" : "chevronDown"} size={16} />
              </span>
              <div>
                <p className="text-sm font-bold text-ink-950">
                  {showAdvanced ? "Masquer les options avancées" : "Personnaliser davantage (description, promotions, variantes...)"}
                </p>
                <p className="text-xs text-ink-500">
                  Facultatif · Ajoutez une description détaillée, un prix barré, des variantes avec photo dédiée ou une marque.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-700">
              {showAdvanced ? "Replier" : "Déplier"}
            </span>
          </button>

          {/* Étape 2 : Options avancées & Détails (dépliables pour garder l'UI épurée) */}
          {showAdvanced && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Description détaillée */}
              <DashboardCard className="flex flex-col gap-4 p-5">
                <SectionHeader
                  icon="sparkle"
                  title="Description détaillée"
                  description="Donnez envie d'acheter en décrivant les atouts de votre produit."
                />
                <TextArea
                  maxLength={4000}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Caractéristiques, conseils d'utilisation, garantie…"
                  className="min-h-24 text-sm"
                />
              </DashboardCard>

              {/* Promotion & Prix barré */}
              <DashboardCard className="flex flex-col gap-4 p-5">
                <SectionHeader
                  icon="wallet"
                  title="Promotion (Prix barré)"
                  description="Affichez une remise automatique en renseignant l'ancien prix plus élevé."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ancien prix barré (FCFA)" hint="Doit être supérieur au prix de vente">
                    <TextInput
                      id="produit-oldPrice"
                      type="number"
                      min={0}
                      value={form.oldPrice}
                      onChange={(e) => set("oldPrice", e.target.value)}
                      placeholder="Ex. 20000"
                    />
                    {errors.oldPrice && (
                      <p className="mt-1 text-xs font-semibold text-red-600">{errors.oldPrice}</p>
                    )}
                  </Field>

                  {discountPercent !== null && (
                    <div className="flex items-center">
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800 font-semibold">
                        🎉 Remise de {discountPercent}% affichée sur la vitrine.
                      </div>
                    </div>
                  )}
                </div>
              </DashboardCard>

              {/* Référence SKU & Marque */}
              <DashboardCard className="flex flex-col gap-4 p-5">
                <SectionHeader
                  icon="store"
                  title="Référence & Marque"
                  description="Pour votre gestion de stock interne et le filtrage dans la vitrine."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Référence (SKU)" hint="Optionnel">
                    <TextInput
                      maxLength={80}
                      value={form.sku}
                      onChange={(e) => set("sku", e.target.value)}
                      placeholder="Ex. TECH-CH-65W"
                    />
                  </Field>

                  <Field label="Marque">
                    <SelectInput
                      value={form.brandId}
                      onChange={(e) => set("brandId", e.target.value)}
                    >
                      <option value="">Sans marque</option>
                      {brands?.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                      <option value="__new__">+ Créer une nouvelle marque…</option>
                    </SelectInput>
                    {brandCreating && (
                      <TextInput
                        className="mt-2"
                        autoFocus
                        value={form.newBrand}
                        onChange={(e) => set("newBrand", e.target.value)}
                        placeholder="Nom de la marque (ex: Apple, Samsung)"
                      />
                    )}
                  </Field>
                </div>
              </DashboardCard>

              {/* Variantes (Tailles, Couleurs) */}
              <DashboardCard className="flex flex-col gap-4 p-5">
                <SectionHeader
                  icon="more"
                  title="Variantes du produit"
                  description="Proposez plusieurs tailles, couleurs ou capacités, chacune avec sa propre photo et son stock."
                />

                {variants.length > 0 && (
                  <div className="space-y-3">
                    {variants.map((v, i) => (
                      <div key={v.key} className="flex flex-col gap-3 rounded-xl border border-line bg-ink-50/60 p-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_100px_90px_36px]">
                          <TextInput
                            value={v.name}
                            onChange={(e) =>
                              setVariants((prev) =>
                                prev.map((r) => (r.key === v.key ? { ...r, name: e.target.value } : r))
                              )
                            }
                            placeholder="Type (ex: Couleur)"
                            className="bg-white text-xs"
                          />
                          <TextInput
                            value={v.value}
                            onChange={(e) =>
                              setVariants((prev) =>
                                prev.map((r) => (r.key === v.key ? { ...r, value: e.target.value } : r))
                              )
                            }
                            placeholder="Valeur (ex: Noir)"
                            className="bg-white text-xs"
                          />
                          <TextInput
                            type="number"
                            min={0}
                            value={v.priceDelta}
                            onChange={(e) =>
                              setVariants((prev) =>
                                prev.map((r) => (r.key === v.key ? { ...r, priceDelta: e.target.value } : r))
                              )
                            }
                            placeholder="+0 FCFA"
                            className="bg-white text-xs"
                          />
                          <TextInput
                            type="number"
                            min={0}
                            value={v.stock}
                            onChange={(e) =>
                              setVariants((prev) =>
                                prev.map((r) => (r.key === v.key ? { ...r, stock: e.target.value } : r))
                              )
                            }
                            placeholder="Stock"
                            className="bg-white text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setVariants((prev) => prev.filter((r) => r.key !== v.key))}
                            className="flex items-center justify-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600"
                            title="Supprimer la variante"
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>

                        {/* Photo spécifique de variante */}
                        <div className="flex items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink-300 bg-white px-3 py-1 text-xs font-semibold text-ink-600 hover:border-blue-600 hover:text-blue-700">
                            <Icon name="upload" size={13} />
                            {v.image ? "Changer la photo" : "Photo de cette variante"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const compressed = await compressImage(file, 800, 800, 0.8);
                                setVariants((prev) =>
                                  prev.map((r) => (r.key === v.key ? { ...r, image: compressed } : r))
                                );
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {v.image && (
                            <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-line">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={v.image} alt={v.value} className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setVariants((prev) => prev.map((r) => r.key === v.key ? { ...r, image: "" } : r))}
                                className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 hover:opacity-100"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setVariants((prev) => [...prev, EMPTY_VARIANT()])}
                  className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3.5 py-2 text-xs font-semibold text-ink-700 hover:border-blue-600 hover:text-blue-700"
                >
                  <Icon name="plus" size={13} strokeWidth={2.2} /> Ajouter une option / variante
                </button>
              </DashboardCard>

              {/* Visibilité */}
              <DashboardCard className="flex flex-col gap-4 p-5">
                <SectionHeader
                  icon="eye"
                  title="Visibilité"
                  description="Contrôlez l'affichage immédiat du produit sur votre vitrine."
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Toggle
                    checked={form.isActive}
                    onChange={(v) => set("isActive", v)}
                    label="Visible dans la vitrine"
                    description="Si désactivé, le produit reste dans votre inventaire sans être vendu."
                  />
                  <Toggle
                    checked={form.isFeatured}
                    onChange={(v) => set("isFeatured", v)}
                    label="Mettre en vedette"
                    description="Affiché en tête de votre page d'accueil."
                  />
                </div>
              </DashboardCard>
            </div>
          )}
        </div>

        {/* ————— Colonne Droite : Aperçu Vitrine en Direct ————— */}
        <aside className="sticky top-20 flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gold-strong block mb-3">
              Aperçu en direct · Vitrine client
            </span>

            <div className="overflow-hidden rounded-xl border border-line bg-ink-50">
              <div className="relative aspect-square w-full overflow-hidden bg-ink-100">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="Aperçu" className="h-full w-full object-cover transition-all" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-300">
                    <Icon name="package" size={32} strokeWidth={1.2} />
                    <span className="text-xs">Aucune photo</span>
                  </div>
                )}
                {discountPercent !== null && (
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-red-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-xs">
                    −{discountPercent}%
                  </span>
                )}
              </div>

              <div className="p-4 bg-white">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-400 truncate">
                  {categories?.find((c) => c.id === form.categoryId)?.name ?? (categoryCreating ? form.newCategory || "Catégorie" : "Sans catégorie")}
                </p>
                <h3 className="font-display text-sm font-bold text-ink-950 mt-1 truncate">
                  {form.name.trim() || "Titre de votre produit"}
                </h3>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-base font-bold text-ink-950">
                    {price > 0 ? formatCurrency(price) : "0 FCFA"}
                  </span>
                  {discountPercent !== null && (
                    <span className="text-xs text-ink-400 line-through">
                      {formatCurrency(oldPrice)}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3 text-[11px] text-ink-500">
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", Number(form.stock) > 0 ? "bg-green-600" : "bg-red-400")} />
                    {Number(form.stock) > 0 ? `${form.stock} en stock` : "Rupture"}
                  </span>
                  <span className="text-ink-400 font-mono text-[10px]">
                    {selectedShop?.name || "Boutique"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Barre d'action fixe en bas */}
      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-4 border-t border-line bg-paper/95 px-4 py-3.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 shadow-md">
        <div className="text-xs text-ink-500 hidden sm:block">
          {isAtLimit ? (
            <span className="text-red-600 font-semibold">⚠️ Limite de produits atteinte pour votre plan.</span>
          ) : (
            <span>Prêt à publier ? Votre article sera disponible immédiatement.</span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <Link
            href="/espace-vendeur/produits"
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-ink-600 hover:bg-ink-50 transition"
          >
            Annuler
          </Link>

          <button
            type="submit"
            disabled={saving || isAtLimit}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-700/25 transition-all hover:bg-blue-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Publication en cours…
              </>
            ) : (
              <>
                <Icon name="check" size={14} strokeWidth={2.4} /> Publier le produit
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function NouveauProduitPage() {
  return (
    <Suspense fallback={<div className="h-64 w-full animate-pulse rounded-2xl bg-ink-100/70" />}>
      <NouveauProduitForm />
    </Suspense>
  );
}
