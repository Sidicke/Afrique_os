const fs = require('fs');

let content = fs.readFileSync('src/app/espace-client/page.tsx', 'utf8');

// Ensure import is there
if (!content.includes('import MarketplaceHome')) {
    content = content.replace('import { getSessionUser } from "@/lib/api/session";', 'import { getSessionUser } from "@/lib/api/session";\nimport MarketplaceHome from "@/components/marketplace/MarketplaceHome";');
}

// Add the marketplace below the dashboard grid
const marketplaceHTML = `
      {/* ——— Le marketplace — accueil commercial complet (simplifié pour le client) ——— */}
      {/* Espace client connecté : pas de CTA « Créer une boutique 30 jours gratuits » et pas de footer public */}
      <div className="mt-12">
        <MarketplaceHome hideSellerBanner />
      </div>
`;

// Find the end of the overview grid and inject the marketplace
content = content.replace(/<\/Link>\n\s*<\/div>\n\s*<\/div>\n\s*\);\n\}/, '</Link>\n      </div>\n' + marketplaceHTML + '\n    </div>\n  );\n}');

fs.writeFileSync('src/app/espace-client/page.tsx', content);
