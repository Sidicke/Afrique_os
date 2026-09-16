"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  defaultVariant,
  type Product,
  type ProductVariant,
  type Review,
  formatPrice,
  productRating,
  productReviewCount,
  stockLabel,
} from "@/constants/store";
import { productChatHref } from "@/lib/chat";
import { productPrice } from "@/lib/shopConfig";
import { useShopConfig } from "@/lib/useShopConfig";
import { useCatalogueStore } from "@/lib/useCatalogueStore";
import { useCart } from "./CartProvider";
import AssetImage from "@/components/ui/AssetImage";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { RatingStars } from "./RatingStars";
import { PromoBadge } from "./PromoBadge";
import { PromoPrice } from "./PromoPrice";
import {
  IconBox,
  IconCart,
  IconChat,
  IconCheck,
  IconClose,
  IconLock,
  IconSend,
  IconStar,
  IconTruck,
} from "./icons";

interface ProductDetailValue {
  open: (product: Product) => void;
  close: () => void;
  /** Avis d'un produit : avis du catalogue + avis soumis par les visiteurs */
  reviewsFor: (product: Pick<Product, "id" | "reviews">) => Review[];
  /** Publie un avis : la note moyenne et le compteur se recalculent à l'instant */
  addReview: (
    productId: string,
    input: { author: string; rating: number; comment: string }
  ) => void;
}

const ProductDetailContext = createContext<ProductDetailValue | null>(null);

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Date du jour en français, ex. « 1 août 2026 » */
function todayFr(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Clé localStorage des avis soumis par les visiteurs (persistants) */
const USER_REVIEWS_KEY = "zennshop:user-reviews";

/** Garde-fou : un avis persisté doit avoir une forme connue */
function isReview(value: unknown): value is Review {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.author === "string" &&
    typeof r.rating === "number" &&
    r.rating >= 1 &&
    r.rating <= 5 &&
    typeof r.comment === "string" &&
    typeof r.date === "string"
  );
}

/** Relit les avis visiteurs persistés (échec silencieux si stockage indisponible) */
function loadUserReviews(): Record<string, Review[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USER_REVIEWS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const result: Record<string, Review[]> = {};
    for (const [productId, value] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      if (Array.isArray(value)) {
        const valid = value.filter(isReview);
        if (valid.length > 0) result[productId] = valid;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/** Store externe local au provider : avis visiteurs + abonnés (useSyncExternalStore) */
interface ReviewsStore {
  reviews: Record<string, Review[]>;
  listeners: Set<() => void>;
}

/** Snapshot vide partagé — référence stable exigée par useSyncExternalStore */
const EMPTY_REVIEWS: Record<string, Review[]> = {};

function createReviewsStore(): ReviewsStore {
  const reviews = loadUserReviews();
  return {
    // Référence partagée : le diff post-hydratation reste un no-op quand il
    // n'y a aucun avis persisté (évite un re-render inutile de toute la page).
    reviews: Object.keys(reviews).length === 0 ? EMPTY_REVIEWS : reviews,
    listeners: new Set(),
  };
}

/**
 * Fournisseur du détail produit : expose `open(product)` et affiche un
 * modal de grande taille (image, description, mini-détails, variantes,
 * avis dynamiques + formulaire pour donner son avis).
 */
export default function ProductDetailProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [justAdded, setJustAdded] = useState(false);
  const { add, openCartAtCheckout } = useCart();
  const config = useShopConfig();
  const catalogue = useCatalogueStore();

  // Avis des visiteurs : store persistant (localStorage). useSyncExternalStore
  // avec getServerSnapshot garantit un rendu serveur identique au client
  // (pas de mismatch d'hydratation) tout en restaurant les avis persistés
  // après hydratation — sans setState dans un effet.
  const reviewsStoreRef = useRef<ReviewsStore | null>(null);
  if (reviewsStoreRef.current === null) {
    reviewsStoreRef.current = createReviewsStore();
  }
  const reviewsStore = reviewsStoreRef.current;

  const subscribe = useCallback(
    (listener: () => void) => {
      reviewsStore.listeners.add(listener);
      return () => {
        reviewsStore.listeners.delete(listener);
      };
    },
    [reviewsStore]
  );
  const getSnapshot = useCallback(() => reviewsStore.reviews, [reviewsStore]);
  const getServerSnapshot = useCallback(() => EMPTY_REVIEWS, []);

  const userReviews = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const open = useCallback((p: Product) => {
    setProduct(p);
    setSelectedVariant(p.variants[0] ?? null);
    // Réinitialise le feedback « Ajouté ✓ » pour éviter un état obsolète
    setJustAdded(false);
  }, []);
  const close = useCallback(() => setProduct(null), []);

  const reviewsFor = useCallback(
    (p: Pick<Product, "id" | "reviews">): Review[] => [
      ...(userReviews[p.id] ?? []),
      ...p.reviews,
    ],
    [userReviews]
  );

  const addReview = useCallback(
    (productId: string, input: { author: string; rating: number; comment: string }) => {
      const review: Review = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        author: input.author.trim(),
        rating: input.rating,
        comment: input.comment.trim(),
        date: todayFr(),
      };
      const next = {
        ...reviewsStore.reviews,
        [productId]: [review, ...(reviewsStore.reviews[productId] ?? [])],
      };
      reviewsStore.reviews = next;
      try {
        window.localStorage.setItem(USER_REVIEWS_KEY, JSON.stringify(next));
      } catch {
        // Stockage indisponible (navigation privée, quota…) : l'avis reste en mémoire
      }
      for (const listener of reviewsStore.listeners) listener();
    },
    [reviewsStore]
  );

  // Bloque le scroll du body + fermeture sur Échap
  useEffect(() => {
    if (!product) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [product, close]);



  const value = useMemo(
    () => ({ open, close, reviewsFor, addReview }),
    [open, close, reviewsFor, addReview]
  );

  const handleAdd = () => {
    if (!product) return;
    add(product, selectedVariant ?? defaultVariant(product));
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  };

  // « Commander » : ajoute, ferme le modal puis ouvre la commande DIRECTEMENT
  // (étape « Vos coordonnées ») — l'acheteur n'a pas à repasser par le panier.
  const handleOrder = () => {
    if (!product) return;
    add(product, selectedVariant ?? defaultVariant(product));
    close();
    openCartAtCheckout();
  };

  // Avis visibles : avis du catalogue + avis soumis par les visiteurs.
  // Mémoïsé : `reviewsFor` change d'identité quand userReviews change, et une
  // référence instable casserait la mémoïsation manuelle du useMemo ci-dessous
  // (règle React Compiler preserve-manual-memoization).
  const reviews = useMemo(
    () => (product ? reviewsFor(product) : []),
    [product, reviewsFor]
  );
  const rating = productRating(reviews);
  const reviewCount = productReviewCount(reviews);

  // Promotion éventuelle du produit affiché (prix barré + badge animé)
  const priceInfo = product ? productPrice(config, product) : null;

  // Distribution des notes (5 → 1) pour les barres de synthèse
  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const review of reviews) {
      const index = Math.min(5, Math.max(1, Math.round(review.rating))) - 1;
      counts[5 - index - 1] = (counts[5 - index - 1] ?? 0) + 1;
    }
    return counts; // [5★, 4★, 3★, 2★, 1★]
  }, [reviews]);

  return (
    <ProductDetailContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {product && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Backdrop */}
            <button
              type="button"
              aria-label="Fermer les détails"
              className="absolute inset-0 h-full w-full cursor-default bg-midnight-950/60 backdrop-blur-sm"
              onClick={close}
            />

            {/* Panneau */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Détails de ${product.name}`}
              className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-midnight-950/60 shadow-sm transition-colors hover:bg-white hover:text-midnight-950"
              >
                <IconClose className="h-4 w-4" />
              </button>

              <div className="grid max-h-[85vh] grid-cols-1 overflow-y-auto md:grid-cols-2">
                {/* Visuel — carré constant, jamais étiré */}
                <div className="relative aspect-square bg-ivory-50">
                  <AssetImage
                    src={product.image}
                    alt={product.name}
                    label={product.name}
                    priority
                    className="object-contain p-6"
                  />
                  {/* Badges sur l'image : promotion puis disponibilité */}
                  <div className="absolute left-4 top-4 flex flex-col items-start gap-2">
                    {priceInfo?.percent && (
                      <PromoBadge percent={priceInfo.percent} size="lg" />
                    )}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${
                        product.stock > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          product.stock > 0 ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      {stockLabel(product.stock)}
                    </span>
                  </div>
                </div>

                {/* Infos */}
                <div className="flex flex-col gap-4 p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-600">
                      {product.category}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-midnight-950/35">
                      Réf. {product.sku}
                    </p>
                  </div>

                  <h2 className="font-display text-2xl font-bold text-midnight-950 sm:text-3xl">
                    {product.name}
                  </h2>

                  {/* Note dynamique */}
                  <div className="flex items-center gap-2">
                    <RatingStars rating={rating} size="h-4 w-4" />
                    <span className="text-sm font-semibold text-midnight-950">
                      {rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-midnight-950/50">
                      ({reviewCount} avis)
                    </span>
                  </div>

                  {priceInfo?.percent ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <PromoPrice
                        base={priceInfo.base}
                        current={priceInfo.current}
                        percent={priceInfo.percent}
                        size="lg"
                      />
                      <PromoBadge percent={priceInfo.percent} size="lg" />
                    </div>
                  ) : (
                    <p className="font-display text-3xl font-semibold text-gold-600">
                      {formatPrice(product.price)}
                    </p>
                  )}

                  {/* Description — bien visible sous le prix */}
                  {config.isVerified && (
                    <p className="flex items-center gap-2 rounded-xl border border-gold-400/30 bg-gold-400/10 px-3 py-2.5">
                      <VerifiedBadge className="h-5 w-5 shrink-0" />
                      <span className="text-xs font-semibold text-midnight-950/80">
                        Produit proposé par une boutique vérifiée
                      </span>
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-midnight-950/70">
                    {product.description}
                  </p>

                  {/* Mini-détails de confiance */}
                  <div className="grid gap-2.5 rounded-2xl border border-midnight-950/8 bg-ivory-50/60 p-4">
                    <p className="flex items-start gap-2.5 text-xs text-midnight-950/70">
                      <IconTruck className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                      {config.deliveryNote}
                    </p>
                    <p className="flex items-start gap-2.5 text-xs text-midnight-950/70">
                      <IconBox className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                      {config.warrantyNote}
                    </p>
                    <p className="flex items-start gap-2.5 text-xs text-midnight-950/70">
                      <IconLock className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                      {config.paymentNote}
                    </p>
                  </div>

                  {/* Variantes */}
                  {product.variants.length > 0 && (
                    <div>
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-midnight-950/50">
                        Variante
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.map((variant) => (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedVariant(variant)}
                            aria-pressed={selectedVariant?.id === variant.id}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                              selectedVariant?.id === variant.id
                                ? "border-gold-400 bg-gold-400/15 text-midnight-950"
                                : "border-midnight-950/15 text-midnight-950/60 hover:border-gold-400/60 hover:text-midnight-950"
                            }`}
                          >
                            {variant.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-2 flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={product.stock <= 0}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-400 px-6 py-3.5 text-sm font-semibold text-midnight-950 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
                    >
                      <IconCart className="h-4 w-4" />
                      {justAdded ? "Ajouté ✓" : "Ajouter au panier"}
                    </button>
                    <button
                      type="button"
                      onClick={handleOrder}
                      disabled={product.stock <= 0}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-midnight-950 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-midnight-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
                    >
                      <IconCart className="h-4 w-4" />
                      Commander
                    </button>
                    {/* Discuter — messagerie client avec le contexte du produit
                        (la connexion client est requise, le chat affiche la
                        fiche produit et pré-remplit le premier message) */}
                    {catalogue.boutiqueId && (
                      <Link
                        href={productChatHref({
                          boutiqueId: catalogue.boutiqueId,
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          description: product.description,
                          image: product.image,
                        })}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-midnight-950/15 px-6 py-3.5 text-sm font-semibold text-midnight-950/75 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400/70 hover:text-midnight-950"
                      >
                        <IconChat className="h-4 w-4" />
                        Discuter avec le vendeur
                      </Link>
                    )}
                  </div>
                </div>

                {/* Avis clients (dynamiques + formulaire) */}
                <div className="border-t border-midnight-950/8 px-6 py-6 sm:px-8 md:col-span-2">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="sm:max-w-[220px]">
                      <h3 className="font-display text-lg font-bold text-midnight-950">
                        Avis clients ({reviewCount})
                      </h3>
                      {reviewCount > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {distribution.map((count, index) => {
                            const star = 5 - index;
                            const pct =
                              reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
                            return (
                              <div
                                key={star}
                                className="flex items-center gap-2"
                              >
                                <span className="w-7 shrink-0 text-xs font-medium text-midnight-950/60">
                                  {star}★
                                </span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-midnight-950/10">
                                  <div
                                    className="h-full rounded-full bg-gold-400"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-4 shrink-0 text-right text-xs text-midnight-950/45">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <ReviewForm
                      productId={product.id}
                      onSubmit={(input) => addReview(product.id, input)}
                    />
                  </div>

                  <ul className="mt-6 space-y-4">
                    {reviews.map((review) => (
                      <li
                        key={review.id}
                        className="rounded-2xl border border-midnight-950/8 bg-ivory-50/60 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-midnight-950">
                            {review.author}
                          </p>
                          <span className="text-xs text-midnight-950/45">
                            {review.date}
                          </span>
                        </div>
                        <div className="mt-1">
                          <RatingStars rating={review.rating} size="h-3.5 w-3.5" />
                        </div>
                        <p className="mt-1.5 text-sm text-midnight-950/70">
                          {review.comment}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ProductDetailContext.Provider>
  );
}

/** Formulaire « Donner votre avis » — publie et recale la note instantanément */
function ReviewForm({
  productId,
  onSubmit,
}: {
  productId: string;
  onSubmit: (input: { author: string; rating: number; comment: string }) => void;
}) {
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState(false);
  const [published, setPublished] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !comment.trim() || rating < 1) {
      setError(true);
      return;
    }
    onSubmit({ author, rating, comment });
    setError(false);
    setPublished(true);
    setAuthor("");
    setRating(0);
    setComment("");
  };

  if (published) {
    return (
      <div
        className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 sm:max-w-md sm:p-5"
        role="status"
      >
        <div className="flex items-center gap-3 text-sm font-medium text-emerald-700">
          <IconCheck className="h-5 w-5 shrink-0" />
          Merci pour votre avis ! Il est maintenant publié.
        </div>
        <button
          type="button"
          onClick={() => setPublished(false)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 underline-offset-2 transition-colors hover:text-emerald-800 hover:underline cursor-pointer"
        >
          Laisser un autre avis
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-midnight-950/8 bg-white p-4 shadow-sm sm:max-w-md sm:p-5"
      aria-label="Donner votre avis"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-600">
        Donner votre avis
      </p>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          Merci de renseigner votre nom, votre note et un commentaire.
        </p>
      )}

      <div className="mt-3">
        <label
          htmlFor={`review-author-${productId}`}
          className="mb-1 block text-xs font-medium text-midnight-950/70"
        >
          Votre nom
        </label>
        <input
          id={`review-author-${productId}`}
          type="text"
          value={author}
          maxLength={60}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Ex. : Aminata K."
          className="w-full rounded-lg border border-midnight-950/15 bg-white px-3 py-2 text-sm text-midnight-950 placeholder:text-midnight-950/30 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
        />
      </div>

      <div className="mt-3">
        <span className="mb-1 block text-xs font-medium text-midnight-950/70">
          Votre note
        </span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Votre note">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-label={`Noter ${star} étoile${star > 1 ? "s" : ""}`}
              role="radio"
              aria-checked={rating === star}
              className="rounded-full p-1 transition-transform hover:scale-110 cursor-pointer"
            >
              <IconStar
                className={`h-6 w-6 ${star <= rating ? "text-amber-400" : "text-gray-300"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label
          htmlFor={`review-comment-${productId}`}
          className="mb-1 block text-xs font-medium text-midnight-950/70"
        >
          Votre avis
        </label>
        <textarea
          id={`review-comment-${productId}`}
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre expérience avec ce produit…"
          className="w-full resize-none rounded-lg border border-midnight-950/15 bg-white px-3 py-2 text-sm text-midnight-950 placeholder:text-midnight-950/30 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
        />
      </div>

      <button
        type="submit"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-midnight-950 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-midnight-800 cursor-pointer"
      >
        <IconSend className="h-4 w-4" />
        Publier mon avis
      </button>
    </form>
  );
}

export function useProductDetail(): ProductDetailValue {
  const ctx = useContext(ProductDetailContext);
  if (!ctx)
    throw new Error(
      "useProductDetail doit être utilisé dans <ProductDetailProvider>"
    );
  return ctx;
}
