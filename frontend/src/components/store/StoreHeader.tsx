"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useShopConfig } from "@/lib/useShopConfig";
import { useCatalogueStore } from "@/lib/useCatalogueStore";
import { useCart } from "./CartProvider";
import {
  IconSearch,
  IconCart,
  IconMenu,
  IconClose,
  IconChevronLeft,
} from "./icons";
import { IconPackage } from "@/components/client/icons";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { cn, formatFcfa, initials, publicShopHref } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function StoreHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("produits");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Miroir pour l'effet scroll-spy (évite une dépendance instable)
  const activeSectionRef = useRef(activeSection);
  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const verifyRef = useRef<HTMLDivElement>(null);
  const { count, openCart } = useCart();
  const config = useShopConfig();
  const catalogue = useCatalogueStore();

  // Onglets de navigation interne — « Marques » n'existe que si la boutique en a
  const navItems = [
    ...(catalogue.brands.length > 0
      ? [{ label: "Marques", href: "#marques", section: "marques" }]
      : []),
    { label: "Boutique", href: "#produits", section: "produits" },
    { label: "Blog", href: "#contact", section: "contact" },
  ];

  // Lien racine de la boutique courante (vitrine multi-boutiques /b/[slug])
  const shopRoot = publicShopHref(catalogue.boutiqueSlug);

  // Filtrage des produits locaux pour la recherche interne
  const matchingProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return catalogue.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchQuery, catalogue.products]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll-spy : la petite barre noire suit l'onglet de la section visible
  useEffect(() => {
    const sectionIds = navItems.map((item) => item.section);
    if (!sectionIds.includes(activeSectionRef.current)) {
      setActiveSection("produits");
    }
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.id;
          if (sectionIds.includes(id)) setActiveSection(id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue.boutiqueSlug, catalogue.brands.length]);

  // Fermeture du popover vérification et recherche : clic extérieur + touche Échap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVerifyOpen(false);
        setSearchOpen(false);
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (verifyRef.current && !verifyRef.current.contains(event.target as Node)) {
        setVerifyOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const closeMobile = useCallback(() => setMobileMenuOpen(false), []);

  const handleSelectProduct = (productId: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    // Mise à jour de l'URL pour ouvrir la modale produit
    const url = new URL(window.location.href);
    url.searchParams.set("product", productId);
    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new Event("popstate"));
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm"
          : "bg-white border-b border-gray-100"
      )}
    >
      <div className="flex h-16 w-full items-center justify-between gap-3 px-4 md:px-6">
        {/* Left Section: Bouton Retour ZennShop + Logo Boutique */}
        <div className={cn("items-center gap-2 sm:gap-3 shrink-0", searchOpen ? "hidden sm:flex" : "flex")}>
          {/* Bouton de retour ZennShop — visible pour tous */}
          <Link
            href="/marketplace"
            title="Retourner sur ZennShop"
            aria-label="Retourner sur le marketplace ZennShop"
            className="group flex items-center gap-1.5 rounded-full border border-midnight-950/15 bg-midnight-950/5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-midnight-950 transition-all hover:border-gold-500 hover:bg-midnight-950 hover:text-gold-300"
          >
            <IconChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className="font-display text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              ZennShop
            </span>
          </Link>

          {/* Logo — image du commerçant ou initiales */}
          <Link href={shopRoot} className="flex items-center gap-2 sm:gap-2.5">
            {config.logoImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.logoImage}
                alt={`Logo de ${config.name}`}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover ring-1 ring-midnight-950/10"
              />
            ) : (
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-midnight-950 font-display text-xs sm:text-sm font-bold text-gold-300">
                {initials(config.name) || "AT"}
              </span>
            )}
            <span className="max-w-[24vw] sm:max-w-[32vw] truncate font-display text-base font-bold tracking-tight text-black sm:text-xl">
              {config.name}
            </span>
          </Link>

          {/* Badge vérifié — cliquable : détail de confiance au clic */}
          {config.isVerified && (
            <div ref={verifyRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setVerifyOpen((open) => !open)}
                aria-label="Boutique vérifiée (en savoir plus)"
                aria-expanded={verifyOpen}
                aria-describedby="verified-tooltip"
                title="Boutique vérifiée"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
              >
                <VerifiedBadge className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <AnimatePresence>
                {verifyOpen && (
                  <motion.div
                    id="verified-tooltip"
                    role="tooltip"
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-1/2 top-full z-50 mt-3 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-gold-400/40 bg-white p-4 shadow-xl shadow-midnight-950/10"
                  >
                    <div className="flex items-center gap-2">
                      <VerifiedBadge className="h-6 w-6 shrink-0" />
                      <p className="font-display text-sm font-bold text-midnight-950">
                        Boutique vérifiée
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-midnight-950/70">
                      Cette boutique a été vérifiée par la plateforme. Vous pouvez
                      passer vos commandes en toute confiance.
                    </p>
                    <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-gold-400/40 bg-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Desktop Navigation — scroll-spy : la barre suit l'onglet actif */}
        {!searchOpen && (
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const active = activeSection === item.section;
              return (
                <a
                  key={item.section}
                  href={item.href}
                  className={cn(
                    "relative font-medium text-sm transition-colors py-1",
                    active ? "text-black font-bold" : "text-gray-600 hover:text-black"
                  )}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-1 left-0 h-0.5 w-full bg-black"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>
        )}

        {/* In-Store Search Bar (Quand la recherche est ouverte) */}
        {searchOpen && (
          <div className="relative flex-1 max-w-md mx-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex h-10 w-full items-center overflow-hidden rounded-xl border border-gold-400 bg-white px-3 shadow-md">
              <IconSearch className="h-4 w-4 text-gold-600 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans cette boutique…"
                className="flex-1 bg-transparent px-2.5 text-xs sm:text-sm text-midnight-950 placeholder:text-ink-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                className="p-1 text-ink-400 hover:text-midnight-950 transition-colors"
                aria-label="Fermer la recherche"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            {/* Dropdown des résultats locaux */}
            {searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-midnight-950/10 bg-white p-2.5 shadow-2xl">
                {matchingProducts.length === 0 ? (
                  <p className="py-3 text-center text-xs text-ink-500">
                    Aucun article trouvé pour « {searchQuery} » dans cette boutique.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-400">
                      Articles trouvés ({matchingProducts.length})
                    </span>
                    {matchingProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p.id)}
                        className="flex items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-gold-50/70 cursor-pointer"
                      >
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <IconPackage className="h-4 w-4 text-ink-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-midnight-950">{p.name}</p>
                          <p className="font-mono text-[11px] font-bold text-gold-700">{formatFcfa(p.price)}</p>
                        </div>
                        <span className="text-[11px] text-ink-400">Voir →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className={cn(
              "p-2 rounded-full transition-colors cursor-pointer",
              searchOpen ? "bg-midnight-950 text-gold-300" : "text-black hover:bg-gold-400/15"
            )}
            aria-label={searchOpen ? "Fermer la recherche" : "Rechercher un produit"}
          >
            <IconSearch className="w-5 h-5" />
          </button>

          <button
            onClick={openCart}
            className="relative text-black p-2 hover:bg-gold-400/15 rounded-full transition-colors cursor-pointer"
            aria-label="Voir le panier"
          >
            <IconCart className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute top-0 right-0 translate-x-1 -translate-y-1 bg-gold-400 text-midnight-950 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </button>

          <button
            className="md:hidden p-2 text-black hover:bg-gold-400/15 rounded-full transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileMenuOpen ? <IconClose className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-b border-gray-200 p-4 flex flex-col gap-3 absolute top-16 left-0 w-full shadow-xl"
          >
            {/* Bouton retour ZennShop dans le menu mobile */}
            <Link
              href="/marketplace"
              className="flex items-center gap-2 rounded-xl bg-midnight-950 p-3 text-sm font-semibold text-gold-300 transition-colors hover:bg-midnight-900"
              onClick={closeMobile}
            >
              <IconChevronLeft className="h-4 w-4" />
              <span>Retourner sur ZennShop</span>
            </Link>

            <div className="border-t border-line/60 pt-2 flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.section}
                  href={item.href}
                  className={cn(
                    "font-medium p-2.5 rounded-lg text-sm",
                    activeSection === item.section
                      ? "text-black bg-gray-100 font-bold"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                  onClick={closeMobile}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
