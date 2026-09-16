import type { Metadata } from "next";
import Navbar from "@/components/sections/Navbar";
import Footer from "@/components/sections/Footer";
import Container from "@/components/ui/Container";
import { IconMail, IconBuilding, IconClock } from "@/components/client/icons";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact & Support | ZennShop",
  description:
    "Besoin d'aide, d'un accompagnement personnalisé ou d'informations sur nos formules Entreprise ? Contactez l'équipe ZennShop.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-ivory-50 pb-20 pt-24 sm:pt-28">
        <Container size="wide">
          {/* Header */}
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/10 px-3.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-gold-700">
              Support &amp; Partenariats
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-midnight-950 sm:text-5xl">
              Parlons de votre projet.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base">
              Que vous souhaitiez ouvrir une boutique, intégrer le marketplace en tant que marque ou poser une question sur vos commandes, notre équipe est là pour vous répondre.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-12">
            {/* Colonne gauche : Informations de contact */}
            <div className="flex flex-col justify-between rounded-3xl border border-midnight-950/8 bg-white p-6 shadow-sm sm:p-8 lg:col-span-5">
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-lg font-bold text-midnight-950">
                    Nos canaux d&apos;assistance
                  </h2>
                  <p className="mt-1 text-xs text-ink-500">
                    Nous répondons généralement sous 24h ouvrées.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Email */}
                  <div className="flex items-start gap-3 rounded-2xl bg-midnight-950/[0.02] p-4 border border-midnight-950/5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/15 text-gold-600">
                      <IconMail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-midnight-950">E-mail direct</p>
                      <a
                        href="mailto:support@zennshop.com"
                        className="text-xs text-gold-700 hover:underline font-medium"
                      >
                        support@zennshop.com
                      </a>
                      <p className="mt-0.5 text-[11px] text-ink-400">Pour toute question générale ou suivi</p>
                    </div>
                  </div>

                  {/* Vendeurs & Entreprises */}
                  <div className="flex items-start gap-3 rounded-2xl bg-midnight-950/[0.02] p-4 border border-midnight-950/5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/15 text-gold-600">
                      <IconBuilding className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-midnight-950">Offres Entreprises</p>
                      <a
                        href="mailto:entreprises@zennshop.com"
                        className="text-xs text-gold-700 hover:underline font-medium"
                      >
                        entreprises@zennshop.com
                      </a>
                      <p className="mt-0.5 text-[11px] text-ink-400">Marques, multi-boutiques et partenariats</p>
                    </div>
                  </div>

                  {/* Horaires */}
                  <div className="flex items-start gap-3 rounded-2xl bg-midnight-950/[0.02] p-4 border border-midnight-950/5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/15 text-gold-600">
                      <IconClock className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-midnight-950">Horaires d&apos;ouverture</p>
                      <p className="text-xs text-ink-600">Lundi au Vendredi : 8h30 – 18h30 GMT</p>
                      <p className="text-[11px] text-ink-400">Samedi : 9h00 – 14h00 GMT</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-line/60 pt-6">
                <p className="text-xs text-ink-500">
                  Vous vendez déjà sur ZennShop ? Accédez directement à votre messagerie depuis{" "}
                  <a href="/vendeur/messages" className="font-semibold text-gold-700 hover:underline">
                    l&apos;Espace Vendeur
                  </a>.
                </p>
              </div>
            </div>

            {/* Colonne droite : Formulaire interactif */}
            <div className="rounded-3xl border border-midnight-950/8 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
