const fs = require('fs');

let sidebar = fs.readFileSync('src/components/dashboard/layout/DashboardSidebar.tsx', 'utf8');

const bottomNavBlock = `        <nav className="flex flex-col gap-1">
          <NavItem label="Messagerie" href="/espace-vendeur/messagerie" icon={ICON_MESSAGES} />
          <NavItem label="Mon Équipe" href="/espace-vendeur/equipe" icon={ICON_TEAM} />
          <NavItem label="Paramètres" href="/espace-vendeur/parametres" icon={ICON_SETTINGS} />
        </nav>`;

const dynamicBottomNavBlock = `        <nav className="flex flex-col gap-1">
          <NavItem label="Messagerie" href="/espace-vendeur/messagerie" icon={ICON_MESSAGES} />
          {(merchantProfile.plan === 'business' || merchantProfile.plan === 'enterprise') && (
            <NavItem label="Mon Équipe" href="/espace-vendeur/equipe" icon={ICON_TEAM} />
          )}
          <NavItem label="Paramètres" href="/espace-vendeur/parametres" icon={ICON_SETTINGS} />
        </nav>`;

sidebar = sidebar.replace(bottomNavBlock, dynamicBottomNavBlock);
fs.writeFileSync('src/components/dashboard/layout/DashboardSidebar.tsx', sidebar);
