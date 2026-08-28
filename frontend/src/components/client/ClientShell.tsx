"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isClientLoggedIn, logout } from "@/lib/accountStore";
import { getSessionUser } from "@/lib/api/session";
import { cn, initials } from "@/lib/utils";
import {
  IconChat,
  IconGift,
  IconHome,
  IconLogout,
  IconPackage,
  IconUser,
} from "./icons";

/**
 * Les 5 entrées de l'espace client — Accueil, Commandes, Discussions, Affiliation, Compte.
 */
const NAV_ITEMS = [
  { href: "/espace-client", label: "Accueil", icon: IconHome, exact: true },
  { href: "/espace-client/commandes", label: "Commandes", icon: IconPackage, exact: false },
  { href: "/espace-client/discussions", label: "Discussions", icon: IconChat, exact: false },
  { href: "/espace-client/affiliation", label: "Affiliation", icon: IconGift, exact: false },
  { href: "/espace-client/compte", label: "Mon compte", icon: IconUser, exact: false },
];

/** Navigation mobile : 5 entrées (règle UX bottom-nav) */
const MOBILE_NAV = NAV_ITEMS;

/**
 * Fil d'Ariane — « où suis-je ? » pendant la navigation dans l'espace client.
 * Renvoie le libellé de la section courante (null sur l'accueil).
 */
function currentSection(pathname: string): string | null {
  if (pathname === "/espace-client") return null;
  if (pathname.startsWith("/espace-client/commandes")) return "Mes commandes";
  if (pathname.startsWith("/espace-client/discussions"))
    return pathname.includes("/nouvelle") ? "Nouvelle discussion" : "Mes discussions";
  if (pathname.startsWith("/espace-client/affiliation")) return "Affiliation & Points";
  if (pathname.startsWith("/espace-client/compte")) return "Mon compte";
  if (pathname.startsWith("/espace-client/parametres")) return "Paramètres";
  if (pathname.startsWith("/espace-client/boutiques")) return "Boutiques";
  return null;
}

/**
 * Coquille de l'espace client — un vrai compte autonome, multi-boutiques.
 *  - Garde : seuls les comptes CLIENT accèdent (redirection vers la connexion
 *    avec retour automatique `next`).
 *  - Navigation premium : topbar sticky (desktop) + bottom nav (mobile).
 */
export default function ClientShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [logginOut, setLogginOut] = useState(false);

  // Garde d'authentification (lecture différée : pas de localStorage au rendu)
  useEffect(() => {
    if (!isClientLoggedIn()) {
      const current = window.location.pathname + window.location.search;
      router.replace(`/connexion?next=${encodeURIComponent(current)}`);
      return;
    }
    const id = window.setTimeout(() => setAuthed(true), 0);
    return () => window.clearTimeout(id);
  }, [router]);

  const handleLogout = async () => {
    setLogginOut(true);
    await logout();
    router.push("/connexion");
  };

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold-400 border-t-midnight-950" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-midnight-950/70">
            Chargement de votre espace…
          </p>
        </div>
      </div>
    );
  }
  if (authed === false) return null; // redirection en cours

  const user = getSessionUser();
  const displayName = user?.name ?? "Client";
  const section = currentSection(pathname);

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      {/* ——— Topbar ——— */}
      <header className="sticky top-0 z-50 border-b border-midnight-950/8 bg-white/85 backdrop-blur-md">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 md:px-6">
          {/* Logo — le texte de marque ne s'affiche qu'à partir de lg pour
              laisser la place à la navigation dès md (pas de débordement). */}
          <Link href="/espace-client" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-midnight-950 font-display text-sm font-bold text-gold-300">
              AC
            </span>
            <span className="hidden flex-col leading-tight lg:flex">
              <span className="font-display text-[15px] font-bold tracking-tight text-midnight-950">
                Afrique Commerce
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-gold-700">
                Espace client
              </span>
            </span>
          </Link>

          {/* Navigation desktop — compacte sur tablette, aérée dès lg */}
          <nav className="hidden items-center gap-0.5 md:flex lg:gap-1" aria-label="Navigation principale">
            {NAV_ITEMS.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium transition-colors lg:px-4",
                    active
                      ? "text-midnight-950"
                      : "text-midnight-950/70 hover:text-midnight-950",
                  )}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-gold-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Identité + déconnexion */}
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/espace-client/compte"
              className="group flex items-center gap-2.5 rounded-full border border-midnight-950/10 bg-white py-1 pl-1 pr-3 transition-colors hover:border-gold-400/60"
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-midnight-950 font-display text-xs font-bold text-gold-300">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(displayName) || "C"
                )}
              </span>
              <span className="hidden max-w-[110px] truncate text-sm font-semibold text-midnight-950 sm:block lg:max-w-[140px]">
                {displayName}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={logginOut}
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-midnight-950/50 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <IconLogout className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* ——— Fil d'Ariane : où suis-je ? ——— */}
      <nav
        aria-label="Fil d'Ariane"
        className="mx-auto flex w-full max-w-screen-2xl items-center gap-1.5 overflow-x-auto px-4 pt-4 text-xs md:px-6"
      >
        <Link
          href="/espace-client"
          aria-current={section === null ? "page" : undefined}
          className="shrink-0 font-medium text-midnight-950/60 transition-colors hover:text-midnight-950"
        >
          Mon espace
        </Link>
        {section && (
          <>
            <span className="shrink-0 text-midnight-950/30" aria-hidden="true">
              / 
            </span>
            <span aria-current="page" className="shrink-0 font-semibold text-midnight-950">
              {section}
            </span>
          </>
        )}
      </nav>

      {/* ——— Contenu ——— */}
      <main id="main-content" className="mx-auto max-w-screen-2xl px-4 py-6 md:px-6 md:py-8">{children}</main>

      {/* ——— Bottom nav mobile ——— */}
      <nav
        aria-label="Navigation mobile"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-midnight-950/8 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 transition-colors",
                  active ? "text-gold-700" : "text-midnight-950/70 hover:text-midnight-950",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[9px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
