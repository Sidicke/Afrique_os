"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Container from "@/components/ui/Container";
import Link from "next/link";
import {
  IconStore,
  IconPackage,
  IconCreditCard,
  IconBarChart,
} from "@/components/client/icons";

const COMMERCE_BENEFITS = [
  {
    id: "vitrine",
    icon: IconStore,
    title: "Votre boutique en ligne en 10 min",
    description: "Plus besoin d'un développeur. Donnez un nom à votre boutique, ajoutez vos photos et votre lien est prêt à partager sur WhatsApp, Instagram ou TikTok.",
    cta: "Créer ma boutique maintenant",
    href: "/inscription",
    items: [
      "Lien personnalisé (zennshop.com/votre-nom)",
      "Vitrine 100% adaptée mobile",
      "Visible sur le marketplace dès le premier jour",
      "Zéro code, zéro serveur à gérer",
    ],
    stat: { value: "< 10 min", label: "pour ouvrir" },
  },
  {
    id: "catalogue",
    icon: IconPackage,
    title: "Gérez tout votre catalogue",
    description: "Ajoutez vos produits avec photos, prix en FCFA, variantes (tailles, couleurs), stocks et descriptions — depuis votre téléphone ou ordinateur.",
    cta: "Ajouter mes produits",
    href: "/inscription",
    items: [
      "Photos produits en haute qualité",
      "Variantes : couleur, taille, modèle",
      "Alertes stock faible automatiques",
      "Promotions & prix barrés en un clic",
    ],
    stat: { value: "20 → 150", label: "produits selon votre plan" },
  },
  {
    id: "paiements",
    icon: IconCreditCard,
    title: "Encaissez sans friction",
    description: "Vos clients paient par Mobile Money (Wave, Orange Money, MTN, Moov), carte ou à la livraison. L'argent arrive directement dans votre portefeuille ZennShop.",
    cta: "Voir comment ça marche",
    href: "/inscription",
    items: [
      "Wave · Orange Money · MTN · Moov",
      "Paiement à la livraison (cash)",
      "Portefeuille vendeur sécurisé",
      "Retrait vers votre compte Mobile Money",
    ],
    stat: { value: "2%", label: "de commission seulement (Business)" },
  },
  {
    id: "pilotage",
    icon: IconBarChart,
    title: "Pilotez, analysez, grandissez",
    description: "Tableau de bord en temps réel : chiffre d'affaires, meilleures ventes, clients fidèles, commandes à traiter. Tout ce qu'il faut pour prendre les bonnes décisions.",
    cta: "Voir le tableau de bord",
    href: "/inscription",
    items: [
      "KPIs en temps réel (CA, panier moyen)",
      "Historique et segmentation clients",
      "Suivi de chaque commande",
      "Analytics multi-boutiques (Business)",
    ],
    stat: { value: "1 écran", label: "pour tout gérer" },
  },
];

const WHY_ZENNSHOP = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: "Démarrage immédiat",
    desc: "Votre boutique est en ligne en moins de 10 minutes, sans carte bancaire ni engagement.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "Fait pour l'Afrique",
    desc: "Mobile Money natif, prix en FCFA, livraison locale, interface en français — conçu pour votre réalité.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Votre audience dès J1",
    desc: "Vos produits sont visibles sur le marketplace ZennShop dès l'activation de votre boutique.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Tout sur mobile",
    desc: "Gérez vos commandes, répondez aux clients et encaissez depuis votre téléphone, partout.",
  },
];

export default function UnifiedValueProp() {
  const [activeTab, setActiveTab] = useState(COMMERCE_BENEFITS[0].id);
  const activeBenefit = COMMERCE_BENEFITS.find((b) => b.id === activeTab)!;

  return (
    <section id="commerce-os" className="relative overflow-hidden bg-midnight-950">
      {/* Séparateur haut */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold-400/25 to-transparent" />

      {/* ═══ BLOC 1 : Pourquoi ZennShop ═══ */}
      <div className="relative py-20 sm:py-28">
        <div className="gold-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
        <Container size="wide" className="relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-300" aria-hidden="true" />
              Pourquoi les vendeurs choisissent ZennShop
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold leading-tight tracking-tight text-ivory-50 sm:text-5xl">
              Arrêtez de vendre dans le vide.{" "}
              <span className="bg-gradient-to-r from-gold-300 to-gold-400 bg-clip-text text-transparent">
                Vendez avec un système.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ivory-50/60">
              WhatsApp, Facebook, Instagram — vous gérez des dizaines de chats, vous perdez des commandes et vous n&apos;avez aucune visibilité sur votre chiffre d&apos;affaires. ZennShop centralise tout.
            </p>
          </div>

          {/* Grille de raisons */}
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_ZENNSHOP.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm transition-all duration-300 hover:border-gold-400/30 hover:bg-gold-400/5 hover:shadow-lg hover:shadow-gold-400/8"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-400/25 bg-gold-400/10 text-gold-300 transition-colors group-hover:bg-gold-400/20">
                  {item.icon}
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-ivory-50">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ivory-50/55">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </div>

      {/* Séparateur */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      {/* ═══ BLOC 2 : Cockpit interactif ═══ */}
      <div className="relative py-20 sm:py-28">
        <div className="pointer-events-none absolute -bottom-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gold-500/8 blur-[150px]" aria-hidden="true" />
        <Container size="wide" className="relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-ivory-50 sm:text-5xl">
              Tout ce dont vous avez besoin.
              <br />
              <span className="text-gold-gradient">Rien de superflu.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-ivory-50/55">
              Du catalogue à l&apos;encaissement, en passant par la messagerie client — ZennShop remplace 5 applications par une seule.
            </p>
          </div>

          {/* Tab system */}
          <div className="mt-14 grid gap-6 lg:grid-cols-12 lg:items-start">
            {/* Navigation gauche */}
            <div className="flex flex-row gap-2 overflow-x-auto pb-2 lg:col-span-4 lg:flex-col lg:pb-0 hide-scrollbar">
              {COMMERCE_BENEFITS.map((benefit) => (
                <button
                  key={benefit.id}
                  onClick={() => setActiveTab(benefit.id)}
                  className={`group relative flex shrink-0 items-start gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 min-w-[200px] sm:min-w-[260px] lg:min-w-0 lg:w-full ${
                    activeTab === benefit.id
                      ? "border-gold-400/45 bg-gold-400/10 shadow-lg shadow-gold-400/8"
                      : "border-white/6 bg-white/2 hover:border-white/12 hover:bg-white/4"
                  }`}
                >
                  {activeTab === benefit.id && (
                    <div className="absolute inset-y-0 left-0 w-[3px] rounded-r bg-gold-400" />
                  )}
                  <span className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${activeTab === benefit.id ? "bg-gold-400/20 text-gold-300" : "bg-white/5 text-ivory-50/60"}`}>
                    <benefit.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className={`font-display text-sm font-semibold leading-tight ${activeTab === benefit.id ? "text-gold-300" : "text-ivory-50/80"}`}>
                      {benefit.title}
                    </h3>
                    {/* Stat clé */}
                    {activeTab === benefit.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-1.5 flex items-center gap-1.5"
                      >
                        <span className="font-mono text-xs font-bold text-gold-300">{benefit.stat.value}</span>
                        <span className="text-[10px] text-ivory-50/40">{benefit.stat.label}</span>
                      </motion.div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Panneau droit interactif */}
            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-midnight-900 shadow-2xl">
                    {/* Fausse barre de navigateur */}
                    <div className="flex items-center justify-between border-b border-white/6 bg-midnight-950/90 px-4 sm:px-6 py-3 sm:py-3.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 rounded-full bg-red-500/70" />
                        <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 rounded-full bg-yellow-500/70" />
                        <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 rounded-full bg-green-500/70" />
                        <span className="ml-1.5 sm:ml-3 max-w-[150px] sm:max-w-none truncate rounded-md bg-white/5 px-2.5 py-1 font-mono text-[9px] sm:text-[10px] text-ivory-50/35">
                          zennshop.com/espace-vendeur · {activeBenefit.id}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-gold-400/12 px-2.5 sm:px-3 py-0.5 font-mono text-[9px] uppercase tracking-widest text-gold-300/80">
                        Live
                      </span>
                    </div>

                    {/* Contenu */}
                    <div className="grid gap-8 p-7 sm:p-9 md:grid-cols-2">
                      <div className="flex flex-col justify-between gap-6">
                        <div>
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
                            <activeBenefit.icon className="h-6 w-6" />
                          </span>
                          <h4 className="mt-3 font-display text-xl font-bold text-ivory-50 sm:text-2xl leading-tight">
                            {activeBenefit.title}
                          </h4>
                          <p className="mt-3 text-sm leading-relaxed text-ivory-50/65">
                            {activeBenefit.description}
                          </p>
                        </div>
                        <Link
                          href={activeBenefit.href}
                          className="group inline-flex w-full sm:w-fit justify-center items-center gap-2 rounded-xl bg-gold-400 px-6 py-3 text-sm font-bold text-midnight-950 transition-all duration-300 hover:bg-gold-300 hover:shadow-lg hover:shadow-gold-400/20 hover:-translate-y-0.5"
                        >
                          {activeBenefit.cta}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </Link>
                      </div>

                      {/* Liste de features */}
                      <div className="rounded-2xl border border-white/6 bg-white/3 p-5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-300/75">Ce que vous obtenez</span>
                        <ul className="mt-4 space-y-3">
                          {activeBenefit.items.map((item, idx) => (
                            <motion.li
                              key={item}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.08, duration: 0.3 }}
                              className="flex items-start gap-3 group"
                            >
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-400/12 text-gold-300 transition-colors group-hover:bg-gold-400/22">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
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
      </div>
    </section>
  );
}
