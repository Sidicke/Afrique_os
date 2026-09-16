"use client";

import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Reveal from "@/components/animations/Reveal";
import Link from "next/link";
import { IconCheck } from "@/components/client/icons";

const STEPS = [
  { num: "01", title: "Créez votre compte", desc: "30 secondes. Votre email, un mot de passe — c'est tout." },
  { num: "02", title: "Nommez votre boutique", desc: "Choisissez un nom unique. Votre lien est généré automatiquement." },
  { num: "03", title: "Ajoutez vos produits", desc: "Photos, prix, stock — depuis votre téléphone en quelques minutes." },
  { num: "04", title: "Encaissez vos premières ventes", desc: "Vos clients commandent et paient. L'argent arrive dans votre wallet." },
];

export default function FinalCTA() {
  return (
    <Section id="commencer" tone="dark" className="relative overflow-hidden">
      {/* Textures */}
      <div className="pointer-events-none absolute inset-0 gold-grid opacity-15" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[min(1100px,95%)] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative py-20 sm:py-32">
        <Container>

          {/* ═══ Étapes simplifiées ═══ */}
          <Reveal>
            <div className="mb-16 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-300" aria-hidden="true" />
                Comment ça marche
              </span>
              <h2 className="mt-6 font-display text-3xl font-bold text-ivory-50 sm:text-4xl">
                Votre boutique en ligne en{" "}
                <span className="text-gold-300">4 étapes</span>
              </h2>
            </div>

            <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Ligne de connexion desktop */}
              <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-gold-400/25 to-transparent lg:block" aria-hidden="true" />

              {STEPS.map((step, i) => (
                <div key={step.num} className="relative flex flex-col items-start gap-3 rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-400/35 bg-gold-400/12 font-mono text-sm font-bold text-gold-300">
                    {step.num}
                  </span>
                  <h3 className="font-display text-base font-semibold text-ivory-50">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-ivory-50/55">{step.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* ═══ CTA final ═══ */}
          <Reveal>
            <div className="relative mt-16 overflow-hidden rounded-3xl border border-gold-400/35 bg-midnight-900 shadow-2xl shadow-gold-400/12">
              {/* Ligne dorée haut */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
              {/* Halo interne */}
              <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-gold-400/6 blur-[80px]" aria-hidden="true" />

              <div className="relative px-6 py-16 text-center sm:px-12 sm:py-20">
                {/* Badge social proof */}
                <div className="inline-flex items-center gap-2 rounded-full border border-green-400/25 bg-green-400/8 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-green-400 mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                  </span>
                  Des vendeurs nous rejoignent chaque jour
                </div>

                <h2 className="mx-auto max-w-3xl font-display text-2xl min-[400px]:text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight text-ivory-50">
                  Donnez un nouvel élan à vos ventes.
                  <br />
                  <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-200 bg-clip-text text-transparent">
                    Votre boutique prête en quelques minutes.
                  </span>
                </h2>

                <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg text-ivory-50/60 px-2">
                  Rejoignez les entrepreneurs et commerçants qui ont structuré leur activité et vendent désormais avec sérénité — directement depuis leur téléphone.
                </p>

                {/* CTAs */}
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/inscription"
                    className="group relative inline-flex w-full sm:w-auto min-h-[56px] items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-gold-400 to-gold-300 px-10 font-display text-[15px] font-bold text-midnight-950 shadow-[0_8px_32px_rgba(212,175,55,0.4)] transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_14px_44px_rgba(212,175,55,0.5)]"
                  >
                    <span className="relative z-10">Lancer ma boutique en ligne</span>
                    <svg className="relative z-10" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    <span className="absolute inset-0 -translate-x-full skew-x-[-15deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  </Link>

                  <Link
                    href="/tarifs"
                    className="inline-flex w-full sm:w-auto min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-ivory-50/18 bg-ivory-50/5 px-8 font-display text-[15px] font-semibold text-ivory-50/85 backdrop-blur-sm transition-all duration-300 hover:border-gold-400/40 hover:bg-gold-400/8 hover:-translate-y-0.5"
                  >
                    Voir les tarifs
                  </Link>
                </div>

                {/* Micro-rassurances */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ivory-50/50">
                  <span className="inline-flex items-center gap-1.5">
                    <IconCheck className="h-3.5 w-3.5 text-gold-400" />
                    Sans carte bancaire
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconCheck className="h-3.5 w-3.5 text-gold-400" />
                    0 FCFA pour démarrer
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconCheck className="h-3.5 w-3.5 text-gold-400" />
                    Annulable à tout moment
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconCheck className="h-3.5 w-3.5 text-gold-400" />
                    Support en français
                  </span>
                </div>

                {/* Prix Business */}
                <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-ivory-50/40 font-mono tracking-wide px-3">
                  <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-300 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-300" />
                  </span>
                  Plan Business : 12 500 FCFA/mois · jusqu&apos;à 3 boutiques · 2% de commission seulement
                </p>
              </div>
            </div>
          </Reveal>

        </Container>
      </div>
    </Section>
  );
}
