"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { Icon, IconName } from "@/components/dashboard/icons";
import { useSession } from "@/lib/useSession";
import { getBoutiqueId, switchActiveBoutique } from "@/lib/api/session";
import { shopsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BoutiqueItem {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  city?: string | null;
  logoImage?: string | null;
}

interface BoutiqueTab {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
}

const BOUTIQUE_TABS: BoutiqueTab[] = [
  { href: "/espace-vendeur/parametres/boutique", label: "Identité", icon: "tag", exact: true },
  { href: "/espace-vendeur/parametres/boutique/visuels", label: "Visuels & Couverture", icon: "palette" },
  { href: "/espace-vendeur/parametres/boutique/contacts", label: "Contacts & Réseaux", icon: "phone" },
  { href: "/espace-vendeur/parametres/boutique/livraison", label: "Modes de Livraison", icon: "truck" },
  { href: "/espace-vendeur/parametres/boutique/promotions", label: "Remises & Promos", icon: "zap" },
];

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useSession();
  const [boutiques, setBoutiques] = useState<BoutiqueItem[]>([]);

  const currentBoutiqueId = session?.user?.boutiqueId || getBoutiqueId();
  const currentBoutiqueName = (session?.user as any)?.boutiqueName || session?.user?.boutiqueSlug || "Ma boutique";

  useEffect(() => {
    shopsApi.myShops().then((res) => {
      setBoutiques(res as BoutiqueItem[]);
    }).catch(() => {});
  }, [currentBoutiqueId]);

  const activeBoutique = boutiques.find((b) => b.id === currentBoutiqueId) || boutiques[0];
  const userPlan = (activeBoutique?.plan || "business").toUpperCase();

  const handleSwitch = (b: BoutiqueItem) => {
    switchActiveBoutique(b.id, b.slug, b.name);
  };

  const isParametresHub = pathname === "/espace-vendeur/parametres";
  const isBoutiqueSetting = pathname.startsWith("/espace-vendeur/parametres/boutique");
  const isProfil = pathname.startsWith("/espace-vendeur/parametres/profil");
  const isNotifications = pathname.startsWith("/espace-vendeur/parametres/notifications");
  const isFormule = pathname.startsWith("/espace-vendeur/parametres/formule");

  let pageTitle = isParametresHub ? "Paramètres - Vos Boutiques" : `Paramètres · ${currentBoutiqueName}`;
  let pageDesc = isParametresHub
    ? "Sélectionnez et configurez indépendamment chacune de vos enseignes."
    : "Gérez l'identité de votre boutique, vos visuels, options de livraison, promotions et coordonnées.";

  if (isProfil) {
    pageTitle = "Mon Profil Vendeur";
    pageDesc = "Gérez vos informations personnelles de compte commerçant, vos coordonnées et la sécurité de votre accès.";
  } else if (isNotifications) {
    pageTitle = "Préférences de Notification";
    pageDesc = "Configurez les alertes et les canaux de notification pour l'ensemble de votre compte commerçant.";
  } else if (isFormule) {
    pageTitle = "Formule & Abonnement";
    pageDesc = "Gérez votre abonnement ZennShop. Votre formule s'applique à l'ensemble de vos boutiques.";
  }

  const isTabActive = (tabHref: string, exact?: boolean) => {
    if (exact) return pathname === tabHref;
    return pathname.startsWith(tabHref);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête principal */}
      <PageHeader
        eyebrow={isBoutiqueSetting ? `Enseigne : ${currentBoutiqueName}` : "Compte Vendeur"}
        title={pageTitle}
        description={pageDesc}
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-xl border border-gold-soft bg-gold-wash px-3.5 py-2 font-mono text-xs font-semibold text-gold-strong">
              <Icon name="shield" size={13} /> {userPlan}
            </span>
          </div>
        }
      />

      {/* Barre de navigation principale : Mes Boutiques vs Profil vs Notifications vs Formule */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5 shadow-xs">
        <Link
          href="/espace-vendeur/parametres"
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap",
            isParametresHub || isBoutiqueSetting
              ? "bg-blue-700 text-white shadow-sm"
              : "text-ink-600 hover:bg-ink-100 hover:text-ink-950"
          )}
        >
          <Icon name="store" size={14} className={isParametresHub || isBoutiqueSetting ? "text-white" : "text-ink-400"} />
          <span>Mes Boutiques</span>
        </Link>

        <Link
          href="/espace-vendeur/parametres/profil"
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap",
            isProfil
              ? "bg-blue-700 text-white shadow-sm"
              : "text-ink-600 hover:bg-ink-100 hover:text-ink-950"
          )}
        >
          <Icon name="user" size={14} className={isProfil ? "text-white" : "text-ink-400"} />
          <span>Profil Commerçant</span>
        </Link>

        <Link
          href="/espace-vendeur/parametres/notifications"
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap",
            isNotifications
              ? "bg-blue-700 text-white shadow-sm"
              : "text-ink-600 hover:bg-ink-100 hover:text-ink-950"
          )}
        >
          <Icon name="bell" size={14} className={isNotifications ? "text-white" : "text-ink-400"} />
          <span>Notifications</span>
        </Link>

        <Link
          href="/espace-vendeur/parametres/formule"
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap",
            isFormule
              ? "bg-blue-700 text-white shadow-sm"
              : "text-ink-600 hover:bg-ink-100 hover:text-ink-950"
          )}
        >
          <Icon name="shield" size={14} className={isFormule ? "text-white" : "text-ink-400"} />
          <span>Formule & Abonnement</span>
        </Link>
      </div>

      {/* Barre de navigation spécifique aux réglages d'une boutique */}
      {isBoutiqueSetting && (
        <div className="flex flex-col gap-3.5">
          {/* Fil d'Ariane et bascule rapide */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/espace-vendeur/parametres"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink-600 transition hover:border-gold-soft hover:bg-gold-wash/40 hover:text-gold-strong shadow-2xs"
            >
              <Icon name="chevronLeft" size={13} />
              Retour à toutes les boutiques
            </Link>

            {/* Bascule discrète d'enseigne si plusieurs boutiques */}
            {boutiques.length > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-ink-400 hidden sm:inline">
                  Changer de boutique :
                </span>
                <div className="flex items-center gap-1">
                  {boutiques.map((b) => {
                    const isCur = b.id === currentBoutiqueId;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSwitch(b)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                          isCur
                            ? "bg-gold-strong text-white shadow-2xs"
                            : "border border-line bg-white text-ink-600 hover:border-gold-soft hover:text-gold-strong"
                        )}
                        title={`Basculer sur ${b.name}`}
                      >
                        {b.name}
                        {isCur && " ✓"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Onglets directs des réglages de la boutique sélectionnée */}
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5 shadow-2xs">
            {BOUTIQUE_TABS.map((tab) => {
              const active = isTabActive(tab.href, tab.exact);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap",
                    active
                      ? "bg-ink-950 text-white shadow-sm"
                      : "text-ink-600 hover:bg-ink-100 hover:text-ink-950"
                  )}
                >
                  <Icon
                    name={tab.icon}
                    size={14}
                    className={active ? "text-gold-300" : "text-ink-400"}
                  />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
