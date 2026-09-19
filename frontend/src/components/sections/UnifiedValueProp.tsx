"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Container from "@/components/ui/Container";
import {
  IconStore,
  IconPackage,
  IconCreditCard,
  IconBarChart,
} from "@/components/client/icons";
import { useTranslation } from "@/lib/i18n";

type BenefitIcon = React.ComponentType<{ className?: string }>;

const BENEFIT_ICONS: Record<string, BenefitIcon> = {
  vitrine: IconStore,
  catalogue: IconPackage,
  paiements: IconCreditCard,
  pilotage: IconBarChart,
};

export default function UnifiedValueProp() {
  const { t } = useTranslation();

  const benefits = t.valueProp.benefits;
  const reasons = t.valueProp.reasons;

  const [activeTab, setActiveTab] = useState(benefits[0].id);
  const activeBenefit = benefits.find((b) => b.id === activeTab) ?? benefits[0];
  const ActiveIcon = BENEFIT_ICONS[activeBenefit.id] ?? IconStore;

  return (
    <section id="commerce-os" className="relative overflow-hidden bg-midnight-950">
      {/* Séparateur haut */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold-400/25 to-transparent" />

      {/* ═══ BLOC 1 : Pourquoi ZennShop ═══ */}
      <div className="relative py-12 sm:py-16">
        <div className="gold-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
        <Container size="wide" className="relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-ivory-50 sm:text-5xl lg:text-6xl">
              {t.valueProp.stopDisorder}{" "}
              <span className="bg-gradient-to-r from-gold-300 to-gold-400 bg-clip-text text-transparent">
                {t.valueProp.sellSystem}
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg sm:text-xl leading-relaxed text-ivory-50/70">
              {t.valueProp.introDesc}
            </p>
          </div>

          {/* Grille de raisons */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 sm:mt-12">
            {reasons.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.05, duration: 0.35, ease: "easeOut" }}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm transition-all duration-300 hover:border-gold-400/30 hover:bg-gold-400/5 hover:shadow-lg hover:shadow-gold-400/8 active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-400/25 bg-gold-400/10 text-gold-300 transition-colors group-hover:bg-gold-400/20">
                  {i === 0 && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  )}
                  {i === 1 && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                    </svg>
                  )}
                  {i === 2 && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  )}
                  {i === 3 && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                    </svg>
                  )}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-ivory-50">{item.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-ivory-50/65">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </div>

      {/* Séparateur */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />

      {/* ═══ BLOC 2 : Cockpit interactif ═══ */}
      <div className="relative py-12 sm:py-16">
        <div className="pointer-events-none absolute -bottom-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gold-500/8 blur-[150px]" aria-hidden="true" />
        <Container size="wide" className="relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-ivory-50 sm:text-5xl lg:text-6xl">
              {t.valueProp.everythingYouNeed}
              <br />
              <span className="text-gold-gradient">{t.valueProp.nothingExtra}</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg sm:text-xl text-ivory-50/70 leading-relaxed">
              {t.valueProp.catalogueDesc}
            </p>
          </div>

          {/* Tab system */}
          <div className="mt-12 sm:mt-14 grid gap-6 lg:grid-cols-12 lg:items-start">
            {/* Navigation gauche */}
            <div className="flex flex-row gap-2.5 overflow-x-auto pb-2 lg:col-span-4 lg:flex-col lg:pb-0 hide-scrollbar snap-x">
              {benefits.map((benefit) => {
                const BenefitIcon = BENEFIT_ICONS[benefit.id] ?? IconStore;
                return (
                  <button
                    key={benefit.id}
                    onClick={() => setActiveTab(benefit.id)}
                    className={`group relative flex shrink-0 items-start gap-3.5 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 min-w-[220px] sm:min-w-[270px] lg:min-w-0 lg:w-full active:scale-[0.98] ${
                      activeTab === benefit.id
                        ? "border-gold-400/45 bg-gold-400/10 shadow-md shadow-gold-400/8"
                        : "border-white/6 bg-white/2 hover:border-white/12 hover:bg-white/4"
                    }`}
                  >
                    {activeTab === benefit.id && (
                      <div className="absolute inset-y-0 left-0 w-[3px] rounded-r bg-gold-400" />
                    )}
                    <span className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${activeTab === benefit.id ? "bg-gold-400/20 text-gold-300" : "bg-white/5 text-ivory-50/60"}`}>
                      <BenefitIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className={`font-display text-base font-bold leading-snug ${activeTab === benefit.id ? "text-gold-300" : "text-ivory-50/85"}`}>
                        {benefit.title}
                      </h3>
                      {/* Stat clé */}
                      {activeTab === benefit.id && (
                        <div className="mt-2 flex items-center gap-1.5 animate-in fade-in duration-200">
                          <span className="font-mono text-sm font-bold text-gold-300">{benefit.stat.value}</span>
                          <span className="text-xs text-ivory-50/50">{benefit.stat.label}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Panneau droit interactif */}
            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-midnight-900 shadow-2xl">
                    {/* Fausse barre de navigateur */}
                    <div className="flex items-center justify-between border-b border-white/6 bg-midnight-950/90 px-4 sm:px-6 py-3 sm:py-3.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 rounded-full bg-red-500/70" />
                        <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 rounded-full bg-yellow-500/70" />
                        <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 rounded-full bg-green-500/70" />
                        <span className="ml-2 sm:ml-3 max-w-[180px] sm:max-w-none truncate rounded-md bg-white/5 px-3 py-1 font-mono text-xs text-ivory-50/50">
                          zennshop.com/boutique/votre-commerce · {activeBenefit.id}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-gold-400/12 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-gold-300/90 font-semibold">
                        Live
                      </span>
                    </div>

                    {/* Contenu */}
                    <div className="grid gap-8 p-6 sm:p-9 md:grid-cols-2">
                      <div className="flex flex-col justify-between gap-6">
                        <div>
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
                            <ActiveIcon className="h-6 w-6" />
                          </span>
                          <h4 className="mt-4 font-display text-2xl font-bold text-ivory-50 sm:text-3xl leading-tight">
                            {activeBenefit.title}
                          </h4>
                          <p className="mt-3 text-base sm:text-lg leading-relaxed text-ivory-50/70">
                            {activeBenefit.description}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/10 px-4 py-2 font-mono text-xs text-gold-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-african-green" aria-hidden="true" />
                          <span>{t.valueProp.includedInSpace}</span>
                        </div>
                      </div>

                      {/* Liste de points forts */}
                      <div className="rounded-2xl border border-white/6 bg-white/3 p-5 sm:p-6 flex flex-col justify-center">
                        <ul className="space-y-3.5">
                          {activeBenefit.items.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-3 group transition-transform duration-150"
                            >
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-400/12 text-gold-300 transition-colors group-hover:bg-gold-400/22">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                              <span className="text-base text-ivory-50/90 font-medium leading-normal">{item}</span>
                            </li>
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

      {/* Ligne de transition vers le CTA */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
    </section>
  );
}
