"use client";

import { useEffect, useState } from "react";
import { getSessionUser } from "@/lib/api/session";
import MarketplaceHome from "@/components/marketplace/MarketplaceHome";

/** Salutation selon l'heure de la journée */
function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

/**
 * Accueil client — le MARKETPLACE de la plateforme s'affiche ici :
 * découverte (recherche, catégories, deals, boutiques, catalogue) puis achat,
 * avec toutes les données branchées sur le backend. Un bandeau de bienvenue
 * personnalisé garde le lien avec l'espace (commandes, discussions, compte).
 */
export default function EspaceClientHome() {
  const [greet, setGreet] = useState("Bonjour");
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => {
      const user = getSessionUser();
      const name = user?.name?.trim() ?? "";
      setGreet(greeting());
      setFirstName(name.split(" ")[0] ?? "");
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col">
      {/* ——— Bandeau de bienvenue compact ——— */}
      <section
        aria-label="Bienvenue"
        className="relative mb-8 overflow-hidden rounded-[2rem] border border-gold-soft bg-gradient-to-r from-[#fef5e7] via-[#fffdf9] to-[#f9ede1] p-6 shadow-sm sm:p-10"
      >
        {/* Décors subtils chaleureux */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(#c4b697_1px,transparent_1px)] [background-size:16px_16px] opacity-20" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-400/20 blur-[80px]" aria-hidden="true" />
        
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-200/50 text-gold-strong ring-1 ring-gold-300/50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              </span>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ink-500">
                Espace Client
              </p>
            </div>
            
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-midnight-950 sm:text-4xl">
              {greet}
              {firstName ? (
                <>
                  , <span className="text-terracotta">{firstName}</span>
                </>
              ) : null}
            </h1>
            
            <p className="mt-3 text-base leading-relaxed text-ink-600 sm:text-lg">
              Prêt à découvrir de nouvelles pépites ? Explorez les boutiques, profitez des offres du jour et gérez toutes vos commandes au même endroit.
            </p>
          </div>
        </div>
      </section>

      {/* ——— Le marketplace — accueil commercial complet ——— */}
      {/* Espace client connecté : pas de CTA « Créer une boutique 30 jours gratuits » */}
      <MarketplaceHome hideSellerBanner />
    </div>
  );
}
