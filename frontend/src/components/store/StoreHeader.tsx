"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useShopConfig } from "@/lib/useShopConfig";
import { useCatalogueStore } from "@/lib/useCatalogueStore";
import { useCart } from "./CartProvider";
import { isClientLoggedIn } from "@/lib/accountStore";
import {
  IconSearch,
  IconCart,
  IconMenu,
  IconClose,
  IconChevronLeft,
} from "./icons";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { cn, initials, publicShopHref } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function StoreHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("produits");
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

  // Lien racine de la boutique courante (vitrine multi-boutiques /boutique/[slug])
  const shopRoot = publicShopHref(catalogue.boutiqueSlug);
  // Un client connecté revient dans son espace d'un clic (flèche retour)
  const [clientAuthed, setClientAuthed] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setClientAuthed(isClientLoggedIn()), 0);
    return () => window.clearTimeout(id);
  }, []);

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
    // Si l'onglet actif n'existe plus (ex. boutique sans marques), on revient
    // sur « Boutique » pour que la barre ne disparaisse jamais.
    if (!sectionIds.includes(activeSectionRef.current)) {
      setActiveSection("produits");
    }
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // La section qui traverse la ligne du haut du viewport est active
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

  // Fermeture du popover vérification : clic extérieur + touche Échap
  useEffect(() => {
    if (!verifyOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (verifyRef.current && !verifyRef.current.contains(event.target as Node)) {
        setVerifyOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVerifyOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [verifyOpen]);

  const closeMobile = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm"
          : "bg-white border-b border-gray-100"
      )}
    >
      <div className="flex h-16 w-full items-center justify-between gap-4 px-4 md:px-6">
        {/* Flèche retour — le client connecté revient dans son espace d'un clic */}
        {clientAuthed && (
          <Link
            href="/espace-client"
            title="Retourner dans mon espace"
            aria-label="Retourner dans mon espace"
            className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-midnight-950/10 bg-white text-midnight-950/70 transition-colors hover:border-gold-400/60 hover:text-midnight-950"
          >
            <IconChevronLeft className="h-4 w-4" />
          </Link>
        )}
        {/* Logo — image du commerçant ou initiales (ex. « AT » pour Aziz Tech) */}
        <Link href={shopRoot} className="flex items-center gap-2.5">
          {config.logoImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.logoImage}
              alt={`Logo de ${config.name}`}
              className="h-9 w-9 rounded-full object-cover ring-1 ring-midnight-950/10"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-midnight-950 font-display text-sm font-bold text-gold-300">
              {initials(config.name) || "AT"}
            </span>
          )}
          <span className="max-w-[38vw] truncate font-display text-lg font-bold tracking-tight text-black sm:text-xl">
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
              <VerifiedBadge className="h-5 w-5" />
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
                  {/* Flèche du popover */}
                  <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-gold-400/40 bg-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Desktop Navigation — scroll-spy : la barre suit l'onglet actif */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const active = activeSection === item.section;
            return (
              <a
                key={item.section}
                href={item.href}
                className={cn(
                  "relative font-medium text-sm transition-colors py-1",
                  active ? "text-black" : "text-gray-600 hover:text-black"
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

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button className="text-black p-2 hover:bg-gold-400/15 rounded-full transition-colors hidden sm:block cursor-pointer" aria-label="Rechercher">
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
            className="md:hidden bg-white border-b border-gray-200 p-4 flex flex-col gap-4 absolute top-16 left-0 w-full shadow-lg"
          >
            {navItems.map((item) => (
              <a
                key={item.section}
                href={item.href}
                className={cn(
                  "font-medium p-2 rounded-lg",
                  activeSection === item.section
                    ? "text-black bg-gray-50"
                    : "text-gray-600"
                )}
                onClick={closeMobile}
              >
                {item.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
