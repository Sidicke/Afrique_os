"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { searchApi } from "@/lib/api/search";
import type { ApiSearchResults } from "@/lib/api/search";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { cn, formatFcfa, initials } from "@/lib/utils";
import { IconSearch, IconPackage, IconTag } from "@/components/client/icons";

interface SearchAutocompleteProps {
  variant?: "navbar" | "hero" | "page";
  placeholder?: string;
  className?: string;
  initialQuery?: string;
  onSearchSubmitted?: (query: string) => void;
}

export default function SearchAutocomplete({
  variant = "navbar",
  placeholder = "Rechercher un produit, une boutique, une catégorie…",
  className,
  initialQuery = "",
  onSearchSubmitted,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ApiSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronisation avec initialQuery
  useEffect(() => {
    setTimeout(() => setQuery(initialQuery), 0);
  }, [initialQuery]);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setTimeout(() => {
        setResults(null);
        setLoading(false);
      }, 0);
      return;
    }

    setTimeout(() => setLoading(true), 0);
    const timer = setTimeout(async () => {
      try {
        const res = await searchApi.global(q);
        setResults(res);
      } catch {
        setResults({ boutiques: [], produits: [] });
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Fermeture au clic extérieur et touche Échap
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = query.trim();
    setIsOpen(false);
    if (onSearchSubmitted) {
      onSearchSubmitted(q);
    } else {
      router.push(q ? `/recherche?q=${encodeURIComponent(q)}` : "/marketplace");
    }
  };

  const handleSelect = () => {
    setIsOpen(false);
  };

  const hasBoutiques = (results?.boutiques?.length ?? 0) > 0;
  const hasProduits = (results?.produits?.length ?? 0) > 0;
  const hasCategories = (results?.categories?.length ?? 0) > 0;
  const hasAnyResult = hasBoutiques || hasProduits || hasCategories;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="relative w-full">
        {variant === "navbar" && (
          <div className="flex h-11 w-full items-center overflow-hidden rounded-xl border border-line bg-white shadow-sm transition-all focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-400/20">
            <span className="pl-3.5 text-ink-400">
              <IconSearch className="h-4 w-4" />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (query.trim().length > 0) setIsOpen(true);
              }}
              placeholder={placeholder}
              aria-label="Recherche"
              className="flex-1 bg-transparent px-3 text-xs sm:text-sm text-midnight-950 placeholder:text-ink-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults(null);
                  inputRef.current?.focus();
                }}
                className="p-2 text-ink-400 hover:text-midnight-950 transition-colors"
                aria-label="Effacer la recherche"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
            <button
              type="submit"
              className="flex h-full items-center justify-center bg-midnight-950 px-4 text-xs font-bold text-gold-300 transition-colors hover:bg-midnight-800"
            >
              Rechercher
            </button>
          </div>
        )}

        {variant === "hero" && (
          <div className="flex h-14 w-full items-center overflow-hidden rounded-2xl border border-gold-400/25 bg-white shadow-2xl shadow-black/25 focus-within:border-gold-400 focus-within:ring-2 focus-within:ring-gold-400/30">
            <span className="pl-4 text-ink-400">
              <IconSearch className="h-5 w-5" />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (query.trim().length > 0) setIsOpen(true);
              }}
              placeholder={placeholder}
              aria-label="Recherche sur le marketplace"
              className="flex-1 bg-transparent px-3.5 text-sm sm:text-base text-midnight-950 placeholder:text-ink-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults(null);
                  inputRef.current?.focus();
                }}
                className="p-2 text-ink-400 hover:text-midnight-950 transition-colors"
                aria-label="Effacer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
            <button
              type="submit"
              className="mr-1.5 flex h-11 items-center justify-center rounded-xl bg-midnight-950 px-5 text-sm font-bold text-gold-300 transition-colors hover:bg-midnight-800"
            >
              Trouver
            </button>
          </div>
        )}

        {variant === "page" && (
          <div className="flex h-12 w-full items-center overflow-hidden rounded-2xl border border-midnight-950/10 bg-white shadow-sm focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-400/20">
            <span className="pl-4 text-ink-400">
              <IconSearch className="h-5 w-5" />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (query.trim().length > 0) setIsOpen(true);
              }}
              placeholder={placeholder}
              aria-label="Rechercher"
              className="flex-1 bg-transparent px-3 text-sm text-midnight-950 placeholder:text-ink-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults(null);
                  inputRef.current?.focus();
                }}
                className="p-2 text-ink-400 hover:text-midnight-950"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
            <button
              type="submit"
              className="h-full bg-midnight-950 px-6 text-sm font-bold text-gold-300 transition-colors hover:bg-midnight-800"
            >
              Rechercher
            </button>
          </div>
        )}
      </form>

      {/* Popover / Suggestions déroulantes en temps réel */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[75vh] overflow-y-auto rounded-2xl border border-midnight-950/10 bg-white p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {loading && !results ? (
            <div className="flex items-center justify-center py-6 text-sm text-ink-500 gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
              <span>Recherche en cours…</span>
            </div>
          ) : !hasAnyResult ? (
            <div className="py-6 text-center text-sm text-ink-600">
              <p className="font-medium text-midnight-950">Aucun résultat trouvé pour « {query} »</p>
              <p className="mt-1 text-xs text-ink-400">Essayez un autre mot-clé ou parcourez le marketplace.</p>
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="mt-3 inline-flex text-xs font-semibold text-gold-700 hover:underline"
              >
                Voir toutes les boutiques et produits disponibles →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 text-left">
              {/* Boutiques suggérées */}
              {hasBoutiques && (
                <div>
                  <div className="flex items-center justify-between px-2 pb-1.5 border-b border-line/60">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      Boutiques partenaires ({results?.boutiques.length})
                    </span>
                  </div>
                  <div className="mt-1.5 grid gap-1.5">
                    {results?.boutiques.slice(0, 3).map((b) => (
                      <Link
                        key={b.id}
                        href={`/b/${b.slug}`}
                        onClick={handleSelect}
                        className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gold-50/60"
                      >
                        {b.logoImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.logoImage}
                            alt={b.name}
                            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-midnight-950/10"
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-midnight-950 font-display text-xs font-bold text-gold-300">
                            {initials(b.name) || "BT"}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-bold text-midnight-950">{b.name}</p>
                            {b.verificationStatus === "VERIFIED" && (
                              <VerifiedBadge className="h-3.5 w-3.5 shrink-0" />
                            )}
                          </div>
                          <p className="truncate text-xs text-ink-500">
                            {b.city ? `${b.city}${b.country ? `, ${b.country}` : ""}` : "Boutique en ligne"}
                            {b.productsCount ? ` · ${b.productsCount} produit${b.productsCount > 1 ? "s" : ""}` : ""}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-gold-700">Visiter →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Produits suggérés */}
              {hasProduits && (
                <div>
                  <div className="flex items-center justify-between px-2 pb-1.5 border-b border-line/60">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      Produits ({results?.produits.length})
                    </span>
                  </div>
                  <div className="mt-1.5 grid gap-1.5">
                    {results?.produits.slice(0, 4).map((p) => {
                      const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p as { image?: string }).image;
                      const boutiqueSlug = p.boutique?.slug;
                      const boutiqueName = p.boutique?.name ?? "Boutique partenaire";
                      const href = boutiqueSlug ? `/b/${boutiqueSlug}?product=${p.id}` : `/marketplace`;
                      const priceNumber = typeof p.price === "number" ? p.price : Number(p.price) || 0;

                      return (
                        <Link
                          key={p.id}
                          href={href}
                          onClick={handleSelect}
                          className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gold-50/60"
                        >
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-midnight-950/5 flex items-center justify-center">
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={image} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <IconPackage className="h-4 w-4 text-ink-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-midnight-950">{p.name}</p>
                            <p className="text-xs text-ink-500">
                              Par <span className="font-medium text-midnight-950">{boutiqueName}</span>
                            </p>
                          </div>
                          <span className="font-mono text-xs font-bold text-midnight-950">
                            {formatFcfa(priceNumber)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Catégories trouvées */}
              {hasCategories && (
                <div>
                  <span className="px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    Catégories
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 px-2">
                    {results?.categories?.slice(0, 4).map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/recherche?category=${encodeURIComponent(cat.slug)}`}
                        onClick={handleSelect}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-gray-50 px-2.5 py-1 text-xs font-medium text-midnight-950 hover:border-gold-400 hover:bg-gold-50 transition-colors"
                      >
                        <IconTag className="h-3 w-3 text-gold-600 shrink-0" />
                        <span>{cat.name}</span>
                        {cat.productsCount > 0 && (
                          <span className="text-[10px] text-ink-400">({cat.productsCount})</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer action : Voir tous les résultats */}
              <div className="border-t border-line pt-2">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="flex w-full items-center justify-between rounded-xl bg-midnight-950 px-4 py-2.5 text-xs font-bold text-gold-300 transition-colors hover:bg-midnight-800 cursor-pointer"
                >
                  <span>Voir tous les résultats pour « {query} »</span>
                  <span>Entrée ↵</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
