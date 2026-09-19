"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { routes } from "@/lib/urls/routes";
import { catalogueApi, searchApi, shopsApi } from "@/lib/api";
import { publicProductImage } from "@/lib/api/mappers";
import type { ApiBoutiqueCard, ApiPublicProduct } from "@/lib/api/types";
import type { ApiSearchCategory, ApiSearchResults } from "@/lib/api/search";
import ProductCard from "@/components/client/ProductCard";
import ShopCard from "@/components/client/ShopCard";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import {
  IconSearch,
  IconStore,
  IconPackage,
  IconSmartphone,
  IconShirt,
  IconSparkle,
  IconHeadphones,
  IconBag,
  IconArmchair,
  IconTag,
  IconX,
} from "@/components/client/icons";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { SkeletonBlock } from "@/components/client/ui/Skeleton";
import BackButton from "@/components/ui/BackButton";

const POPULAR_CATEGORIES = [
  { label: "Électronique", icon: IconSmartphone, slug: "telephone" },
  { label: "Mode & Tissus", icon: IconShirt, slug: "mode" },
  { label: "Beauté & Soins", icon: IconSparkle, slug: "beaute" },
  { label: "Audio & Son", icon: IconHeadphones, slug: "audio" },
  { label: "Accessoires", icon: IconBag, slug: "accessoires" },
  { label: "Mobilier & Déco", icon: IconArmchair, slug: "mobilier" },
];

const POPULAR_SUGGESTIONS = [
  "Smartphone",
  "Robe en pagne",
  "Écouteurs sans fil",
  "Karité bio",
  "Wax Hollandais",
  "Sandales cuir",
];

type ActiveTab = "all" | "products" | "shops";
type SortOption = "relevance" | "price_asc" | "price_desc" | "name_asc";

export default function SearchResults() {
  const { formatPrice, t } = useTranslation();

  const router = useRouter();
  const params = useSearchParams();

  const qParam = (params.get("q") ?? "").trim();
  const categoryParam = (params.get("category") ?? params.get("cat") ?? "").trim();

  const activeQuery = qParam || categoryParam;
  const isCategorySearch = !qParam && Boolean(categoryParam);

  const [inputValue, setInputValue] = useState(qParam);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  // Résultats de la recherche soumise
  const [boutiques, setBoutiques] = useState<ApiBoutiqueCard[] | null>(null);
  const [produits, setProduits] = useState<ApiPublicProduct[] | null>(null);
  const [categories, setCategories] = useState<ApiSearchCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // Suggestions en direct lors de la frappe
  const [liveSuggestions, setLiveSuggestions] = useState<ApiSearchResults | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Produits & Boutiques affichés par défaut AVANT de taper une recherche
  const [initialProducts, setInitialProducts] = useState<ApiPublicProduct[]>([]);
  const [initialShops, setInitialShops] = useState<ApiBoutiqueCard[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);

  // Historique des recherches récentes (localStorage)
  const RECENT_KEY = "zennshop:recent_searches";
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveRecentSearch = (term: string) => {
    const clean = term.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim().slice(0, 100);
    if (!clean) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== clean.toLowerCase());
      const next = [clean, ...filtered].slice(0, 6);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // LocalStorage non disponible
      }
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // LocalStorage non disponible
    }
  };

  // Synchronise la valeur de l'input quand l'URL change
  useEffect(() => {
    setInputValue(qParam);
  }, [qParam]);

  // Chargement des articles initiaux si aucune recherche n'est active
  useEffect(() => {
    if (!activeQuery) {
      setInitialLoading(true);
      Promise.all([
        catalogueApi.allProducts({ limit: 8, sort: "popular" }),
        shopsApi.publicList(),
      ])
        .then(([page, shops]) => {
          setInitialProducts(page.items ?? []);
          setInitialShops(shops.slice(0, 3));
        })
        .catch(() => {
          // Repli silencieux
        })
        .finally(() => {
          setInitialLoading(false);
        });
    }
  }, [activeQuery]);

  // Chargement des suggestions en direct lors de la saisie (debounced et assaini)
  useEffect(() => {
    const trimmed = inputValue.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim().slice(0, 100);
    if (!trimmed || trimmed.length < 2) {
      setLiveSuggestions(null);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    const timeout = setTimeout(() => {
      searchApi
        .global(trimmed)
        .then((res) => {
          setLiveSuggestions(res);
        })
        .catch(() => {
          setLiveSuggestions(null);
        })
        .finally(() => {
          setSuggestionsLoading(false);
        });
    }, 180);

    return () => clearTimeout(timeout);
  }, [inputValue]);

  // Fermer le dropdown de propositions si on clique en dehors ou presse Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Chargement des résultats complets de la page
  const load = useCallback(() => {
    if (!activeQuery) {
      setBoutiques(null);
      setProduits(null);
      setCategories([]);
      return;
    }

    setLoading(true);
    setBoutiques(null);
    setProduits(null);
    setCategories([]);

    searchApi
      .global(activeQuery)
      .then((res) => {
        setBoutiques(res.boutiques ?? []);
        setProduits(res.produits ?? []);
        setCategories(res.categories ?? []);
      })
      .catch(() => {
        setBoutiques([]);
        setProduits([]);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, [activeQuery]);

  useEffect(() => {
    const t = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const totalBoutiques = boutiques?.length ?? 0;
  const totalProduits = produits?.length ?? 0;
  const totalResults = totalBoutiques + totalProduits;

  // Tri dynamique des produits
  const sortedProduits = useMemo(() => {
    if (!produits) return [];
    const list = [...produits];
    switch (sortBy) {
      case "price_asc":
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      case "price_desc":
        return list.sort((a, b) => Number(b.price) - Number(a.price));
      case "name_asc":
        return list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
      case "relevance":
      default:
        return list;
    }
  }, [produits, sortBy]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowDropdown(false);
    const cleaned = inputValue.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim().slice(0, 100);
    if (cleaned) {
      saveRecentSearch(cleaned);
      router.push(`/recherche?q=${encodeURIComponent(cleaned)}`);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setLiveSuggestions(null);
    setShowDropdown(false);
    router.push("/recherche");
  };

  // Rendu de la barre de recherche avec le menu déroulant de propositions
  const renderSearchBar = (isHero = false) => {
    const hasLiveResults =
      liveSuggestions &&
      ((liveSuggestions.produits?.length ?? 0) > 0 ||
        (liveSuggestions.boutiques?.length ?? 0) > 0 ||
        (liveSuggestions.categories?.length ?? 0) > 0);

    return (
      <div
        ref={searchContainerRef}
        className={cn(
          "relative w-full",
          isHero ? "max-w-2xl" : "max-w-2xl"
        )}
      >
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex w-full items-center"
        >
          <div
            className={cn(
              "relative flex w-full items-center overflow-hidden rounded-2xl border bg-white p-1.5 shadow-sm transition-all focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-400/20",
              isHero
                ? "border-midnight-950/15 p-2 shadow-lg shadow-midnight-950/[0.04]"
                : "border-midnight-950/15"
            )}
          >
            <span className="pl-3.5 text-ink-400">
              <IconSearch className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={inputValue}
              maxLength={100}
              autoComplete="off"
              spellCheck={false}
              autoCorrect="off"
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => {
                setShowDropdown(true);
              }}
              placeholder="Rechercher un produit, une marque, une boutique..."
              aria-label="Rechercher un produit, une marque ou une boutique"
              className={cn(
                "w-full bg-transparent px-3 py-1.5 text-midnight-950 placeholder:text-ink-400 focus:outline-none",
                isHero ? "text-sm sm:text-base" : "text-sm"
              )}
            />

            {/* Indicateur de chargement discret lors de la frappe */}
            {suggestionsLoading && (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
            )}

            {inputValue && !suggestionsLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-ink-400 hover:text-midnight-950 transition-colors mr-1 cursor-pointer"
                aria-label="Effacer la saisie"
              >
                <IconX className="h-4 w-4" />
              </button>
            )}

            <button
              type="submit"
              className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-xl bg-midnight-950 px-5 font-bold text-gold-300 transition-colors hover:bg-midnight-800 cursor-pointer",
                isHero ? "h-11 text-sm" : "h-10 text-xs"
              )}
            >
              Rechercher
            </button>
          </div>
        </form>

        {/* ── Menu déroulant des recherches récentes ──────────── */}
        {showDropdown && inputValue.trim().length < 2 && recentSearches.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-midnight-950/10 bg-white p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between px-1 pb-2 border-b border-midnight-950/5 mb-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-400 flex items-center gap-1.5">
                <IconSearch className="h-3 w-3 text-gold-600" />
                {t.marketplace.searchRecent}
              </span>
              <button
                type="button"
                onClick={clearRecentSearches}
                className="text-[11px] font-semibold text-ink-400 hover:text-midnight-950 transition-colors cursor-pointer"
              >
                Effacer
              </button>
            </div>
            <div className="flex flex-wrap gap-2 px-1 pt-1">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setInputValue(term);
                    saveRecentSearch(term);
                    setShowDropdown(false);
                    router.push(`/recherche?q=${encodeURIComponent(term)}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-gray-50/80 px-3 py-1.5 text-xs font-semibold text-midnight-950 hover:border-gold-500 hover:bg-gold-50 hover:text-midnight-950 transition-all cursor-pointer"
                >
                  <span className="text-ink-400 text-[10px]">⏱</span>
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Menu déroulant des propositions en direct ──────────── */}
        {showDropdown && inputValue.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[440px] overflow-y-auto rounded-2xl border border-midnight-950/10 bg-white p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
            {suggestionsLoading && !hasLiveResults ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-ink-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
                <span>Recherche des suggestions...</span>
              </div>
            ) : !hasLiveResults ? (
              <div className="py-4 text-center text-xs text-ink-500">
                <>{t.marketplace.searchNoDirect}</>
              </div>
            ) : (
              <div className="space-y-4 divide-y divide-midnight-950/5">
                {/* Rayons / Catégories suggérées */}
                {liveSuggestions?.categories && liveSuggestions.categories.length > 0 && (
                  <div className="pb-2">
                    <span className="px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      Rayons correspondants
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
                      {liveSuggestions.categories.slice(0, 3).map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/recherche?category=${encodeURIComponent(cat.slug)}`}
                          onClick={() => setShowDropdown(false)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-gray-50 px-3 py-1 text-xs font-medium text-midnight-950 hover:border-gold-500 hover:bg-gold-50 transition-colors"
                        >
                          <IconTag className="h-3 w-3 text-gold-600" />
                          <span>{cat.name}</span>
                          {cat.productsCount > 0 && (
                            <span className="font-mono text-[10px] text-ink-400">({cat.productsCount})</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boutiques suggérées */}
                {liveSuggestions?.boutiques && liveSuggestions.boutiques.length > 0 && (
                  <div className="pt-2">
                    <span className="px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      Boutiques
                    </span>
                    <div className="mt-1 space-y-1">
                      {liveSuggestions.boutiques.slice(0, 2).map((shop) => (
                        <Link
                          key={shop.id}
                          href={`/b/${shop.slug}`}
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center justify-between rounded-xl p-2 transition-colors hover:bg-gold-50/70"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-midnight-950 font-display text-xs font-bold text-gold-300">
                              <IconStore className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-bold text-midnight-950">
                                  {shop.name}
                                </p>
                                {shop.verificationStatus === "VERIFIED" && (
                                  <VerifiedBadge className="h-3.5 w-3.5 shrink-0" />
                                )}
                              </div>
                              <p className="truncate text-[11px] text-ink-500">
                                {shop.city ? `${shop.city} · ` : ""}{shop.productsCount} article{shop.productsCount > 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-gold-700">Visiter →</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Produits suggérés */}
                {liveSuggestions?.produits && liveSuggestions.produits.length > 0 && (
                  <div className="pt-2">
                    <span className="px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      {t.marketplace.searchSuggestedProducts}
                    </span>
                    <div className="mt-1 space-y-1">
                      {liveSuggestions.produits.slice(0, 4).map((p) => {
                        const img = publicProductImage(p);
                        const productUrl = p.boutique?.slug
                          ? routes.product(p.boutique.slug, p.slug)
                          : `/produit/${p.slug}`;
                        return (
                          <Link
                            key={p.id}
                            href={productUrl}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gold-50/70"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 ring-1 ring-midnight-950/5">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={img} alt={p.name} className="h-full w-full object-cover" />
                              ) : (
                                <IconPackage className="h-4 w-4 text-ink-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-midnight-950">
                                {p.name}
                              </p>
                              {p.boutique?.name && (
                                <p className="truncate text-[11px] text-ink-500">
                                  {p.boutique.name}
                                </p>
                              )}
                            </div>
                            <span className="font-mono text-xs font-bold text-midnight-950 whitespace-nowrap">
                              {formatPrice(p.price)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bouton pour lancer la recherche complète */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit()}
                    className="flex w-full items-center justify-between rounded-xl bg-midnight-950/5 px-3 py-2 text-xs font-bold text-midnight-950 transition-colors hover:bg-midnight-950 hover:text-gold-300"
                  >
                    <span>{t.marketplace.searchSeeAll} « {inputValue.trim()} »</span>
                    <span className="font-mono text-[11px] text-ink-400">Entrée ↵</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── 1. État Accueil (recherche vide) ──────────────────────────
  if (!activeQuery) {
    return (
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col items-center px-4 pb-16 pt-2 sm:px-6 sm:pb-24 lg:px-8">
        {/* Barre de navigation haute avec bouton retour bien visible */}
        <div className="w-full flex items-center justify-between pb-5 mb-8 border-b border-midnight-950/8">
          <BackButton label="Retour au Marketplace" variant="light" fallbackUrl="/marketplace" />
          <nav aria-label="Fil d'ariane" className="hidden sm:flex items-center gap-2 text-xs font-semibold text-ink-500">
            <Link href="/marketplace" className="hover:text-midnight-950 transition-colors">
              Marketplace
            </Link>
            <span className="text-midnight-950/20">/</span>
            <span className="text-midnight-950">Recherche</span>
          </nav>
        </div>

        <div className="relative flex w-full max-w-3xl flex-col items-center text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/10 px-3.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-gold-700">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-pulse" />
            Marketplace ZennShop
          </span>

          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-midnight-950 sm:text-5xl">
            Trouvez les meilleurs produits &amp; boutiques
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-600 sm:text-base">
            {t.marketplace.searchIntroTitle}
          </p>

          {/* Formulaire de recherche avec suggestions en direct */}
          <div className="mt-8 w-full flex justify-center">
            {renderSearchBar(true)}
          </div>

          {/* Catégories populaires en accès rapide */}
          <div className="mt-10 w-full">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ink-400">
              {t.marketplace.searchPopCat}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              {POPULAR_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <Link
                    key={cat.slug}
                    href={`/recherche?category=${encodeURIComponent(cat.slug)}`}
                    className="group flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-midnight-950 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-500 hover:bg-gold-50/50 hover:shadow"
                  >
                    <IconComponent className="h-4 w-4 text-gold-600 transition-transform group-hover:scale-110" />
                    <span>{cat.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mots-clés suggérés */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-500">
            <span className="font-medium text-ink-400">Tendances :</span>
            {POPULAR_SUGGESTIONS.map((sug) => (
              <Link
                key={sug}
                href={`/recherche?q=${encodeURIComponent(sug)}`}
                className="rounded-full bg-midnight-950/5 px-3 py-1 font-medium text-midnight-950/70 transition-colors hover:bg-gold-400/20 hover:text-midnight-950"
              >
                {sug}
              </Link>
            ))}
          </div>
        </div>

        {/* ── ARTICLES POPULAIRES PRÉSENTS AVANT DE TAPER UN MOT ──── */}
        <div className="mt-16 w-full max-w-screen-2xl">
          <div className="mb-6 flex items-center justify-between border-b border-midnight-950/8 pb-4">
            <div className="flex items-center gap-2.5">
              <IconSparkle className="h-5 w-5 text-gold-600" />
              <div>
                <h2 className="font-display text-lg font-bold text-midnight-950 sm:text-xl">
                  {t.marketplace.searchPopArticles}
                </h2>
                <p className="text-xs text-ink-500">
                  {t.marketplace.searchPopArticlesDesc}
                </p>
              </div>
            </div>
            <Link
              href="/marketplace"
              className="text-xs font-bold text-gold-700 hover:text-midnight-950 transition-colors"
            >
              Explorer le catalogue →
            </Link>
          </div>

          {initialLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-64 rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {initialProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* ── BOUTIQUES EN VEDETTE AVANT DE TAPER ─────────────────── */}
        {initialShops.length > 0 && (
          <div className="mt-16 w-full max-w-screen-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-midnight-950/8 pb-4">
              <div className="flex items-center gap-2.5">
                <IconStore className="h-5 w-5 text-gold-600" />
                <div>
                  <h2 className="font-display text-lg font-bold text-midnight-950 sm:text-xl">
                    {t.marketplace.searchPartnerShops}
                  </h2>
                  <p className="text-xs text-ink-500">
                    {t.marketplace.searchPartnerShopsDesc}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {initialShops.map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 2. État Résultats de recherche (requête active) ─────────────
  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col px-4 pb-16 pt-2 sm:px-6 md:pb-24 lg:px-8">
      {/* Barre de navigation haute avec bouton retour bien visible */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-midnight-950/8 pb-5">
        <BackButton label="Retour au Marketplace" variant="light" fallbackUrl="/marketplace" />

        <nav aria-label="Fil d'ariane" className="flex items-center gap-2 text-xs font-semibold text-ink-500">
          <Link
            href="/marketplace"
            className="hover:text-midnight-950 transition-colors"
          >
            Marketplace
          </Link>
          <span className="text-midnight-950/20">/</span>
          <span className="font-bold text-midnight-950 truncate max-w-xs">
            {isCategorySearch ? `Rayon ${categoryParam}` : `« ${qParam} »`}
          </span>
        </nav>
      </div>

      {/* Barre de recherche d'affinage avec suggestions en direct */}
      <div className="mb-8 flex flex-col gap-4">
        {renderSearchBar(false)}

        {/* Titre & Compteur de résultats */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-midnight-950/8 pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-600 font-semibold">
              {isCategorySearch ? t.marketplace.searchCategory : "Résultats de recherche"}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-midnight-950 sm:text-3xl">
              {isCategorySearch ? (
                <>
                  {t.marketplace.searchCategoryPrefix} <span className="text-gold-700 capitalize">{categoryParam}</span>
                </>
              ) : (
                <>
                  Résultats pour «&nbsp;<span className="text-gold-700">{qParam}</span>&nbsp;»
                </>
              )}
            </h1>
            {!loading && (
              <p className="mt-1 text-xs sm:text-sm text-ink-500">
                <span className="font-semibold text-midnight-950">{totalResults}</span>  {t.marketplace.searchResultCount}
                {" ("}
                <span className="font-medium text-midnight-950">{totalBoutiques}</span> boutique{totalBoutiques > 1 ? "s" : ""}, {" "}
                <span className="font-medium text-midnight-950">{totalProduits}</span> produit{totalProduits > 1 ? "s" : ""}
                {")"}
              </p>
            )}
          </div>

          {/* Tri des produits */}
          {!loading && totalProduits > 1 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label htmlFor="sort-by" className="text-xs font-medium text-ink-500 whitespace-nowrap">
                Trier par :
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-xl border border-midnight-950/15 bg-white px-3 py-1.5 text-xs font-semibold text-midnight-950 shadow-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
              >
                <option value="relevance">Pertinence</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
                <option value="name_asc">Nom (A-Z)</option>
              </select>
            </div>
          )}
        </div>

        {/* Onglets de filtrage rapide (Tous / Produits / Boutiques) */}
        {!loading && totalResults > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all",
                activeTab === "all"
                  ? "bg-midnight-950 text-gold-300 shadow-sm"
                  : "bg-white text-midnight-950/70 border border-midnight-950/10 hover:border-gold-400 hover:text-midnight-950"
              )}
            >
              Tous les résultats
              <span className={cn(
                "rounded-full px-1.5 py-0.2 font-mono text-[10px]",
                activeTab === "all" ? "bg-white/15 text-gold-200" : "bg-midnight-950/5 text-ink-500"
              )}>
                {totalResults}
              </span>
            </button>

            {totalProduits > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all",
                  activeTab === "products"
                    ? "bg-midnight-950 text-gold-300 shadow-sm"
                    : "bg-white text-midnight-950/70 border border-midnight-950/10 hover:border-gold-400 hover:text-midnight-950"
                )}
              >
                <IconPackage className="h-3.5 w-3.5" />
                Produits
                <span className={cn(
                  "rounded-full px-1.5 py-0.2 font-mono text-[10px]",
                  activeTab === "products" ? "bg-white/15 text-gold-200" : "bg-midnight-950/5 text-ink-500"
                )}>
                  {totalProduits}
                </span>
              </button>
            )}

            {totalBoutiques > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("shops")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all",
                  activeTab === "shops"
                    ? "bg-midnight-950 text-gold-300 shadow-sm"
                    : "bg-white text-midnight-950/70 border border-midnight-950/10 hover:border-gold-400 hover:text-midnight-950"
                )}
              >
                <IconStore className="h-3.5 w-3.5" />
                Boutiques
                <span className={cn(
                  "rounded-full px-1.5 py-0.2 font-mono text-[10px]",
                  activeTab === "shops" ? "bg-white/15 text-gold-200" : "bg-midnight-950/5 text-ink-500"
                )}>
                  {totalBoutiques}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Rayons / Catégories associés */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-medium text-ink-400">{t.marketplace.searchRelated}</span>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/recherche?category=${encodeURIComponent(cat.slug)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-midnight-950 shadow-sm transition-all hover:border-gold-500 hover:bg-gold-50"
              >
                <IconTag className="h-3.5 w-3.5 text-gold-600 shrink-0" />
                <span>{cat.name}</span>
                {cat.productsCount > 0 && (
                  <span className="font-mono text-[10px] text-ink-400">({cat.productsCount})</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. État Chargement des résultats ─────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-10">
          <div className="flex items-center gap-2.5 py-2 text-xs font-medium text-ink-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
            <span>Recherche dans le catalogue en cours...</span>
          </div>

          <div className="space-y-4">
            <SkeletonBlock className="h-5 w-36 rounded-lg" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <SkeletonBlock className="h-40 rounded-3xl" />
              <SkeletonBlock className="h-40 rounded-3xl" />
              <SkeletonBlock className="h-40 rounded-3xl" />
            </div>
          </div>

          <div className="space-y-4">
            <SkeletonBlock className="h-5 w-36 rounded-lg" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-64 rounded-3xl" />
              ))}
            </div>
          </div>
        </div>
      ) : totalResults === 0 ? (
        /* ── 4. État Vide (0 résultat) ─────────────────────────── */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-midnight-950/15 bg-white/70 px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-600">
            <IconSearch className="h-8 w-8" />
          </div>

          <h2 className="mt-5 font-display text-xl sm:text-2xl font-bold text-midnight-950">
            {t.marketplace.searchEmptyTitle} «&nbsp;{activeQuery}&nbsp;»
          </h2>
          <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-ink-500">
            {t.marketplace.searchEmptyDesc}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full bg-midnight-950 px-6 py-2.5 text-xs sm:text-sm font-bold text-gold-300 transition-colors hover:bg-midnight-800"
            >
              Effacer la recherche
            </button>
            <Link
              href="/marketplace"
              className="rounded-full border border-midnight-950/15 bg-white px-6 py-2.5 text-xs sm:text-sm font-bold text-midnight-950 transition-colors hover:border-gold-500 hover:bg-gold-50"
            >
              {t.marketplace.searchExploreCatalog}
            </Link>
          </div>

          <div className="mt-12 w-full max-w-lg border-t border-line/70 pt-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-400">
              Suggestions de recherche
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {POPULAR_SUGGESTIONS.map((sug) => (
                <Link
                  key={sug}
                  href={`/recherche?q=${encodeURIComponent(sug)}`}
                  className="rounded-full bg-ivory-100 px-3.5 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-gold-100 hover:text-gold-800"
                >
                  {sug}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── 5. Liste des Résultats ─────────────────────────────── */
        <div className="flex flex-col gap-12">
          {/* Section Boutiques (affichée si onglet "all" ou "shops") */}
          {(activeTab === "all" || activeTab === "shops") && totalBoutiques > 0 && (
            <section aria-labelledby="search-shops-title">
              <div className="mb-4 flex items-center gap-2.5">
                <IconStore className="h-5 w-5 text-gold-600" />
                <h2
                  id="search-shops-title"
                  className="font-display text-lg font-bold text-midnight-950 sm:text-xl"
                >
                  Boutiques partenaires
                </h2>
                <span className="rounded-full bg-gold-400/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-gold-700">
                  {totalBoutiques}
                </span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {boutiques!.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} />
                ))}
              </div>
            </section>
          )}

          {/* Séparation visuelle entre boutiques et produits si onglet "all" et les deux sont présents */}
          {activeTab === "all" && totalBoutiques > 0 && totalProduits > 0 && (
            <div className="border-t border-midnight-950/8" />
          )}

          {/* Section Produits (affichée si onglet "all" ou "products") */}
          {(activeTab === "all" || activeTab === "products") && totalProduits > 0 && (
            <section aria-labelledby="search-products-title">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <IconPackage className="h-5 w-5 text-gold-600" />
                  <h2
                    id="search-products-title"
                    className="font-display text-lg font-bold text-midnight-950 sm:text-xl"
                  >
                    Produits disponibles
                  </h2>
                  <span className="rounded-full bg-gold-400/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-gold-700">
                    {totalProduits}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {sortedProduits.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
