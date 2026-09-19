"use client";

import { useState } from "react";
import Link from "next/link";
import Section from "@/components/ui/Section";
import Container from "@/components/ui/Container";
import { useTranslation } from "@/lib/i18n";

function FaqVisionItem({ item }: { item: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all duration-200 ${open ? "border-gold-400/35 bg-gold-400/[0.04]" : "border-white/8 bg-white/[0.02] hover:border-white/18"}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-4 p-5 sm:p-6 text-left active:bg-white/[0.03] transition-colors rounded-2xl cursor-pointer"
        aria-expanded={open}
      >
        <span className="font-display text-lg sm:text-xl font-bold leading-snug text-ivory-50">{item.q}</span>
        <span className={`shrink-0 mt-0.5 text-2xl font-light transition-transform duration-200 ease-out select-none ${open ? "rotate-45 text-gold-300" : "text-ivory-50/40"}`} aria-hidden="true">+</span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className="px-5 pb-5 sm:px-6 sm:pb-6 text-base sm:text-lg leading-relaxed text-ivory-50/75 border-t border-white/5 pt-3.5">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

export default function VisionFAQ() {
  const { t } = useTranslation();

  return (
    <Section id="vision-faq" tone="dark" className="relative overflow-hidden py-14 sm:py-20">
      {/* Ligne de transition haute */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
      <div className="pointer-events-none absolute inset-0 gold-grid opacity-20" aria-hidden="true" />
      <Container size="narrow" className="relative z-10">
        <div className="mb-3 font-mono text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold text-gold-300">{t.visionFaq.label}</div>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-ivory-50">{t.visionFaq.title}</h2>
        <p className="mt-4 text-lg sm:text-xl leading-relaxed text-ivory-50/70">{t.visionFaq.subtitle}</p>

        <div className="mt-8 space-y-3.5 sm:mt-10">
          {t.visionFaq.items.map((item) => (
            <FaqVisionItem key={item.q} item={item} />
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center text-center sm:mt-12">
          <Link
            href="/contact"
            className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-3 font-display text-sm sm:text-base font-semibold text-ivory-50 transition-all duration-200 hover:border-gold-400/40 hover:bg-gold-400/10 hover:text-gold-300 active:scale-[0.98]"
          >
            {t.visionFaq.ctaContact}
          </Link>
        </div>
      </Container>
    </Section>
  );
}
