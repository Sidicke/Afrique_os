"use client";

import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Reveal from "@/components/animations/Reveal";
import { useTranslation } from "@/lib/i18n";

export default function Solution() {
  const { t } = useTranslation();

  return (
    <Section id="solution" tone="dark" className="relative overflow-hidden py-28 sm:py-40">
      <div className="pointer-events-none absolute inset-0 gold-grid opacity-20" aria-hidden="true" />

      <Container className="relative z-10">
        <div className="mx-auto max-w-5xl text-center">
          <Reveal direction="up">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.24em] text-gold-300">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-300 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-300" />
              </span>
              {t.solution.label}
            </span>
          </Reveal>

          <Reveal direction="up" delay={0.1}>
            <h2 className="mt-10 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ivory-50 sm:text-5xl md:text-6xl lg:text-7xl">
              {t.solution.title1}
              <br />
              {t.solution.title1b}
            </h2>
          </Reveal>

          <Reveal direction="up" delay={0.15}>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-gold-gradient sm:text-5xl md:text-6xl lg:text-7xl">
              {t.solution.title2}
              <br />
              {t.solution.title2b}
            </h2>
          </Reveal>

          {/* ── Visual transformation: before → after ── */}
          <Reveal direction="up" delay={0.3} className="mt-16">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-midnight-900/80">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />

              <div className="grid lg:grid-cols-12">
                {/* Before */}
                <div className="p-8 lg:col-span-5 lg:border-r lg:border-white/10">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-300 font-semibold">
                    {t.solution.beforeLabel}
                  </span>
                  <div className="mt-6 space-y-4">
                    {t.solution.beforeItems.map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-xl bg-white/3 px-4 py-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-sm text-ivory-50/60">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="hidden lg:flex lg:col-span-2 items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-400/30 bg-gold-400/10">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gold-300" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* After */}
                <div className="p-8 lg:col-span-5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-400 font-semibold">
                    {t.solution.afterLabel}
                  </span>
                  <div className="mt-6 space-y-4">
                    {t.solution.afterItems.map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-xl bg-emerald-400/5 border border-emerald-400/10 px-4 py-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-sm font-medium text-ivory-50/90">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.45} className="mt-12">
            <p className="font-display text-xl font-medium text-ivory-50/80">
              {t.solution.conclusion}
              <br />
              <span className="text-gold-300">{t.solution.conclusionGold}</span>
            </p>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
