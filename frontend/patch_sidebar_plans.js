const fs = require('fs');

// 1. Hide nav items based on plan
let sidebar = fs.readFileSync('src/components/dashboard/layout/DashboardSidebar.tsx', 'utf8');

const navItemsBlock = `
const NAV_ITEMS: NavGroup[] = [
  {
    group: "Boutique",
    items: [
      { label: "Vue d'ensemble", href: "/espace-vendeur", icon: ICON_DASHBOARD },
      { label: "Mes Boutiques", href: "/espace-vendeur/mes-boutiques", icon: ICON_STORES },
    ],
  },
  {
    group: "Gestion",
    items: [
      { label: "Commandes", href: "/espace-vendeur/commandes", icon: ICON_ORDERS, badge: true },
      { label: "Catalogue", href: "/espace-vendeur/produits", icon: ICON_PRODUCTS },
      { label: "Clients", href: "/espace-vendeur/clients", icon: ICON_CUSTOMERS },
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
`;

const dynamicNavItemsBlock = `
// The navigation items are now generated dynamically based on the user's plan.
const getNavItems = (plan: string): NavGroup[] => {
  const isBusinessOrAbove = plan === "business" || plan === "enterprise";
  
  return [
    {
      group: "Boutique",
      items: [
        { label: "Vue d'ensemble", href: "/espace-vendeur", icon: ICON_DASHBOARD },
        // On cache Mes Boutiques pour le plan Starter/Pro
        ...(isBusinessOrAbove ? [{ label: "Mes Boutiques", href: "/espace-vendeur/mes-boutiques", icon: ICON_STORES }] : []),
      ],
    },
    {
      group: "Gestion",
      items: [
        { label: "Commandes", href: "/espace-vendeur/commandes", icon: ICON_ORDERS, badge: true },
        { label: "Catalogue", href: "/espace-vendeur/produits", icon: ICON_PRODUCTS },
        { label: "Clients", href: "/espace-vendeur/clients", icon: ICON_CUSTOMERS },
      ],
    },
    {
      group: "Analyse",
      items: [
        { label: "Statistiques & Ventes", href: "/espace-vendeur/statistiques", icon: ICON_STATS },
        // On cache Analytics Multi-boutique pour le plan Starter/Pro
        ...(isBusinessOrAbove ? [{ label: "Analytics Multi-boutique", href: "/espace-vendeur/analytics", icon: ICON_ANALYTICS }] : []),
      ],
    },
  ];
};
`;

sidebar = sidebar.replace(navItemsBlock, dynamicNavItemsBlock);
sidebar = sidebar.replace('NAV_ITEMS.map(', 'getNavItems(merchantProfile.plan).map(');

// Now for the bottom navigation (Equipe, Parametres)
const bottomNavBlock = `
        <nav className="flex flex-col gap-1">
          <NavItem label="Messagerie" href="/espace-vendeur/messagerie" icon={ICON_MESSAGES} />
          <NavItem label="Mon Équipe" href="/espace-vendeur/equipe" icon={ICON_TEAM} />
          <NavItem label="Paramètres" href="/espace-vendeur/parametres" icon={ICON_SETTINGS} />
        </nav>
`;

const dynamicBottomNavBlock = `
        <nav className="flex flex-col gap-1">
          <NavItem label="Messagerie" href="/espace-vendeur/messagerie" icon={ICON_MESSAGES} />
          {/* On cache Mon Equipe pour le plan Starter/Pro */}
          {(merchantProfile.plan === "business" || merchantProfile.plan === "enterprise") && (
            <NavItem label="Mon Équipe" href="/espace-vendeur/equipe" icon={ICON_TEAM} />
          )}
          <NavItem label="Paramètres" href="/espace-vendeur/parametres" icon={ICON_SETTINGS} />
        </nav>
`;
sidebar = sidebar.replace(bottomNavBlock, dynamicBottomNavBlock);

fs.writeFileSync('src/components/dashboard/layout/DashboardSidebar.tsx', sidebar);
