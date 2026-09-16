import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import FeatureIcon from "@/components/ui/FeatureIcon";
import BackButton from "@/components/ui/BackButton";
import {
  PLANS,
  PREMIUM_TOOLS,
  PRICING_FAQ,
} from "@/lib/plans/plans";

import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Tarifs | ZennShop",
  description: "Commencez gratuitement, développez votre activité. Plans Starter, Business et Enterprise adaptés au marché africain.",
};

/** Avantages clés de la plateforme — section style « pricing__advantages » */
const ADVANTAGES: Array<{ title: string; desc: string; icon: React.ReactNode }> = [
  {
    title: "Commission qui diminue",
    desc: "5 % en Starter, 2 % en Business, négociée en Enterprise. Plus vous grandissez, moins la plateforme prend sur vos ventes.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-gold-300">
        <path d="M3 17l6-6 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 7h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Boutique vérifiée",
    desc: "Le badge « Boutique Vérifiée » rassure vos clients et booste votre crédibilité dès le plan Business.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-gold-300">
        <path d="M12 2l2.4 2.1 3.1-.4 1 3 2.9 1.3-.9 3.1.9 3.1-2.9 1.3-1 3-3.1-.4L12 22l-2.4-2.1-3.1.4-1-3-2.9-1.3.9-3.1-.9-3.1 2.9-1.3 1-3 3.1.4L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8.5 12.2l2.4 2.4 4.6-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Paiement local intégré",
    desc: "Mobile Money, paiement à la livraison, lien WhatsApp direct : vos clients paient comme ils ont l'habitude.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-gold-300">
        <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 14.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Support qui grandit avec vous",
    desc: "Support standard dès le départ, prioritaire 7j/7 en Business, chargé de compte dédié en Enterprise.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-gold-300">
        <path d="M4 12a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="2.5" y="12" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="17.5" y="12" width="4" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M19.5 18v1a3 3 0 01-3 3H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function TarifsPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="relative overflow-hidden bg-midnight-950 text-ivory-50">
        {/* Hero */}
        <section className="relative pt-24 pb-16 sm:pt-36 sm:pb-24">
          <div className="gold-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden />
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[640px] w-[980px] -translate-x-1/2 rounded-full bg-gradient-to-b from-gold-400/15 via-gold-300/5 to-transparent blur-[120px]" aria-hidden />

          <Container size="wide" className="relative z-10">
            <div className="mb-10">
              <BackButton label="Retour" />
            </div>
            <div className="text-center">
              <h1 className="font-display text-3xl min-[400px]:text-4xl sm:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight text-ivory-50">
                Grandissez à votre rythme.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base sm:text-xl leading-relaxed text-ivory-50/70 px-2">
                Commencez gratuitement, développez votre activité et accédez à des outils conçus pour vous aider à vendre davantage.
              </p>
            </div>
          </Container>
        </section>

        {/* Plans */}
        <section id="plans" className="pb-24">
          <Container size="wide">
            <div className="grid gap-6 md:grid-cols-3 md:items-start">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl border p-8 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${
                    plan.highlight
                      ? "border-2 border-gold-400 bg-midnight-900 shadow-2xl shadow-gold-400/15"
                      : "border-white/10 bg-midnight-900/60 hover:border-gold-400/40"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-400 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-midnight-950 shadow-lg">
                      {plan.badge}
                    </span>
                  )}
                  <h2 className="font-display text-2xl font-bold text-ivory-50">{plan.label}</h2>
                  <div className="mt-3 text-3xl font-extrabold text-gold-300">{plan.priceLabel}</div>
                  <div className="mt-1 font-mono text-xs uppercase tracking-wider text-ivory-50/50">
                    Commission : <span className="text-ivory-50/80">{plan.commission}</span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-ivory-50/70">{plan.position}</p>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-ivory-50/80">
                        <FeatureIcon />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Button href={plan.ctaHref} variant={plan.highlight ? "primary" : "secondary"} size="md" className="w-full">
                      {plan.cta}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Avantages */}
        <section className="border-y border-white/10 bg-midnight-900/40 py-20">
          <Container size="wide">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-ivory-50 sm:text-4xl">
                Une plateforme pensée pour le commerce africain.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-ivory-50/70">
                Quel que soit votre plan, la base reste la même : vendre simplement, encaisser localement, grandir sereinement.
              </p>
            </div>
            <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {ADVANTAGES.map((adv) => (
                <div key={adv.title} className="flex flex-col items-start gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-400/25 bg-gold-400/10">
                    {adv.icon}
                  </span>
                  <h3 className="font-display text-lg font-semibold text-ivory-50">{adv.title}</h3>
                  <p className="text-sm leading-relaxed text-ivory-50/60">{adv.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Premium Tools */}
        <section className="py-24">
          <Container size="wide">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-ivory-50 sm:text-4xl">Des outils pour aller plus loin.</h2>
              <p className="mx-auto mt-4 max-w-xl text-ivory-50/70">Activez uniquement ce dont votre entreprise a besoin.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PREMIUM_TOOLS.map((t) => (
                <div key={t.name} className="rounded-2xl border border-white/10 bg-midnight-900/60 p-6 transition-colors hover:border-gold-400/30">
                  <h3 className="font-display text-lg font-semibold text-ivory-50">{t.name}</h3>
                  <p className="mt-2 text-sm text-ivory-50/60">{t.desc}</p>
                  <div className="mt-4 text-xs font-mono uppercase tracking-wider text-gold-300/70">Extension : disponible prochainement</div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section className="pb-24">
          <Container size="wide" className="max-w-3xl">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-ivory-50 sm:text-4xl">Questions fréquentes.</h2>
              <p className="mx-auto mt-4 max-w-xl text-ivory-50/70">Tout ce que les commerçants nous demandent avant de se lancer.</p>
            </div>
            <div className="mt-10 space-y-3">
              {PRICING_FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-white/10 bg-midnight-900/60 transition-colors open:border-gold-400/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-sm font-semibold text-ivory-50 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-gold-300 transition-transform duration-200 group-open:rotate-180"
                    >
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <p className="px-6 pb-5 text-sm leading-relaxed text-ivory-50/65">{item.a}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA Final */}
        <section className="pb-24">
          <Container size="wide" className="text-center">
            <h2 className="font-display text-3xl font-bold text-ivory-50 sm:text-5xl">Prêt à développer votre activité ?</h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/inscription" variant="primary" size="lg" className="shadow-xl shadow-gold-400/30">Créer ma boutique</Button>
              <Link href="/contact" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 text-base font-extrabold text-ivory-50 transition-all hover:-translate-y-1 hover:border-gold-400/40 hover:bg-gold-400/10 hover:text-gold-300">Parler à notre équipe</Link>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
