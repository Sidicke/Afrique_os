const fs = require('fs');

let sidebar = fs.readFileSync('src/components/dashboard/layout/DashboardSidebar.tsx', 'utf8');

// I will just use regex to replace NAV_ITEMS.map
sidebar = sidebar.replace(
    '          {NAV_ITEMS.map((group) => (',
    `          {NAV_ITEMS.map(group => {
            const isBusiness = merchantProfile.plan === 'business' || merchantProfile.plan === 'enterprise';
            const filteredItems = group.items.filter(item => {
              if (item.label === 'Mes Boutiques' || item.label === 'Mon Équipe' || item.label === 'Analytics Multi-boutique') {
                return isBusiness;
              }
              return true;
            });
            if (filteredItems.length === 0) return null;
            return { ...group, items: filteredItems };
          }).filter(Boolean).map((group: any) => (`
);

fs.writeFileSync('src/components/dashboard/layout/DashboardSidebar.tsx', sidebar);
