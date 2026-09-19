"use client";

import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Reveal from "@/components/animations/Reveal";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function Problem() {
  const { t } = useTranslation();

  return (
    <Section id="probleme" tone="dark" className="relative overflow-hidden py-28 sm:py-40">
      <div className="pointer-events-none absolute inset-0 gold-grid opacity-20" aria-hidden="true" />

      <Container className="relative z-10">
        {/* ── The big contrast ── */}
        <div className="mx-auto max-w-5xl">
          <Reveal direction="up">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.24em] text-gold-300">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-300 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-300" />
              </span>
              {t.problem.label}
            </span>
          </Reveal>

          <Reveal direction="up" delay={0.1}>
            <h2 className="mt-10 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ivory-50 sm:text-5xl md:text-6xl lg:text-7xl">
              {t.problem.title1}
            </h2>
          </Reveal>

          <Reveal direction="up" delay={0.15}>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ivory-50/40 sm:text-5xl md:text-6xl lg:text-7xl">
              {t.problem.title2}
            </h2>
          </Reveal>

          <Reveal direction="up" delay={0.25}>
            <p className="mt-10 max-w-2xl text-lg leading-relaxed text-ivory-50/60 sm:text-xl sm:leading-relaxed">
              {t.problem.description}
              <br />
              <span className="text-ivory-50/90 font-medium">
                {t.problem.descriptionStrong}
              </span>
            </p>
          </Reveal>

          {/* ── Visual: two columns — reality vs visibility ── */}
          <Reveal direction="up" delay={0.35} className="mt-16">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Reality */}
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-400 font-semibold">
                  {t.problem.realityLabel}
                </span>
                <h3 className="mt-3 font-display text-2xl font-semibold text-ivory-50 sm:text-3xl">
                  {t.problem.realityTitle}
                </h3>
                <p className="mt-3 text-sm text-ivory-50/60">
                  {t.problem.realityDesc}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {t.problem.realityTags.map((tag) => (
                    <span key={tag} className="rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-8">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-300 font-semibold">
                  {t.problem.visibilityLabel}
                </span>
                <h3 className="mt-3 font-display text-2xl font-semibold text-ivory-50 sm:text-3xl">
                  {t.problem.visibilityTitle}
                </h3>
                <p className="mt-3 text-sm text-ivory-50/60">
                  {t.problem.visibilityDesc}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {t.problem.visibilityTags.map((tag) => (
                    <span key={tag} className="rounded-full bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* ── Bridge quote ── */}
          <Reveal delay={0.5} className="mt-16 text-center">
            <p className="font-display text-2xl font-medium text-gold-300 tracking-tight sm:text-3xl">
              {t.problem.bridge}
              <br />
              <span className="text-ivory-50/50">{t.problem.bridgeSub}</span>
            </p>
            <Link
              href="#solution"
              className="mt-6 inline-flex items-center gap-2 text-sm text-ivory-50/50 transition-colors hover:text-gold-300"
            >
              {t.problem.bridgeCta}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="animate-bounce">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </Link>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
