"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders } from "@/hooks/useOrders";
import { logout } from "@/lib/accountStore";
import {
  merchantProfile,
  refreshProfile,
  PLAN_LABEL,
  PLAN_PRICE_LINE,
} from "@/services/dashboardService";
import type { OrderStatus } from "@/types/dashboard";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

/** Icônes SVG de la navigation — regroupées par domaine métier pour accueillir
 * naturellement les futurs modules (messagerie, équipe, marketplace…). */
const ICON_DASHBOARD = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const ICON_STORES = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1.5-5h15L21 9" />
    <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    <path d="M5 12v9h14v-9" />
    <path d="M10 21v-5h4v5" />
  </svg>
);
const ICON_ORDERS = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
const ICON_PRODUCTS = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const ICON_CLIENTS = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const ICON_MESSAGERIE = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
const ICON_STATS = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const ICON_ANALYTICS = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

/** Navigation regroupée par domaine métier — chaque module futur (messagerie,
 * équipe, marketplace…) trouvera naturellement sa place dans un groupe existant. */
const ICON_TEAM = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const NAV_ITEMS = [
  {
    group: "Pilotage",
    items: [
      { label: "Tableau de bord", href: "/espace-vendeur", icon: ICON_DASHBOARD },
      { label: "Mon Équipe", href: "/espace-vendeur/equipe", icon: ICON_TEAM },
    ],
  },
  {
    group: "Ventes",
    items: [
      {
        label: "Commandes",
        href: "/espace-vendeur/commandes",
        badgeKey: "orders_to_handle" as const,
        icon: ICON_ORDERS,
      },
      { label: "Produits", href: "/espace-vendeur/produits", icon: ICON_PRODUCTS },
      { label: "Clients", href: "/espace-vendeur/clients", icon: ICON_CLIENTS },
      { label: "Portefeuille", href: "/espace-vendeur/portefeuille", icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      ) },
      { label: "Messagerie", href: "/espace-vendeur/messagerie", icon: ICON_MESSAGERIE },
    ],
  },
  {
    group: "Analyse",
    items: [
      { label: "Statistiques & Ventes", href: "/espace-vendeur/statistiques", icon: ICON_STATS },
      { label: "Analytics Multi-boutique", href: "/espace-vendeur/analytics", icon: ICON_ANALYTICS },
    ],
  },
];

const PARAMETRES_TREE = [
  { label: "Mes boutiques", href: "/espace-vendeur/parametres", icon: "boutiques" as const },
  { label: "Profil", href: "/espace-vendeur/parametres/profil", icon: "profil" as const },
  { label: "Vérification KYC", href: "/espace-vendeur/parametres/verification", icon: "cert" as const },
  { label: "Notifications", href: "/espace-vendeur/parametres/notifications", icon: "notifications" as const },
  { label: "Formule", href: "/espace-vendeur/parametres/formule", icon: "formule" as const },
];

/** Icônes ligne des sous-paramètres (style fichier, petit trait vertical) */
const LEAF_ICONS: Record<string, React.ReactNode> = {
  boutiques: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  general: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  visuels: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  contacts: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  livraison: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  promotions: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" />
    </svg>
  ),
  cert: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  profil: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  notifications: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  formule: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" />
    </svg>
  ),
};

export default function DashboardSidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Badge « Commandes » : nombre réel de commandes à traiter (API réelle)
  const { data: orders } = useOrders();
  const ACTION_STATUSES: OrderStatus[] = ["pending", "paid", "shipping"];
  const ordersToHandle = orders?.filter((o) => ACTION_STATUSES.includes(o.status)).length ?? 0;

  // Reactivité du plan pour cacher correctement les onglets
  const [currentPlan, setCurrentPlan] = useState(merchantProfile.plan);
  
  // NOTE: useEffect is imported at the top now
  useEffect(() => {
    refreshProfile().then(p => setCurrentPlan(p.plan));
  }, []);

  // Arborescence « Paramètres Boutique » ouverte quand on est dans /dashboard/parametres
  const inParametres = pathname.startsWith("/espace-vendeur/parametres");
  const [parametresOpen, setParametresOpen] = useState(inParametres);

  /** Déconnexion — révocation serveur + session locale, retour à la connexion */
  const handleLogout = async () => {
    await logout();
    onCloseMobile?.();
    router.push("/connexion");
  };

  /** Clic sur le parent : ouvre l'arbre et, depuis une autre page, mène au général */
  const handleParametresToggle = () => {
    setParametresOpen((o) => {
      const next = !o;
      if (!inParametres) router.push("/espace-vendeur/parametres");
      return next;
    });
    onCloseMobile?.();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand Header — épinglé en haut (ne défile pas) */}
      <div className="shrink-0 border-b border-line px-5 pb-5 pt-5">
        <div className="flex items-center justify-between">
          <Link href="/espace-vendeur" className="group flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-soft bg-gold-wash font-display text-sm font-bold text-gold-strong transition-colors group-hover:bg-gold-mid group-hover:text-white">
              AC
            </span>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold tracking-wide text-ink-950">
                ZennShop
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
                Espace Vendeur
              </span>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-950 lg:hidden"
              aria-label="Fermer le menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Navigation — défile en interne quand l'écran est court (jamais de contenu perdu) */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4 [scrollbar-width:thin]">
        {/* Navigation Section */}
        <div className="flex flex-col gap-6">
          {NAV_ITEMS.map(group => {
            const isBusiness = currentPlan === 'business' || currentPlan === 'enterprise';
            const filteredItems = group.items.filter(item => {
              if (item.label === 'Mes Boutiques' || item.label === 'Mon Équipe' || item.label === 'Analytics Multi-boutique') {
                return isBusiness;
              }
              return true;
            });
            if (filteredItems.length === 0) return null;
            return { ...group, items: filteredItems };
          }).filter(Boolean).map((group: any) => (
            <div key={group.group}>
              <h4 className="mb-2.5 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">
                {group.group}
              </h4>
              <nav className="flex flex-col gap-1">
                {group.items.map((item: any) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        "group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-blue-700 text-white shadow-md shadow-blue-700/25"
                          : "text-ink-600 hover:bg-ink-50 hover:text-ink-950"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "transition-colors",
                            isActive ? "text-gold-soft" : "text-ink-400 group-hover:text-gold-strong"
                          )}
                        >
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>

                      {item.badgeKey === "orders_to_handle" && ordersToHandle > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
                            isActive ? "bg-white/15 text-white" : "bg-green-100 text-green-700"
                          )}
                        >
                          {ordersToHandle}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}

          {/* Arborescence « Paramètres Boutique » */}
          <div>
            <h4 className="mb-2.5 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-500">
              Configuration
            </h4>
            <nav className="flex flex-col gap-1">
              {/* Parent — Paramètres Boutique */}
              <button
                type="button"
                onClick={handleParametresToggle}
                className={cn(
                  "group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                  inParametres
                    ? "bg-blue-700 text-white shadow-md shadow-blue-700/25"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-950"
                )}
                aria-expanded={parametresOpen}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("transition-colors", inParametres ? "text-gold-soft" : "text-ink-400 group-hover:text-gold-strong")}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </span>
                  <span>Paramètres</span>
                </div>
                <span className={cn("transition-transform duration-200", parametresOpen && "rotate-180")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>

              {/* Sous-paramètres (arborescence) */}
              <AnimatePresence initial={false}>
                {parametresOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 flex flex-col gap-0.5 border-l border-line/80 pl-3 ml-3">
                      {PARAMETRES_TREE.map((node) => {
                        const active =
                          node.href === "/espace-vendeur/parametres"
                            ? pathname === "/espace-vendeur/parametres" ||
                              pathname.startsWith("/espace-vendeur/parametres/boutique")
                            : pathname === node.href;
                        return (
                          <Link
                            key={node.label}
                            href={node.href}
                            onClick={onCloseMobile}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                              active
                                ? "bg-blue-700 text-white shadow-sm"
                                : "text-ink-600 hover:bg-ink-50 hover:text-ink-950"
                            )}
                          >
                            <span className={cn("transition-colors", active ? "text-gold-soft" : "text-ink-400")}>
                              {LEAF_ICONS[node.icon]}
                            </span>
                            {node.label}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </nav>
          </div>
        </div>
      </div>

      {/* Mon abonnement — épinglé en bas (toujours accessible) */}
      <div className="shrink-0 border-t border-line p-3.5">
        <div className="rounded-2xl border border-line bg-surface p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gold-wash font-mono text-[10px] font-bold text-gold-strong">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 1l2.9 7.3 7.9.6-6 4.9 1.9 7.7L12 17.3l-6.7 4.2 1.9-7.7-6-4.9 7.9-.6z" />
              </svg>
            </span>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-600">
                {PLAN_LABEL[currentPlan] ?? currentPlan}
              </p>
              <div className="flex flex-col mt-0.5 text-[9px] text-ink-400">
                <span>
                  {merchantProfile.productsCount ?? 0} / {currentPlan === 'starter' ? '20' : currentPlan === 'business' ? '150' : '∞'} prod.
                </span>
                <span>
                  {merchantProfile.boutiquesCount ?? 1} / {currentPlan === 'starter' ? '1' : currentPlan === 'business' ? '3' : '∞'} bout.
                </span>
                <span>
                  Comm. {currentPlan === 'starter' ? '5%' : currentPlan === 'business' ? '2%' : 'Nég.'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/espace-vendeur/parametres/formule"
              onClick={onCloseMobile}
              className="rounded-lg border border-line px-2 py-1 font-mono text-[10px] font-semibold text-ink-600 transition-colors hover:border-gold-mid hover:text-gold-strong"
            >
              Gérer
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="cursor-pointer rounded-lg border border-line p-1.5 text-ink-400 transition-colors hover:border-red-100 hover:bg-red-100/60 hover:text-red-600"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-hidden border-r border-line bg-surface lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-ink-950/45 backdrop-blur-sm"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-surface shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
