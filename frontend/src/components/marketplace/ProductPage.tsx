"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { catalogueApi } from "@/lib/api";
import { ApiError } from "@/lib/api/http";
import { productChatHref } from "@/lib/chat";
import { publicProductImage } from "@/lib/api/mappers";
import type { ApiProductDetail, ApiPublicProduct } from "@/lib/api/types";
import { cn, initials } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import Container from "@/components/ui/Container";
import BackButton from "@/components/ui/BackButton";
import ProductCard from "@/components/client/ProductCard";
import { EmptyState } from "@/components/client/ui/EmptyState";
import {
  IconAlert,
  IconArrowLeft,
  IconBag,
  IconChat,
  IconChevronRight,
  IconPackage,
  IconShield,
  IconStar,
  IconStore,
} from "@/components/client/icons";

/** Groupes de variantes (ex. Taille → S/M/L), dans l'ordre d'origine */
function variantGroups(
  variants: ApiProductDetail["variants"]
): Array<{ name: string; values: string[] }> {
  const map = new Map<string, string[]>();
  for (const v of variants) {
    const list = map.get(v.name) ?? [];
    if (!list.includes(v.value)) list.push(v.value);
    map.set(v.name, list);
  }
  return [...map.entries()].map(([name, values]) => ({ name, values }));
}

/** Petite rangée d'étoiles (note moyenne) */
function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <IconStar
          key={star}
          className={cn(
            "h-4 w-4",
            star <= Math.round(rating) ? "text-amber-400" : "text-gray-300"
          )}
        />
      ))}
    </span>
  );
}

/**
 * Fiche produit du Marketplace (/produit/:slug) — lien profond direct,
 * chargé via le backend (GET /products/public/by-slug/:slug). Réutilise
 * ProductCard pour les similaires et productChatHref pour la discussion.
 * « Commander » mène à la vraie boutique où le panier/checkout vit.
 */
export default function ProductPage({
  slug,
  storeSlug,
}: {
  slug: string;
  storeSlug?: string;
}) {
  const { formatPrice, t } = useTranslation();

  const [product, setProduct] = useState<ApiProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [similar, setSimilar] = useState<ApiPublicProduct[] | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const boutiqueSlug = storeSlug || product?.boutique.slug;
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/b/${boutiqueSlug}/produit/${product?.slug}`
      : "";
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const load = useCallback(() => {
    setError(null);
    setProduct(null);
    setSimilar(null);
    const fetcher = storeSlug
      ? catalogueApi.product(storeSlug, slug)
      : catalogueApi.productBySlug(slug);

    fetcher
      .then((p) => {
        // Sélection de variantes par défaut + état frais à chaque chargement
        const defaults: Record<string, string> = {};
        for (const g of variantGroups(p.variants)) {
          defaults[g.name] = g.values[0];
        }
        setSelected(defaults);
        setQty(1);
        setActiveImage(0);
        setProduct(p);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setError("not-found");
        } else {
          setError("Impossible de charger ce produit pour le moment.");
        }
      });
  }, [slug, storeSlug]);

  useEffect(() => {
    const t = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(t);
  }, [load, retryKey]);

  // Groupes de variantes (ex. Taille → S/M/L)
  const groups = useMemo(() => {
    if (!product) return [];
    return variantGroups(product.variants);
  }, [product]);

  // Prix = prix de base + surcharge des variantes sélectionnées (comme le backend)
  const selectedVariants = useMemo(() => {
    if (!product) return [];
    return product.variants.filter((v) => selected[v.name] === v.value);
  }, [product, selected]);

  const delta = selectedVariants.reduce(
    (sum, v) => sum + (v.priceDelta ? Number(v.priceDelta) : 0),
    0
  );
  const unitPrice = product ? Number(product.price) + delta : 0;
  const stock = product
    ? Math.min(
        product.stock,
        ...(selectedVariants.length
          ? selectedVariants.map((v) => v.stock)
          : [product.stock])
      )
    : 0;
  const inStock = stock > 0;

  const oldPrice =
    product?.oldPrice !== null && product?.oldPrice !== undefined
      ? Number(product.oldPrice)
      : null;
  const hasPromo = oldPrice !== null && oldPrice > unitPrice;
  const discount = hasPromo
    ? Math.round((1 - unitPrice / oldPrice) * 100)
    : 0;

  const rating = product
    ? product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
        product.reviews.length
      : 0
    : 0;

  // Produits similaires (même catégorie — réel, pas une fausse IA)
  useEffect(() => {
    if (!product || !product.category) return;
    let cancelled = false;
    catalogueApi
      .allProducts({
        category: product.category.slug,
        sort: "popular",
        limit: 6,
      })
      .then((res) => {
        if (!cancelled)
          setSimilar(res.items.filter((p) => p.id !== product.id).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setSimilar([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const discussHref = product
    ? productChatHref({
        boutiqueId: product.boutique.id,
        id: product.id,
        name: product.name,
        price: unitPrice,
        description: product.description ?? "",
        image: publicProductImage(product),
      })
    : null;

  /* ——— États : erreur / introuvable / chargement ——— */
  if (error === "not-found") {
    return (
      <Container className="px-5 pb-20 pt-16 sm:pt-20">
        <EmptyState
          icon={<IconPackage className="h-6 w-6" />}
          title="Produit introuvable"
          description={t.marketplace.productNotFound}
          action={
            <Link
              href="/marketplace"
              className="rounded-full bg-midnight-950 px-5 py-2.5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
            >
              Retour au marketplace
            </Link>
          }
        />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="px-5 pb-20 pt-16 sm:pt-20">
        <EmptyState
          icon={<IconAlert className="h-6 w-6" />}
          title={error}
          action={
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="cursor-pointer rounded-full bg-midnight-950 px-5 py-2.5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
            >
              {t.marketplace.productRetry}
            </button>
          }
        />
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="px-5 pb-20 pt-16 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-3xl border border-midnight-950/8 bg-white" />
          <div className="flex flex-col gap-4">
            <div className="h-8 w-2/3 animate-pulse rounded-2xl border border-midnight-950/8 bg-white" />
            <div className="h-6 w-1/3 animate-pulse rounded-2xl border border-midnight-950/8 bg-white" />
            <div className="h-24 animate-pulse rounded-2xl border border-midnight-950/8 bg-white" />
            <div className="h-14 animate-pulse rounded-2xl border border-midnight-950/8 bg-white" />
          </div>
        </div>
      </Container>
    );
  }

  const images = product.images.length > 0 ? product.images : [];

  return (
    <Container className="px-5 pb-14 pt-16 sm:pt-20 md:pb-20">
      {/* Navigation & Retour simple */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BackButton label="Retour" variant="light" fallbackUrl="/marketplace" />
        
        <div className="flex items-center gap-3">
          <nav aria-label="Fil d'Ariane" className="hidden sm:flex items-center gap-2 text-sm">
            <Link
              href="/marketplace"
              className="font-semibold text-midnight-950/60 transition-colors hover:text-gold-700"
            >
              Marketplace
            </Link>
            <span className="text-midnight-950/25">/</span>
            <Link
              href={`/b/${storeSlug || product.boutique.slug}`}
              className="font-semibold text-midnight-950/60 transition-colors hover:text-gold-700"
            >
              {product.boutique.name}
            </Link>
            <span className="text-midnight-950/25">/</span>
            <span className="truncate max-w-[200px] font-semibold text-midnight-950/80">
              {product.name}
            </span>
          </nav>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-full border border-midnight-950/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-midnight-950/80 transition-all hover:border-gold-400 hover:text-gold-700 active:scale-95 cursor-pointer shadow-sm"
            title="Copier le lien unique du produit"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span>{copied ? t.marketplace.productCopied : t.marketplace.productShare}</span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* ——— Galerie ——— */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-midnight-950/8 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeImage] ?? publicProductImage(product)}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            {hasPromo && (
              <span className="absolute left-4 top-4 rounded-full bg-terracotta px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                -{discount}%
              </span>
            )}
            {!inStock && (
              <span className="absolute left-4 top-4 rounded-full bg-midnight-950/80 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                Épuisé
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Voir l'image ${i + 1}`}
                  className={cn(
                    "h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 transition-all",
                    i === activeImage
                      ? "border-gold-500"
                      : "border-midnight-950/10 opacity-70 hover:opacity-100"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ——— Informations ——— */}
        <div className="flex flex-col gap-6">
          {product.category?.name && (
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-600">
              {product.category.name}
            </p>
          )}
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-midnight-950 sm:text-4xl">
            {product.name}
          </h1>

          {/* Boutique + note */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/b/${product.boutique.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-midnight-950/10 bg-white py-1.5 pl-1.5 pr-3 transition-all hover:border-gold-400/60"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-midnight-950 font-display text-xs font-bold text-gold-300">
                {initials(product.boutique.name) || "B"}
              </span>
              <span className="text-xs font-semibold text-midnight-950">
                {product.boutique.name}
              </span>
              {product.boutique.verificationStatus === "VERIFIED" && (
                <VerifiedBadge className="h-3.5 w-3.5" />
              )}
              <IconChevronRight className="h-3.5 w-3.5 text-midnight-950/40" />
            </Link>
            {rating > 0 && (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <Stars rating={rating} />
                <span className="font-semibold text-midnight-950/70">
                  {rating.toFixed(1)}
                </span>
                <span className="text-midnight-950/45">
                  ({product.reviews.length} {t.marketplace.productReviews})
                </span>
              </span>
            )}
          </div>

          {/* Prix */}
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-gold-600 sm:text-4xl">
              {formatPrice(unitPrice)}
            </span>
            {hasPromo && (
              <span className="text-lg text-midnight-950/35 line-through">
                {formatPrice(oldPrice)}
              </span>
            )}
            <span
              className={cn(
                "rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider",
                inStock
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-500"
              )}
            >
              {inStock
                ? stock <= 5
                  ? `${t.marketplace.productStockLimited} (${stock})`
                  : "En stock"
                : t.marketplace.productSoldOut}
            </span>
          </div>

          {/* Variantes */}
          {groups.length > 0 && (
            <div className="flex flex-col gap-3">
              {groups.map((group) => (
                <div key={group.name}>
                  <p className="text-xs font-bold uppercase tracking-wider text-midnight-950/60">
                    {group.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.values.map((value) => {
                      const variant = product.variants.find(
                        (v) => v.name === group.name && v.value === value
                      );
                      const active = selected[group.name] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setSelected((prev) => ({
                              ...prev,
                              [group.name]: value,
                            }))
                          }
                          disabled={(variant?.stock ?? 0) <= 0}
                          className={cn(
                            "cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40",
                            active
                              ? "border-midnight-950 bg-midnight-950 text-gold-300 shadow-sm"
                              : "border-midnight-950/15 bg-white text-midnight-950/70 hover:border-gold-400/60"
                          )}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* {t.marketplace.productQuantity} + actions */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-midnight-950/60">
                {t.marketplace.productQuantity}
              </span>
              <div className="inline-flex items-center rounded-full border border-midnight-950/12 bg-white">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label={t.marketplace.productDecreaseCount}
                  className="h-10 w-10 cursor-pointer rounded-l-full text-lg font-bold text-midnight-950/60 transition-colors hover:text-midnight-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-bold text-midnight-950">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(Math.max(stock, 1), q + 1))}
                  disabled={!inStock || qty >= stock}
                  aria-label={t.marketplace.productIncreaseCount}
                  className="h-10 w-10 cursor-pointer rounded-r-full text-lg font-bold text-midnight-950/60 transition-colors hover:text-midnight-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              {/* Commander → achat DIRECT : le produit entre au panier et la
                  {t.marketplace.productOrderHint}
                  la boutique, directement. */}
              <Link
                href={`/b/${product.boutique.slug}?product=${product.id}&commander=1`}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold transition-all",
                  inStock
                    ? "bg-midnight-950 text-gold-300 hover:bg-midnight-800"
                    : "pointer-events-none bg-midnight-950/15 text-midnight-950/40"
                )}
              >
                <IconBag className="h-5 w-5" />
                {inStock ? t.marketplace.productOrderNow : t.marketplace.productOrderSoldOut}
              </Link>
              {/* Discuter → messagerie interne (contexte produit conservé) */}
              {discussHref && (
                <Link
                  href={discussHref}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-midnight-950/15 bg-white px-6 py-4 text-sm font-semibold text-midnight-950/75 transition-all hover:border-gold-400/70 hover:text-midnight-950"
                >
                  <IconChat className="h-5 w-5 text-gold-600" />
                  Discuter avec le vendeur
                </Link>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-midnight-950/45">
              <IconShield className="h-3.5 w-3.5 text-gold-600" />
              {t.marketplace.productPublicOrder}
              la boutique.
            </p>
          </div>

          {/* Description */}
          <div className="border-t border-midnight-950/8 pt-6">
              <h2 className="font-display text-lg font-bold text-midnight-950">
                Description
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-midnight-950/65 whitespace-pre-wrap">
                {product.description || "Aucune description fournie par le vendeur."}
              </p>
            </div>

          {/* Réassurance boutique */}
          <div className="rounded-2xl border border-midnight-950/8 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-midnight-950 font-display text-sm font-bold text-gold-300">
                  {initials(product.boutique.name) || "B"}
                </span>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-bold text-midnight-950">
                    {product.boutique.name}
                    {product.boutique.verificationStatus === "VERIFIED" && (
                      <VerifiedBadge className="h-3.5 w-3.5" />
                    )}
                  </p>
                  <p className="text-xs text-midnight-950/50">
                    {t.marketplace.productVerifiedSeller}
                  </p>
                </div>
              </div>
              <Link
                href={`/b/${product.boutique.slug}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-midnight-950/15 px-4 py-2 text-xs font-bold text-midnight-950/70 transition-all hover:border-gold-400/60 hover:text-gold-700"
              >
                <IconStore className="h-3.5 w-3.5 text-gold-600" />
                Voir la boutique
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ——— Avis ——— */}
      <section aria-labelledby="product-reviews-title" className="mt-16">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id="product-reviews-title"
              className="font-display text-xl font-bold text-midnight-950"
            >
              Avis clients
            </h2>
            {rating > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Stars rating={rating} />
                <span className="text-sm font-semibold text-midnight-950/70">
                  {rating.toFixed(1)} / 5
                </span>
                <span className="text-sm text-midnight-950/45">
                  · {product.reviews.length} {t.marketplace.productReviews}
                </span>
              </span>
            )}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {product.reviews.slice(0, 6).map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-midnight-950/8 bg-white p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-midnight-950">
                    {review.author}
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-midnight-950/40">
                    {new Date(review.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <Stars rating={review.rating} className="mt-2" />
                {review.comment && (
                  <p className="mt-2.5 text-sm leading-relaxed text-midnight-950/65">
                    {review.comment}
                  </p>
                )}
              </article>
            ))}
          </div>
          {product.reviews.length === 0 && (
            <div className="rounded-2xl border border-dashed border-midnight-950/15 bg-white/50 p-8 text-center mt-5">
              <p className="text-sm font-medium text-midnight-950/50">Aucun avis pour le moment.</p>
              <p className="mt-1 text-xs text-midnight-950/40">Soyez le premier à donner votre avis après l'achat !</p>
            </div>
          )}
        </section>

      {/* ——— Produits similaires ——— */}
      {similar !== null && similar.length > 0 && (
        <section aria-labelledby="product-similar-title" className="mt-16">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-600">
                {t.marketplace.productSameCategory}
              </p>
              <h2
                id="product-similar-title"
                className="mt-1 font-display text-2xl font-bold text-midnight-950 sm:text-3xl"
              >
                Produits similaires
              </h2>
            </div>
            <Link
              href="/marketplace"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-gold-700 transition-colors hover:text-gold-600"
            >
              Tout voir
              <IconChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
