"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { cn, roleHomePath } from "@/lib/utils";
import { useSession } from "@/lib/useSession";
import { logout } from "@/lib/accountStore";
import { useRouter, usePathname } from "next/navigation";
import { IconSearch } from "@/components/client/icons";

/** Ancres de la landing — affichées UNIQUEMENT sur la page d'accueil */
const NAV_LINKS = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "À propos", href: "#vision-faq" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();

  // Sur la landing, la nav affiche les ancres ; ailleurs (marketplace,
  // boutique, produit…) seules les entrées utiles sont montrées.
  const isHome = pathname === "/";
  const isMarketplace =
    pathname?.startsWith("/marketplace") ||
    pathname?.startsWith("/boutique") ||
    pathname?.startsWith("/produit") ||
    pathname?.startsWith("/recherche");

  // Connecté ? Un lien direct vers SON espace remplace « Se connecter »
  const user = session?.user ?? null;
  const homeHref = roleHomePath(user?.role);
  const spaceLabel =
    user?.role === "ADMIN"
      ? "Console admin"
      : user?.role === "CLIENT"
        ? "Mon espace"
        : "Espace vendeur";

  const handleSignOut = async () => {
    setSigningOut(true);
    await logout();
    setMenuOpen(false);
    router.push("/");
  };

  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      setScrolled(latest > 24);
    });
    return () => unsubscribe();
  }, [scrollY]);

  return (
    <motion.header
      initial={{ y: prefersReduced ? 0 : -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-midnight-950/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      {/* Contenu pleine largeur : logo à gauche, actions à droite, la barre
          sombre s'étend sur tout l'écran (header plein) */}
      <div className="flex h-16 w-full items-center justify-between gap-4 px-5 sm:h-20 sm:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="Afrique Commerce OS"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold-400/40 bg-gold-400/10 font-display text-sm font-bold text-gold-300 transition-colors duration-300 group-hover:bg-gold-400 group-hover:text-midnight-950">
            AC
          </span>
          <span className={cn(
            "hidden font-display text-sm font-semibold tracking-wide sm:block",
            (scrolled || isHome) ? "text-ivory-50 drop-shadow-sm" : "text-midnight-950"
          )}>
            Afrique Commerce <span className={(scrolled || isHome) ? "text-gold-300" : "text-gold-strong"}>OS</span>
          </span>
        </Link>

        {/* Navigation ou Barre de recherche desktop */}
        {isMarketplace ? (
          <div className="hidden flex-1 max-w-3xl md:flex">
            <div className="flex h-11 w-full overflow-hidden rounded-lg bg-white p-0.5 shadow-md">
              <button className="flex items-center gap-1 border-r border-line bg-gray-50 px-4 text-xs font-semibold text-midnight-950 hover:bg-gray-100">
                Toutes catégories <span className="text-[10px] text-ink-400">▾</span>
              </button>
              <input
                type="text"
                placeholder="Entrez votre recherche..."
                className="flex-1 bg-white px-4 text-sm text-midnight-950 placeholder:text-ink-400 focus:outline-none"
              />
              <button className="flex items-center justify-center rounded-r-md bg-terracotta px-6 text-white font-bold transition-colors hover:bg-terracotta/90">
                <IconSearch className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <nav
            className="hidden items-center gap-7 lg:flex"
            aria-label="Navigation principale"
          >
            {isHome &&
              NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-ivory-50/70 transition-colors duration-200 hover:text-gold-300"
                >
                  {link.label}
                </Link>
              ))}

          </nav>
        )}

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Button href={homeHref} variant="ghost" size="sm">
                {spaceLabel}
              </Button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="cursor-pointer rounded-full border border-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ivory-50/60 transition-colors hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
              >
                {signingOut ? "…" : "Déconnexion"}
              </button>
            </>
          ) : (
            <>
              <Button href="/connexion" variant="primary" size="sm" className="shadow-lg shadow-gold-400/30 hover:shadow-gold-400/50 hover:-translate-y-0.5">
                Se connecter
              </Button>
              <Button href="/inscription" variant="primary" size="sm">
                Créer un compte
              </Button>
            </>
          )}
        </div>

        {/* Bouton menu mobile */}
        <div className="flex items-center lg:hidden">
          {isMarketplace && (
            <button className="mr-2 flex h-10 w-10 items-center justify-center text-ivory-50 transition-colors hover:text-gold-300">
              <IconSearch className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ivory-50 transition-colors hover:bg-white/10"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path
                  d="M4 4l12 12M16 4L4 16"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 5.5h14M3 10h14M3 14.5h9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Bandeau essai gratuit — réservé à la landing (acquisition),
          pas sur les pages commerce */}
      {isHome && (
        <div
          aria-hidden={!scrolled}
          className={cn(
            "overflow-hidden transition-all duration-300",
            scrolled ? "max-h-8 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="border-t border-gold-400/15 bg-midnight-950/60">
            <p className="flex items-center justify-center gap-2 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300/90">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-300 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-300" />
              </span>
              Business dès 15 000 FCFA/mois
              <span className="hidden sm:inline">
                {""}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Menu mobile */}
      <motion.div
        initial={false}
        animate={{ height: menuOpen ? "auto" : 0, opacity: menuOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden border-b border-white/10 bg-midnight-950/95 backdrop-blur-xl lg:hidden"
      >
        <div className="flex w-full flex-col gap-1 px-5 py-4 sm:px-8">
          {isMarketplace && (
            <div className="px-1 pb-4 pt-1">
              <div className="flex h-10 w-full shadow-sm">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="flex-1 rounded-l-lg bg-white/5 px-4 text-sm text-ivory-50 focus:outline-none placeholder:text-ivory-50/30"
                />
                <button className="flex items-center justify-center rounded-r-lg bg-terracotta px-4 text-white">
                  <IconSearch className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {isHome &&
            NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm text-ivory-50/80 transition-colors hover:bg-white/5 hover:text-gold-300"
              >
                {link.label}
              </Link>
            ))}

          <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-4">
            {user ? (
              <>
                <Button href={homeHref} variant="secondary" size="md">
                  {spaceLabel}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void handleSignOut()}
                >
                  {signingOut ? "Déconnexion…" : "Déconnexion"}
                </Button>
              </>
            ) : (
              <>
                <Button href="/connexion" variant="primary" size="md" className="shadow-lg shadow-gold-400/30 hover:shadow-gold-400/50 hover:-translate-y-0.5">
                  Se connecter
                </Button>
                <Button href="/inscription" variant="primary" size="md">
                  Créer un compte
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.header>
  );
}
