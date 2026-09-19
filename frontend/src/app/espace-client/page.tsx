"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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


/** Carte du dernier panier en cours (lu depuis localStorage) */
function LastCartCard() {
  const [cartState, setCartState] = useState<{ boutiqueSlug: string; count: number } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("zennshop_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.boutiqueSlug && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          const totalQty = parsed.lines.reduce((acc: number, line: any) => acc + line.qty, 0);
          setCartState({ boutiqueSlug: parsed.boutiqueSlug, count: totalQty });
        }
      }
    } catch (e) {}
  }, []);

  if (!cartState) return null;

  return (
    <div className="mt-6 lg:mt-0 lg:ml-auto w-full lg:w-72 flex shrink-0 rounded-2xl border border-gold-soft/50 bg-white/60 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-wash text-terracotta">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      </div>
      <div className="ml-3.5 flex flex-col justify-center">
        <h3 className="font-display text-sm font-bold text-midnight-950">Panier en attente</h3>
        <p className="text-[11px] font-medium text-ink-600 mb-1.5 line-clamp-1">
          {cartState.count} article{cartState.count > 1 ? "s" : ""} chez <span className="capitalize">{cartState.boutiqueSlug.replace(/-/g, ' ')}</span>
        </p>
        <Link href={`/b/${cartState.boutiqueSlug}`} className="text-[11px] font-bold text-gold-700 hover:text-terracotta transition-colors inline-flex items-center gap-1">
          Reprendre ma commande 
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </Link>
      </div>

      {/* ——— Le marketplace — accueil commercial complet (simplifié pour le client) ——— */}
      {/* Espace client connecté : pas de CTA « Créer une boutique 30 jours gratuits » et pas de footer public */}
      <div className="mt-12">
        <MarketplaceHome hideSellerBanner />
      </div>


      {/* ——— Le marketplace — accueil commercial complet (simplifié pour le client) ——— */}
      {/* Espace client connecté : pas de CTA « Créer une boutique 30 jours gratuits » et pas de footer public */}
      <div className="mt-12">
        <MarketplaceHome hideSellerBanner />
      </div>

    </div>
  );
}

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
              Bienvenue dans votre espace personnel. Gérez vos commandes, reprenez vos paniers en attente et échangez facilement avec vos vendeurs.
            </p>
          </div>
          <LastCartCard />
        </div>
      </section>

      
      


      {/* ——— Le marketplace — accueil commercial complet (simplifié pour le client) ——— */}
      {/* Espace client connecté : pas de CTA « Créer une boutique 30 jours gratuits » et pas de footer public */}
      <div className="mt-12">
        <MarketplaceHome hideSellerBanner />
      </div>

    </div>
  );
}
