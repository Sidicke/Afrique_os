"use client";

import { useState } from "react";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import Reveal from "@/components/animations/Reveal";

const FAQ_ITEMS = [
  { q: "Faut-il savoir coder ?", a: "Non. Nom, téléphone, produits, prix. C'est tout." },
  { q: "Comment mes clients me trouvent ?", a: "Via votre lien unique, le marketplace, ou les réseaux sociaux." },
  { q: "Mes clients doivent-ils créer un compte ?", a: "Non. Nom, téléphone, adresse. Trois champs." },
  { q: "Comment fonctionne la messagerie ?", a: "Le client vous écrit depuis la fiche produit. L'historique est conservé." },
  { q: "Combien ça coûte ?", a: "Starter : gratuit. Pro : 15 000 FCFA/mois. Business : 45 000 FCFA/mois." },
  { q: "Comment gérer mes produits ?", a: "Photos, prix FCFA, catégories, variantes, stock. Tout depuis l'espace vendeur." },
  { q: "Comment les commandes arrivent-elles ?", a: "Instantanément dans votre espace vendeur avec tous les détails." },
  { q: "Comment fonctionne la vérification ?", a: "Pièce d'identité + preuve d'activité. Badge « Vérifiée ✓ » une fois validé." },
];

function FaqItem({ item }: { item: (typeof FAQ_ITEMS)[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all ${open ? "border-gold-400/30 bg-gold-400/5" : "border-white/10 bg-white/3 hover:border-white/20"}`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={open}>
        <span className="font-display text-base font-semibold text-ivory-50">{item.q}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition-transform ${open ? "rotate-180 text-gold-300" : "text-ivory-50/40"}`} aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
        <p className="px-5 pb-5 text-sm text-ivory-50/60">{item.a}</p>
      </div>
    </div>
  );
}

export default function FAQ() {
  return (
    <Section id="faq" tone="dark" className="relative overflow-hidden py-28 sm:py-32">
      <div className="pointer-events-none absolute inset-0 gold-grid opacity-20" aria-hidden="true" />
      <Container size="narrow" className="relative z-10">
        <div className="text-center">
          <Reveal direction="up">
            <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-ivory-50 sm:text-4xl md:text-5xl">
              Questions <span className="text-gold-gradient">fréquentes.</span>
            </h2>
          </Reveal>
        </div>
        <div className="mt-10 space-y-2">
          {FAQ_ITEMS.map((item) => (
            <Reveal key={item.q} direction="up">
              <FaqItem item={item} />
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
