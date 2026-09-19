"use client";

import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Reveal from "@/components/animations/Reveal";
import Link from "next/link";
import { IconCheck } from "@/components/client/icons";
import { useTranslation } from "@/lib/i18n";

export default function FinalCTA() {
  const { t } = useTranslation();

  return (
    <Section id="commencer" tone="dark" className="relative overflow-hidden py-14 sm:py-20">
      {/* Textures */}
      <div className="pointer-events-none absolute inset-0 gold-grid opacity-15" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[min(1100px,95%)] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative">
        <Container>

          {/* ═══ Étapes simplifiées ═══ */}
          <Reveal>
            <div className="mb-10 text-center sm:mb-12">
              <h2 className="font-display text-3xl font-bold text-ivory-50 sm:text-5xl">
                {t.finalCta.stepsTitle}{" "}
                <span className="text-gold-300">{t.finalCta.stepsTitleHighlight}</span>
              </h2>
            </div>

            <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Ligne de connexion desktop */}
              <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-gold-400/25 to-transparent lg:block" aria-hidden="true" />

              {t.finalCta.steps.map((step) => (
                <div key={step.num} className="relative flex flex-col items-start gap-3 rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm transition-all duration-200 hover:border-gold-400/25 hover:bg-gold-400/[0.03]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-400/35 bg-gold-400/12 font-mono text-base font-bold text-gold-300">
                    {step.num}
                  </span>
                  <h3 className="font-display text-lg font-bold text-ivory-50">{step.title}</h3>
                  <p className="text-base leading-relaxed text-ivory-50/65">{step.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* ═══ CTA final ═══ */}
          <Reveal>
            <div className="relative mt-12 overflow-hidden rounded-3xl border border-gold-400/35 bg-midnight-900 shadow-2xl shadow-gold-400/12 sm:mt-16">
              {/* Ligne dorée haut */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
              {/* Halo interne */}
              <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-gold-400/6 blur-[80px]" aria-hidden="true" />

              <div className="relative px-6 py-12 text-center sm:px-12 md:px-16 sm:py-14 max-w-4xl mx-auto">
                <h2 className="mx-auto max-w-3xl font-display text-2xl sm:text-4xl lg:text-[42px] font-bold leading-tight text-ivory-50">
                  {t.finalCta.ctaTitle}
                  <br />
                  <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-200 bg-clip-text text-transparent">
                    {t.finalCta.ctaTitleGold}
                  </span>
                </h2>

                <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-ivory-50/85 px-2 leading-relaxed">
                  {t.finalCta.ctaSubtitle}
                </p>

                {/* Évolution : de petite boutique à grande enseigne */}
                <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-gold-400/25 bg-white/5 px-4 py-2 font-mono text-xs sm:text-sm text-gold-300">
                  <span className="font-semibold text-white">{t.finalCta.evolutionFrom}</span>
                  <span className="text-gold-400/60">→</span>
                  <span className="font-semibold text-gold-300">{t.finalCta.evolutionTo}</span>
                  <span className="text-gold-400/40">·</span>
                  <span className="text-ivory-50/75">{t.finalCta.evolutionFlexible}</span>
                </div>

                {/* CTAs allégés et variés */}
                <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                  <Link
                    href="/inscription?role=seller"
                    className="group relative inline-flex w-full sm:w-auto min-h-[52px] items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-gold-400 to-gold-300 px-8 font-display text-sm sm:text-base font-bold text-midnight-950 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
                  >
                    <span className="relative z-10">{t.finalCta.ctaOpenStore}</span>
                    <svg className="relative z-10" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    <span className="absolute inset-0 -translate-x-full skew-x-[-15deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  </Link>

                  <Link
                    href="/tarifs"
                    className="inline-flex w-full sm:w-auto min-h-[52px] items-center justify-center gap-2 rounded-xl border border-ivory-50/20 bg-ivory-50/5 px-7 font-display text-sm sm:text-base font-bold text-ivory-50/90 backdrop-blur-sm transition-all duration-200 hover:border-gold-400/40 hover:bg-gold-400/10 active:scale-[0.98]"
                  >
                    {t.finalCta.ctaDiscoverBusiness}
                  </Link>
                </div>

                {/* Micro-rassurances sans comparaison tarifaire */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 font-mono text-xs uppercase tracking-wider text-ivory-50/60 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <IconCheck className="h-3.5 w-3.5 text-gold-400" />
                    {t.finalCta.trust1}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconCheck className="h-3.5 w-3.5 text-gold-400" />
                    {t.finalCta.trust2}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconCheck className="h-3.5 w-3.5 text-gold-400" />
                    {t.finalCta.trust3}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconCheck className="h-3.5 w-3.5 text-gold-400" />
                    {t.finalCta.trust4}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

        </Container>
      </div>
    </Section>
  );
}
