"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, formatFcfa } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { DashboardCard } from "@/components/dashboard/ui/DashboardCard";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { Field, TextInput, TextArea, SelectInput } from "@/components/dashboard/ui/Field";
import { Icon } from "@/components/dashboard/icons";
import { dashboardService } from "@/services/dashboardService";
import { useProducts } from "@/hooks/useProducts";
import type { BrandOption, CategoryOption, NewProductDraft } from "@/types/dashboard";

interface VariantRow {
  key: string;
  name: string;
  value: string;
  priceDelta: string;
  stock: string;
}

const EMPTY_VARIANT: () => VariantRow = () => ({
  key: Math.random().toString(36).slice(2, 8),
  name: "Couleur",
  value: "",
  priceDelta: "",
  stock: "",
});

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

/** En-tête de section de formulaire (icône + titre + description) */
function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: "package" | "wallet" | "basket" | "store" | "more" | "eye";
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

export default function NouveauProduitPage() {
  const router = useRouter();
  const { addProduct } = useProducts();

  const [form, setForm] = useState({
    name: "",
    description: "",
    sku: "",
    price: "",
    oldPrice: "",
    stock: "",
    categoryId: "",
    newCategory: "",
    brandId: "",
    newBrand: "",
    isFeatured: false,
    isActive: true,
  });
  const [images, setImages] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState("");
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

  // Chargement des catégories réelles de la boutique (aucun setState synchrone
  // dans l'effet — les mises à jour arrivent uniquement via .then/.catch)
  const fetchCategories = useCallback(() => {
    dashboardService
      .getCategories()
      .then(setCategories)
      .catch(() => setCategoriesError(true));
  }, []);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Marques de la boutique (même pattern que les catégories)
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

  /** Valide la saisie et retourne le dictionnaire d'erreurs */
  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2)
      errs.name = "Le nom est requis (2 caractères minimum).";
    // Validation sur la chaîne brute : Number() sur une saisie invalide donne
    // NaN — jamais de prix silencieusement ramené à 0.
    if (
      form.price.trim() === "" ||
      Number.isNaN(Number(form.price)) ||
      Number(form.price) < 0
    )
      errs.price = "Indiquez un prix valide (≥ 0).";
    if (form.oldPrice.trim() !== "" && (Number.isNaN(oldPrice) || oldPrice <= 0))
      errs.oldPrice = "Prix barré invalide.";
    else if (oldPrice > 0 && oldPrice <= price)
      errs.oldPrice = "Le prix barré doit être supérieur au prix pour afficher une remise.";
    if (form.stock.trim() !== "" && (Number.isNaN(Number(form.stock)) || Number(form.stock) < 0))
      errs.stock = "Stock invalide (≥ 0).";
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

  const addImage = () => {
    const url = imageInput.trim();
    if (!url) {
      setImageError(null);
      return;
    }
    if (!/^https?:\/\/|\//.test(url)) {
      setImageError("URL invalide : collez une adresse http(s) ou un chemin /assets/…");
      return;
    }
    setImageError(null);
    setImages((prev) => (prev.includes(url) ? prev : [...prev, url]));
    setImageInput("");
  };

  /** Ordre des champs en erreur → identifiants DOM (scroll vers le premier) */
  const ERROR_FIELD_IDS: Array<[keyof typeof errors, string]> = [
    ["name", "produit-name"],
    ["price", "produit-price"],
    ["oldPrice", "produit-oldprice"],
    ["stock", "produit-stock"],
    ["newCategory", "produit-categorie"],
    ["newBrand", "produit-marque"],
  ];

  const scrollToFirstError = (errs: Record<string, string>) => {
    const first = ERROR_FIELD_IDS.find(([key]) => errs[key]);
    if (first) {
      document
        .getElementById(first[1])
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const removeImage = (url: string) =>
    setImages((prev) => prev.filter((i) => i !== url));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Laisse le temps aux messages d'erreur de s'afficher puis vise le premier
      requestAnimationFrame(() => scrollToFirstError(errs));
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      // Catégorie et marque créées à la volée si l'option « nouvelle » est choisie
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
      };

      const created = await addProduct(draft);
      try {
        sessionStorage.setItem("product-created", created.name);
      } catch {
        // Stockage indisponible : on redirige simplement
      }
      router.push("/espace-admin/produits");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Impossible de créer le produit."
      );
    } finally {
      setSaving(false);
    }
  };

  const cover = images[0];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <PageHeader
        eyebrow="Catalogue · Nouveau produit"
        title="Ajouter un produit"
        description="Complétez les informations ci-dessous : le produit apparaîtra dans votre vitrine dès la création."
        actions={
          <Link
            href="/espace-admin/produits"
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink-600 shadow-sm transition-colors hover:border-ink-300 hover:text-ink-950"
          >
            <Icon name="chevronLeft" size={13} /> Retour au catalogue
          </Link>
        }
      />

      {submitError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-100/60 px-4 py-3 text-sm text-red-600">
          <Icon name="alert" size={15} /> {submitError}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ————— Colonne principale ————— */}
        <div className="flex flex-col gap-6">
          {/* Infos générales */}
          <DashboardCard className="flex flex-col gap-5 p-5">
            <SectionHeader
              icon="package"
              title="Informations générales"
              description="Le nom est obligatoire ; la description s'affiche sur la fiche produit de la vitrine."
            />
            <Field label="Nom du produit" hint="Affiché dans le catalogue et la fiche produit">
              <TextInput
                id="produit-name"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex. Tissu Wax Bazin Royal"
                className={cn(errors.name && "border-red-300 focus:border-red-400 focus:ring-red-100")}
              />
              {errors.name && (
                <p className="mt-1 text-xs font-medium text-red-600">{errors.name}</p>
              )}
            </Field>
            <Field label="Description" hint="Concis : 2 à 4 lignes donnent envie d'acheter">
              <TextArea
                maxLength={4000}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Matière, fabrication, conseils d'entretien…"
                className="min-h-28"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Référence (SKU)" hint="Facultatif (pour votre gestion interne)">
                <TextInput
                  maxLength={80}
                  value={form.sku}
                  onChange={(e) => set("sku", e.target.value)}
                  placeholder="Ex. WAX-ROYAL-001"
                />
              </Field>
            </div>
          </DashboardCard>

          {/* Prix & promotion */}
          <DashboardCard className="flex flex-col gap-5 p-5">
            <SectionHeader
              icon="wallet"
              title="Prix & promotion"
              description="Le prix barré affiche la remise automatiquement dans la vitrine (−X %)."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prix de vente (FCFA)">
                <TextInput
                  id="produit-price"
                  required
                  type="number"
                  min={0}
                  step="any"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0"
                  className={cn(errors.price && "border-red-300 focus:border-red-400 focus:ring-red-100")}
                />
                {errors.price && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.price}</p>
                )}
              </Field>
              <Field label="Prix barré (FCFA)" hint="Ancien prix (sert de référence à la promotion)">
                <div className="relative">
                  <TextInput
                    id="produit-oldprice"
                    type="number"
                    min={0}
                    step="any"
                    value={form.oldPrice}
                    onChange={(e) => set("oldPrice", e.target.value)}
                    placeholder="0"
                    className={cn(
                      "pr-14",
                      errors.oldPrice && "border-red-300 focus:border-red-400 focus:ring-red-100"
                    )}
                  />
                  {discountPercent !== null && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-green-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-green-700">
                      −{discountPercent}%
                    </span>
                  )}
                </div>
                {errors.oldPrice && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.oldPrice}</p>
                )}
              </Field>
            </div>

            {/* Aperçu prix en direct */}
            {price > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-50 px-4 py-3">
                <Icon name="sparkle" size={15} className="text-gold-strong" />
                <div className="text-sm">
                  {discountPercent !== null ? (
                    <span className="flex items-baseline gap-2">
                      <span className="text-ink-400 line-through">{formatFcfa(oldPrice)}</span>
                      <span className="font-mono text-base font-bold text-ink-950">
                        {formatFcfa(price)}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-green-700">
                        −{discountPercent}%
                      </span>
                    </span>
                  ) : (
                    <span className="font-mono text-base font-bold text-ink-950">
                      {formatFcfa(price)}
                    </span>
                  )}
                  <span className="ml-2 text-xs text-ink-400">prix affiché dans la vitrine</span>
                </div>
              </div>
            )}
          </DashboardCard>

          {/* Stock & visibilité */}
          <DashboardCard className="flex flex-col gap-5 p-5">
            <SectionHeader
              icon="basket"
              title="Stock & visibilité"
              description="Le stock alimente le badge de disponibilité ; désactivez le produit pour le cacher de la vitrine."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quantité en stock">
                <TextInput
                  id="produit-stock"
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value)}
                  placeholder="0"
                  className={cn(errors.stock && "border-red-300 focus:border-red-400 focus:ring-red-100")}
                />
                {errors.stock && (
                  <p className="mt-1 text-xs font-medium text-red-600">{errors.stock}</p>
                )}
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                checked={form.isActive}
                onChange={(v) => set("isActive", v)}
                label="Visible dans la vitrine"
                description="Un produit inactif reste dans votre catalogue mais n'est pas affiché."
              />
              <Toggle
                checked={form.isFeatured}
                onChange={(v) => set("isFeatured", v)}
                label="Mis en avant"
                description="Apparaît en premier dans le catalogue et la page d'accueil."
              />
            </div>
          </DashboardCard>

          {/* Catégorie */}
          <DashboardCard className="flex flex-col gap-5 p-5">
            <SectionHeader
              icon="store"
              title="Catégorie"
              description="Rattachez le produit à une catégorie existante ou créez-en une à la volée."
            />
            {categoriesError ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                <span>Impossible de charger vos catégories.</span>
                <button
                  type="button"
                  onClick={() => {
                    setCategoriesError(false);
                    fetchCategories();
                  }}
                  className="flex cursor-pointer items-center gap-1.5 font-semibold underline underline-offset-2"
                >
                  <Icon name="refresh" size={12} /> Réessayer
                </button>
              </div>
            ) : !categories ? (
              <Skeleton className="h-11 w-full" />
            ) : (
              <>
                <Field label="Catégorie du produit">
                  <SelectInput
                    value={form.categoryId}
                    onChange={(e) => set("categoryId", e.target.value)}
                  >
                    <option value="">Sans catégorie</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__new__">Créer une nouvelle catégorie…</option>
                  </SelectInput>
                </Field>
                {categoryCreating && (
                  <Field label="Nom de la nouvelle catégorie">
                    <div className="relative">
                      <TextInput
                        id="produit-categorie"
                        autoFocus
                        maxLength={60}
                        value={form.newCategory}
                        onChange={(e) => set("newCategory", e.target.value)}
                        placeholder="Ex. Maison & Déco"
                        className={cn(errors.newCategory && "border-red-300 focus:border-red-400 focus:ring-red-100")}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-wider text-ink-300">
                        Nouvelle
                      </span>
                    </div>
                    {errors.newCategory && (
                      <p className="mt-1 text-xs font-medium text-red-600">{errors.newCategory}</p>
                    )}
                  </Field>
                )}
                {categories.length === 0 && !categoryCreating && (
                  <p className="text-xs text-ink-400">
                    Vous n&apos;avez pas encore de catégorie : créez-en une ci-dessus.
                  </p>
                )}
              </>
            )}
          </DashboardCard>

          {/* Marque */}
          <DashboardCard className="flex flex-col gap-5 p-5">
            <SectionHeader
              icon="store"
              title="Marque"
              description="Rattachez le produit à une marque (ex. Samsung, Vlisco…) : vos clients pourront filtrer la vitrine par marque."
            />
            {brandsError ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                <span>Impossible de charger vos marques.</span>
                <button
                  type="button"
                  onClick={() => {
                    setBrandsError(false);
                    fetchBrands();
                  }}
                  className="flex cursor-pointer items-center gap-1.5 font-semibold underline underline-offset-2"
                >
                  <Icon name="refresh" size={12} /> Réessayer
                </button>
              </div>
            ) : !brands ? (
              <Skeleton className="h-11 w-full" />
            ) : (
              <>
                <Field label="Marque du produit">
                  <SelectInput
                    value={form.brandId}
                    onChange={(e) => set("brandId", e.target.value)}
                  >
                    <option value="">Sans marque</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                    <option value="__new__">Créer une nouvelle marque…</option>
                  </SelectInput>
                </Field>
                {brandCreating && (
                  <Field label="Nom de la nouvelle marque">
                    <div className="relative">
                      <TextInput
                        id="produit-marque"
                        autoFocus
                        maxLength={60}
                        value={form.newBrand}
                        onChange={(e) => set("newBrand", e.target.value)}
                        placeholder="Ex. Samsung"
                        className={cn(errors.newBrand && "border-red-300 focus:border-red-400 focus:ring-red-100")}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-wider text-ink-300">
                        Nouvelle
                      </span>
                    </div>
                    {errors.newBrand && (
                      <p className="mt-1 text-xs font-medium text-red-600">{errors.newBrand}</p>
                    )}
                  </Field>
                )}
                {brands.length === 0 && !brandCreating && (
                  <p className="text-xs text-ink-400">
                    Vous n&apos;avez pas encore de marque : créez-en une ci-dessus pour classer vos
                    produits (ex. Samsung, Apple, Anker…).
                  </p>
                )}
              </>
            )}
          </DashboardCard>

          {/* Variantes */}
          <DashboardCard className="flex flex-col gap-5 p-5">
            <SectionHeader
              icon="more"
              title="Variantes"
              description="Taille, couleur, modèle… Chaque variante a son stock propre et une éventuelle surcharge de prix."
            />
            {variants.length === 0 && (
              <p className="text-xs text-ink-400">
                Aucune variante : le produit sera vendu tel quel. Ajoutez-en une pour proposer des options.
              </p>
            )}
            {variants.length > 0 && (
              <div className="space-y-2.5">
                {variants.map((v, i) => (
                  <div
                    key={v.key}
                    className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-ink-50 p-2.5 sm:grid-cols-[1fr_1fr_110px_90px_36px]"
                  >
                    <Field label={i === 0 ? "Type" : undefined}>
                      <TextInput
                        aria-label={i > 0 ? `Type de la variante ${i + 1}` : undefined}
                        value={v.name}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((r) => (r.key === v.key ? { ...r, name: e.target.value } : r))
                          )
                        }
                        placeholder="Couleur"
                        className="bg-white"
                      />
                    </Field>
                    <Field label={i === 0 ? "Valeur" : undefined}>
                      <TextInput
                        aria-label={i > 0 ? `Valeur de la variante ${i + 1}` : undefined}
                        value={v.value}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((r) => (r.key === v.key ? { ...r, value: e.target.value } : r))
                          )
                        }
                        placeholder="Noir"
                        className="bg-white"
                      />
                    </Field>
                    <Field label={i === 0 ? "Δ Prix" : undefined}>
                      <TextInput
                        aria-label={i > 0 ? `Surcharge de prix de la variante ${i + 1}` : undefined}
                        type="number"
                        min={0}
                        value={v.priceDelta}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((r) => (r.key === v.key ? { ...r, priceDelta: e.target.value } : r))
                          )
                        }
                        placeholder="+0"
                        className="bg-white"
                      />
                    </Field>
                    <Field label={i === 0 ? "Stock" : undefined}>
                      <TextInput
                        aria-label={i > 0 ? `Stock de la variante ${i + 1}` : undefined}
                        type="number"
                        min={0}
                        value={v.stock}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((r) => (r.key === v.key ? { ...r, stock: e.target.value } : r))
                          )
                        }
                        placeholder="0"
                        className="bg-white"
                      />
                    </Field>
                    <div className="flex items-end justify-end pb-0.5">
                      <button
                        type="button"
                        onClick={() => setVariants((prev) => prev.filter((r) => r.key !== v.key))}
                        className="cursor-pointer rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-100/70 hover:text-red-600"
                        aria-label={`Supprimer la variante ${v.value || v.name || i + 1}`}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {errors.variants && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                <Icon name="alert" size={12} /> {errors.variants}
              </p>
            )}
            <button
              type="button"
              onClick={() => setVariants((prev) => [...prev, EMPTY_VARIANT()])}
              className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3.5 py-2 text-xs font-semibold text-ink-600 transition-colors hover:border-blue-600 hover:text-blue-700"
            >
              <Icon name="plus" size={13} strokeWidth={2.2} /> Ajouter une variante
            </button>
          </DashboardCard>

          {/* Images */}
          <DashboardCard className="flex flex-col gap-5 p-5">
            <SectionHeader
              icon="eye"
              title="Images"
              description="Collez les URLs de vos photos. La première image sert de couverture dans la vitrine."
            />
            <div className="flex gap-2">
              <TextInput
                value={imageInput}
                onChange={(e) => {
                  setImageInput(e.target.value);
                  if (imageError) setImageError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImage();
                  }
                }}
                placeholder="https://… (ou /assets/…) puis Entrée"
                className={cn("flex-1", imageError && "border-red-300 focus:border-red-400 focus:ring-red-100")}
              />
              <button
                type="button"
                onClick={addImage}
                disabled={!imageInput.trim()}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-ink-950 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name="plus" size={13} strokeWidth={2.2} /> Ajouter
              </button>
            </div>
            {imageError && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                <Icon name="alert" size={12} /> {imageError}
              </p>
            )}

            {images.length > 0 ? (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((url, i) => (
                  <li key={url} className="group relative">
                    <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-ink-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Image ${i + 1} du produit`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/assets/boutique/gadget-importe.jpg";
                        }}
                      />
                      {i === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-md bg-ink-950/80 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-gold-300">
                          Couverture
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute right-1.5 top-1.5 cursor-pointer rounded-md bg-ink-950/70 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                        aria-label="Retirer l'image"
                      >
                        <Icon name="x" size={11} strokeWidth={2.4} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-400">
                Aucune image pour l&apos;instant : un visuel par défaut sera affiché en attendant.
              </p>
            )}
          </DashboardCard>
        </div>

        {/* ————— Colonne aperçu ————— */}
        <aside className="sticky top-0 flex flex-col gap-4">
          <DashboardCard className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-ink-50">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="Aperçu du produit" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-300">
                  <Icon name="package" size={28} strokeWidth={1.3} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
                    Aperçu
                  </span>
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-gold-strong">
                {categories?.find((c) => c.id === form.categoryId)?.name ??
                  (categoryCreating ? form.newCategory.trim() || "Nouvelle catégorie" : "Sans catégorie")}
                {brands?.find((b) => b.id === form.brandId) || brandCreating ? (
                  <span className="ml-1.5 text-ink-400">·</span>
                ) : null}{" "}
                {brands?.find((b) => b.id === form.brandId)?.name ??
                  (brandCreating ? form.newBrand.trim() || "Nouvelle marque" : "")}
              </p>
              <h3 className="mt-1 line-clamp-1 font-display text-base font-semibold text-ink-950">
                {form.name.trim() || "Nom du produit"}
              </h3>
              <div className="mt-2 flex items-baseline gap-2">
                {price > 0 &&
                  (discountPercent !== null ? (
                    <>
                      <span className="text-sm text-ink-400 line-through">{formatFcfa(oldPrice)}</span>
                      <span className="font-mono text-base font-bold text-ink-950">{formatFcfa(price)}</span>
                      <span className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-green-700">
                        −{discountPercent}%
                      </span>
                    </>
                  ) : (
                    <span className="font-mono text-base font-bold text-ink-950">{formatFcfa(price)}</span>
                  ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-500">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      Number(form.stock) > 0 ? "bg-green-600" : "bg-red-400"
                    )}
                  />
                  {form.stock.trim() === "" ? "Stock non renseigné" : `${form.stock} en stock`}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon
                    name={form.isActive ? "eye" : "x"}
                    size={12}
                    className={form.isActive ? "text-green-700" : "text-ink-400"}
                  />
                  {form.isActive ? "Visible" : "Masqué"}
                </span>
              </div>
              {variants.some((v) => v.name.trim() && v.value.trim()) && (
                <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-gold-strong">
                  <Icon name="more" size={12} />
                  {variants.filter((v) => v.name.trim() && v.value.trim()).length} variante(s)
                </p>
              )}
            </div>
          </DashboardCard>

          <div className="rounded-2xl border border-line bg-surface p-4 text-xs leading-relaxed text-ink-500">
            <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
              <Icon name="sparkle" size={12} className="text-gold-strong" /> Bon à savoir
            </p>
            <ul className="space-y-1.5">
              <li>• Le slug est généré automatiquement depuis le nom.</li>
              <li>• Le stock des variantes est décrémenté à chaque commande.</li>
              <li>• Une remise n&apos;est affichée que si le prix barré est supérieur au prix.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Barre d'action collante */}
      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-2.5 border-t border-line bg-paper/90 px-4 py-3.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Link
          href="/espace-admin/produits"
          className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-medium text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-950"
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-ink-950 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-ink-950/15 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-700/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Création…
            </>
          ) : (
            <>
              <Icon name="check" size={14} strokeWidth={2.2} /> Créer le produit
            </>
          )}
        </button>
      </div>
    </form>
  );
}
