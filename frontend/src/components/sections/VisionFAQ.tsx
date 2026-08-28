"use client";

import { useState } from "react";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";

const VISION_FAQ = [
  { q: "01. Qu'est-ce que nous construisons ?", a: "Nous construisons un marché commun pour le commerce africain : une plateforme qui permet aux entreprises de créer leur présence en ligne, de présenter leurs produits et d'atteindre des clients au-delà de leur marché habituel. Notre ambition est simple : rendre le commerce plus accessible, plus connecté et moins limité par les frontières." },
  { q: "02. Quel problème cherchons-nous à résoudre ?", a: "Le commerce africain dispose d'un potentiel considérable, mais reste fortement fragmenté. De nombreuses entreprises peinent encore à construire une présence digitale efficace, gagner en visibilité et accéder à des clients situés au-delà de leur environnement immédiat. Nous créons l'infrastructure qui rapproche ces deux réalités." },
  { q: "03. Pourquoi construire pour le commerce africain ?", a: "Parce que les réalités du commerce africain nécessitent des solutions pensées pour elles. Les habitudes d'achat, les moyens de paiement, les infrastructures et les besoins des entreprises diffèrent fortement d'un marché à l'autre. Notre plateforme est conçue dès le départ pour évoluer avec ces réalités." },
  { q: "04. Comment fonctionne concrètement la plateforme ?", a: "Les entreprises créent leur boutique, présentent leurs produits et accèdent à un espace conçu pour gérer leur activité. Les clients découvrent les boutiques et produits directement depuis le marketplace, consultent les informations disponibles et commandent simplement. Un compte n'est pas obligatoire pour acheter. Notre messagerie interne est au cœur de cette expérience." },
  { q: "05. En quoi notre approche est-elle différente ?", a: "Nous ne cherchons pas simplement à donner une boutique en ligne. Nous construisons un écosystème commercial qui réunit visibilité, distribution, outils de vente, marketplace et accès aux clients dans une même infrastructure. Notre objectif est de permettre à une petite entreprise de commencer simplement et de disposer progressivement de tout ce dont elle a besoin pour changer d'échelle." },
  { q: "06. Où en sommes-nous aujourd'hui ?", a: "Notre première version opérationnelle est désormais disponible et permet aux entreprises de créer leur présence commerciale et aux clients de découvrir les boutiques et leurs produits. Nous développons progressivement l'écosystème autour de cette première base, avec l'objectif de renforcer les outils de vente et la connexion entre les marchés africains." },
  { q: "07. Quels types de partenaires recherchons-nous ?", a: "Nous recherchons des partenaires capables de contribuer concrètement au développement de l'écosystème : banques, acteurs du paiement, investisseurs, grandes entreprises, partenaires technologiques, acteurs de la logistique et organisations disposant d'une expertise stratégique. Nous privilégions ceux capables d'apporter technologie, infrastructure, financement ou accès au marché." },
  { q: "08. Pourquoi rejoindre le projet maintenant ?", a: "Parce que les premières étapes d'un écosystème sont celles où les partenariats peuvent avoir le plus d'impact. Rejoindre tôt permet de participer à sa construction, d'explorer de nouvelles opportunités et de développer une relation stratégique avant les prochaines phases d'expansion." },
  { q: "09. Comment pouvons-nous construire ensemble ?", a: "Il n'existe pas une seule manière de contribuer. Vous pouvez apporter une infrastructure, une technologie, une solution de paiement, un réseau de distribution, une expertise ou simplement une connaissance approfondie d'un marché. Si vous partagez notre ambition de connecter davantage le commerce africain, nous sommes ouverts à construire avec vous." },
];

function FaqVisionItem({ item }: { item: typeof VISION_FAQ[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all duration-300 ${open ? "border-gold-400/30 bg-gradient-to-r from-gold-400/5 to-transparent" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-4 p-6 text-left" aria-expanded={open}>
        <span className="font-display text-base font-medium leading-snug text-ivory-50 sm:text-lg">{item.q}</span>
        <span className={`shrink-0 mt-0.5 text-xl transition-transform duration-300 ${open ? "rotate-45 text-gold-300" : "text-ivory-50/40"}`} aria-hidden="true">+</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-out ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <p className="px-6 pb-6 text-sm leading-relaxed text-ivory-50/70 sm:text-base">{item.a}</p>
      </div>
    </div>
  );
}

export default function VisionFAQ() {
  return (
    <Section id="vision-faq" tone="dark" className="relative overflow-hidden py-28 sm:py-32">
      <div className="pointer-events-none absolute inset-0 gold-grid opacity-20" aria-hidden="true" />
      <Container size="narrow" className="relative z-10">
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-gold-300">Questions fréquentes</div>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">Comprendre notre vision.</h2>
        <p className="mt-4 text-base leading-relaxed text-ivory-50/60 sm:text-lg">Le parcours de notre plateforme : clarifions ce que nous construisons ensemble.</p>

        <div className="mt-12 space-y-3">
          {VISION_FAQ.map((item) => (
            <FaqVisionItem key={item.q} item={item} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <a href="/contact" className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-7 py-3 font-display font-semibold text-midnight-950 shadow-xl shadow-gold-400/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-gold-400/40">
            Parlons du projet
          </a>
        </div>
      </Container>
    </Section>
  );
}
