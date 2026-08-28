"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Container from "@/components/ui/Container";
import Link from "next/link";

const COMMERCE_BENEFITS = [
  {
    id: "vitrine",
    title: "Vitrine Instantanée",
    description: "Créez votre boutique en ligne avec votre nom et vos couleurs en moins de 10 minutes. Pas besoin de savoir coder.",
    cta: "Lancer ma boutique",
    href: "/inscription",
    items: ["Nom de boutique unique", "Lien personnalisé propre", "Indexation sur le marketplace", "Vitrine optimisée mobile"],
  },
  {
    id: "catalogue",
    title: "Catalogue intelligent",
    description: "Gérez vos produits, stocks, variantes (tailles, couleurs) et prix en FCFA ou devise locale avec une interface fluide.",
    cta: "Ajouter mes produits",
    href: "/inscription",
    items: ["Stocks mis à jour en direct", "Multi-variantes de produits", "Prix clairs sans ambiguïté", "Fiches produits esthétiques"],
  },
  {
    id: "messagerie",
    title: "Messagerie & Commandes",
    description: "Les clients vous contactent ou commandent directement. Vos discussions et l'historique de vos commandes sont centralisés.",
    cta: "Gérer mes clients",
    href: "/inscription",
    items: ["Paiement mobile money ou cash", "Notifications de stock faible", "Discussions acheteurs intégrées", "Statuts de commande suivis"],
  },
];

export default function UnifiedValueProp() {
  const [activeTab, setActiveTab] = useState(COMMERCE_BENEFITS[0].id);
  const activeBenefit = COMMERCE_BENEFITS.find((b) => b.id === activeTab)!;

  return (
    <section id="commerce-os" className="relative overflow-hidden bg-midnight-950 py-24 sm:py-32">
      {/* Texture dorée discrète + halo */}
      <div className="gold-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-[140px]"
        aria-hidden="true"
      />

      <Container size="wide" className="relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-300" aria-hidden="true" />
            L&apos;infrastructure du commerce connecté
          </span>

          <h2 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight text-ivory-50 sm:text-5xl">
            Tout le cockpit de votre boutique.
            <br />
            <span className="text-gold-gradient">Sans la complexité.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-ivory-50/60">
            Afrique Commerce OS équipe votre boutique des meilleurs outils de gestion : du catalogue de produits aux commandes en temps réel, conservez votre liberté en profitant de l&apos;audience du marketplace.
          </p>
        </div>

        {/* Tab system + Interactive cockpit container */}
        <div className="mt-16 grid gap-8 lg:grid-cols-12 lg:items-start">

          {/* Navigation - Left Side (4 columns) */}
          <div className="flex flex-col gap-3 lg:col-span-4">
            {COMMERCE_BENEFITS.map((benefit) => (
              <button
                key={benefit.id}
                onClick={() => setActiveTab(benefit.id)}
                className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
                  activeTab === benefit.id
                    ? "border-gold-400/40 bg-gold-400/10 shadow-lg shadow-gold-400/5"
                    : "border-white/5 bg-white/2 hover:border-white/10"
                }`}
              >
                {activeTab === benefit.id && (
                  <div className="absolute inset-y-0 left-0 w-1 bg-gold-400" />
                )}
                <h3 className={`font-display text-lg font-semibold ${activeTab === benefit.id ? "text-gold-300" : "text-ivory-50"}`}>
                  {benefit.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ivory-50/50">
                  {benefit.description}
                </p>
              </button>
            ))}
          </div>

          {/* Interactive display - Right Side (8 columns) */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-midnight-900 shadow-2xl">
                  {/* Simulated interface header */}
                  <div className="flex items-center justify-between border-b border-white/5 bg-midnight-950/80 px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-3 w-3 rounded-full bg-red-500/80" />
                      <span className="flex h-3 w-3 rounded-full bg-yellow-500/80" />
                      <span className="flex h-3 w-3 rounded-full bg-green-500/80" />
                      <span className="ml-2 font-mono text-xs text-ivory-50/40">cockpit_vendeur : {activeBenefit.id}.config</span>
                    </div>
                    <span className="rounded-full bg-gold-400/10 px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-gold-300">
                      V1 Production
                    </span>
                  </div>

                  {/* Simulated Content Box */}
                  <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-2">
                    <div className="flex flex-col justify-between">
                      <div>
                        <h4 className="font-display text-2xl font-semibold text-ivory-50">
                          {activeBenefit.title}
                        </h4>
                        <p className="mt-3 text-sm leading-relaxed text-ivory-50/70">
                          {activeBenefit.description}
                        </p>
                      </div>

                      <div className="mt-8">
                        <Link
                          href={activeBenefit.href}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold-400 px-5 text-sm font-semibold text-midnight-950 transition-all duration-300 hover:bg-gold-300 hover:shadow-lg hover:shadow-gold-400/10"
                        >
                          {activeBenefit.cta}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </Link>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/2 p-5 sm:p-6">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-300/80">Caractéristiques</span>
                      <ul className="mt-4 space-y-3">
                        {activeBenefit.items.map((item, idx) => (
                          <motion.li
                            key={item}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1, duration: 0.3 }}
                            className="flex items-center gap-3 group"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-400/10 text-gold-300 transition-colors group-hover:bg-gold-400/20">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                            <span className="text-sm text-ivory-50/80">{item}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </Container>
    </section>
  );
}
