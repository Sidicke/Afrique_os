import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import SWRProvider from "@/providers/SWRProvider";
import { CookieConsent } from "@/components/shared/CookieConsent";

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap', preload: true });

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Afrique Commerce OS | Votre commerce en pleine lumière",
  description:
    "Une boutique en ligne en quelques minutes. Du commerce dispersé au commerce connecté.",
  keywords: [
    "boutique en ligne",
    "commerce africain",
    "marketplace Afrique",
    "e-commerce Afrique",
    "catalogue digital",
  ],
  openGraph: {
    title: "Afrique Commerce OS | Votre commerce en pleine lumière",
    description: "Du commerce dispersé au commerce connecté : une boutique en ligne en quelques minutes.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} ${manrope.variable}`}
    >
      <body className="min-h-screen antialiased">
        {/* Skip link — navigation clavier (UI/UX Pro Max §1 : Skip Links) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-midnight-950 focus:px-4 focus:py-2.5 focus:font-mono focus:text-xs focus:font-semibold focus:text-gold-300 focus:shadow-lg"
        >
          Aller au contenu principal
        </a>
        <SWRProvider>
          {children}
          <CookieConsent />
        </SWRProvider>
      </body>
    </html>
  );
}
