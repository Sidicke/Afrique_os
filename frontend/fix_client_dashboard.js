const fs = require('fs');

let content = fs.readFileSync('src/app/espace-client/page.tsx', 'utf8');

if (!content.includes('import MarketplaceHome')) {
    content = content.replace('import { getSessionUser } from "@/lib/api/session";', 'import { getSessionUser } from "@/lib/api/session";\nimport MarketplaceHome from "@/components/marketplace/MarketplaceHome";');
}

const marketplaceHTML = `
      {/* ——— Le marketplace — accueil commercial complet (simplifié pour le client) ——— */}
      {/* Espace client connecté : pas de CTA « Créer une boutique 30 jours gratuits » et pas de footer public */}
      <div className="mt-12">
        <MarketplaceHome hideSellerBanner />
      </div>
`;

// Insert before the last </div>\n  );\n}
const parts = content.split('    </div>\n  );\n}');
if (parts.length > 1) {
    content = parts.join(marketplaceHTML + '\n    </div>\n  );\n}');
}

fs.writeFileSync('src/app/espace-client/page.tsx', content);
