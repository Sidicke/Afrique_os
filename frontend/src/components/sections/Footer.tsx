"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import { useTranslation } from "@/lib/i18n";
import { PreferenceSelector } from "@/components/shared/PreferenceSelector";

// Canal de contact officiel
const SUPPORT_EMAIL = "contact@zennshop.com";

export default function Footer() {
  const { t } = useTranslation();

  const footerLinks = [
    {
      title: t.footer.platform,
      links: [
        { label: t.navbar.marketplace, href: "/marketplace" },
        { label: t.footer.search, href: "/recherche" },
        { label: t.navbar.pricing, href: "/tarifs" },
      ],
    },
    {
      title: t.footer.stores,
      links: [
        { label: t.footer.openStore, href: "/inscription?role=seller" },
        { label: t.navbar.sellerSpace, href: "/connexion" },
      ],
    },
    {
      title: t.footer.clients,
      links: [
        { label: t.navbar.clientSpace, href: "/connexion" },
        { label: t.navbar.register, href: "/inscription?role=client" },
      ],
    },
  ];

  return (
    <footer className="relative w-full overflow-hidden border-t border-white/10 bg-midnight-950 text-white">
      {/* Liseré doré supérieur — la lumière passe sur le bord */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent"
      />

      {/* Texture & halo ambiant */}
      <div aria-hidden="true" className="gold-grid pointer-events-none absolute inset-0 opacity-40" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[70rem] max-w-full -translate-x-1/2 rounded-full bg-gold-400/5 blur-3xl"
      />

      <Container size="full" className="relative">
        {/* ——— Bande CTA ——— */}
        <div className="flex flex-col items-start justify-between gap-10 border-b border-white/10 py-16 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-ivory-50 sm:text-4xl">
              {t.footer.tagline.replace(".", "")}, <span className="text-gold-gradient">en pleine lumière.</span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ivory-50/60">
              {t.footer.ctaTitle}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button href="/inscription?role=seller" variant="primary" size="lg">
              {t.footer.openStore}
            </Button>
            <Button href="/marketplace" variant="secondary" size="lg">
              {t.footer.exploreMarketplace}
            </Button>
          </div>
        </div>

        {/* ——— Grille principale ——— */}
        <div className="grid gap-12 py-16 lg:grid-cols-12">
          {/* Marque */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="group flex w-fit items-center gap-2.5"
              aria-label="ZennShop"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/40 bg-gold-400/10 font-display text-sm font-bold text-gold-300 transition-all duration-300 group-hover:bg-gold-400 group-hover:text-midnight-950 group-hover:shadow-lg group-hover:shadow-gold-400/25">
                ZS
              </span>
              <span className="font-display text-base font-semibold tracking-wide text-ivory-50">
                Zenn<span className="text-gold-300">Shop</span>
              </span>
            </Link>

            <p className="mt-6 max-w-sm text-base leading-relaxed text-ivory-50/55">
              {t.footer.description}
            </p>

            {/* Contact réel — e-mail de la plateforme */}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-ivory-50/75 transition-all duration-300 hover:border-gold-400/40 hover:bg-gold-400/10 hover:text-gold-300"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                  x="2"
                  y="4"
                  width="20"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="m22 7-10 6L2 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {SUPPORT_EMAIL}
            </a>
          </div>

          {/* Colonnes de liens */}
          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-8 lg:pl-8">
            {footerLinks.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-gold-300">
                  {column.title}
                </h3>
                <ul className="mt-5 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="group relative w-fit text-sm text-ivory-50/60 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-950 hover:text-gold-300"
                      >
                        <span className="relative">
                          {link.label}
                          {/* Soulignement doré qui glisse */}
                          <span
                            aria-hidden="true"
                            className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-gold-400 to-transparent transition-transform duration-300 ease-out group-hover:scale-x-100"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* ——— Barre finale avec sélecteurs de préférences ——— */}
        <div className="flex flex-col items-center justify-between gap-5 border-t border-white/10 py-8 sm:flex-row">
          <p className="order-3 text-center text-xs text-ivory-50/40 sm:order-1 sm:text-left">
            © {new Date().getFullYear()} ZennShop. {t.footer.rightsReserved}
          </p>

          <div className="order-1 flex flex-wrap items-center justify-center gap-4 sm:gap-6 sm:order-2">
            <Link
              href="/marketplace"
              className="text-xs text-ivory-50/50 transition-colors duration-200 hover:text-gold-300"
            >
              {t.navbar.marketplace}
            </Link>
            <Link
              href="/recherche"
              className="text-xs text-ivory-50/50 transition-colors duration-200 hover:text-gold-300"
            >
              {t.footer.search}
            </Link>
            <Link
              href="/connexion"
              className="text-xs text-ivory-50/50 transition-colors duration-200 hover:text-gold-300"
            >
              {t.footer.login}
            </Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("open-cookie-settings"));
                }
              }}
              className="cursor-pointer text-xs text-ivory-50/50 transition-colors duration-200 hover:text-gold-300"
            >
              {t.footer.cookies}
            </button>
          </div>

          <div className="order-2 sm:order-3">
            <PreferenceSelector variant="footer" />
          </div>
        </div>
      </Container>
    </footer>
  );
}
