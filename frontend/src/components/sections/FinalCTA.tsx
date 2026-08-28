"use client";

import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Reveal from "@/components/animations/Reveal";
import Link from "next/link";

export default function FinalCTA() {
  return (
    <Section id="commencer" tone="dark" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 gold-grid opacity-20" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[min(1000px,95%)] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(ellipse at center, rgba(196,182,151,0.1) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative py-20 sm:py-32">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-gold-400/35 bg-midnight-900 shadow-2xl shadow-gold-400/15">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />

              <div className="px-6 py-16 text-center sm:px-12 sm:py-24">
                <h2 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-tight text-ivory-50 sm:text-6xl">
                  Prêt à lancer votre boutique ?
                  <br />
                  <span className="text-gold-300">Commencez gratuitement.</span>
                </h2>

                <p className="mx-auto mt-6 max-w-xl text-lg text-ivory-50/60">
                  Créez votre vitrine en ligne, ajoutez vos produits et recevez vos premières commandes dès aujourd&apos;hui.
                </p>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/inscription"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-gold-400 px-8 py-3.5 font-display text-[15px] font-semibold text-midnight-950 shadow-lg shadow-gold-400/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-300 active:scale-[0.98]"
                  >
                    Commencer gratuitement
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                  <Link
                    href="/marketplace"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-ivory-50/20 bg-ivory-50/5 px-7 py-3.5 font-display text-[15px] font-semibold text-ivory-50/90 backdrop-blur-sm transition-all duration-300 hover:border-gold-400/40 hover:bg-gold-400/10 active:scale-[0.98]"
                  >
                    Voir les boutiques
                  </Link>
                </div>

                <p className="mt-6 flex items-center justify-center gap-2 text-xs font-mono tracking-wide text-ivory-50/50">
                  <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-300 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-300" />
                  </span>
                  Business : 15 000 FCFA/mois (sans engagement)
                </p>
              </div>
            </div>
          </Reveal>
        </Container>
      </div>
    </Section>
  );
}
