"use client";

import Link from "next/link";
import { IconTwitter, IconFacebook, IconLinkedin, IconInstagram, IconMail } from "./icons";
import { useShopConfig } from "@/lib/useShopConfig";

export function StoreFooter() {
  const config = useShopConfig();

  const socialLinks = [
    { href: config.social.instagram, icon: IconInstagram, label: "Instagram" },
    { href: config.social.facebook, icon: IconFacebook, label: "Facebook" },
    { href: config.social.twitter, icon: IconTwitter, label: "Twitter" },
    { href: config.social.linkedin, icon: IconLinkedin, label: "LinkedIn" },
  ].filter((s) => s.href);

  return (
    <footer id="contact" className="bg-[#fafafa] pt-20 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-2xl font-display font-bold text-midnight-950 mb-6">
              {config.name}
            </h2>
            <p className="text-gray-500 max-w-sm mb-8">
              {config.description}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {socialLinks.length > 0 && (
                <div className="flex space-x-3">
                  {socialLinks.map(({ href, icon: Icon, label }) => (
                    <Link
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="w-10 h-10 bg-midnight-950 rounded-full flex items-center justify-center text-white hover:bg-gold-400 hover:text-midnight-950 transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </Link>
                  ))}
                </div>
              )}
              {config.email && (
                <a
                  href={`mailto:${config.email}`}
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-midnight-950 transition-colors"
                >
                  <IconMail className="w-4 h-4 text-gold-600" />
                  {config.email}
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-midnight-950 mb-6">La plateforme</h3>
            <ul className="space-y-4">
              <li><Link href="/" className="text-gray-500 hover:text-midnight-950 transition-colors">Accueil</Link></li>
              <li><Link href="/marketplace" className="text-gray-500 hover:text-midnight-950 transition-colors">Le marketplace</Link></li>
              <li><Link href="/boutique" className="text-gray-500 hover:text-midnight-950 transition-colors">Boutique démo</Link></li>
              <li><Link href="/inscription" className="text-gray-500 hover:text-midnight-950 transition-colors">Créer ma boutique</Link></li>
              <li><Link href="/connexion" className="text-gray-500 hover:text-midnight-950 transition-colors">Se connecter</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-midnight-950 mb-6">Acheter</h3>
            <ul className="space-y-4">
              <li><Link href="/marketplace" className="text-gray-500 hover:text-midnight-950 transition-colors">Le marketplace</Link></li>
              <li><Link href="/marketplace#boutiques" className="text-gray-500 hover:text-midnight-950 transition-colors">Toutes les boutiques</Link></li>
              <li><Link href="/connexion" className="text-gray-500 hover:text-midnight-950 transition-colors">Espace client</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} <span className="text-gold-600 font-medium">{config.name}</span>. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-gray-500 hover:text-midnight-950 transition-colors">Plateforme</Link>
            <Link href="/marketplace" className="text-gray-500 hover:text-midnight-950 transition-colors">Le marketplace</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default StoreFooter;