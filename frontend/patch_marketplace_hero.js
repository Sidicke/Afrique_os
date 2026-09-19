const fs = require('fs');

let content = fs.readFileSync('src/components/marketplace/MarketplaceHero.tsx', 'utf8');

if (!content.includes('useTranslation')) {
    content = content.replace('import { cn } from "@/lib/utils";', 'import { cn } from "@/lib/utils";\nimport { useTranslation } from "@/lib/i18n";');
    content = content.replace('export function MarketplaceHero(', 'export function MarketplaceHero(\n  { onSelectCategory }: { onSelectCategory?: (slug: string) => void }\n) {\n  const { t } = useTranslation();\n  // DUMMY REPLACE FOR ARGS');
    content = content.replace(/export function MarketplaceHero\(\n.*?\{ onSelectCategory \}\: \{ onSelectCategory\?\: \(slug\: string\) \=\> void \}\n\) \{\n  const \{ t \} = useTranslation\(\);\n  \/\/ DUMMY REPLACE FOR ARGS\n  \{ onSelectCategory \}\: \{ onSelectCategory\?\: \(slug\: string\) \=\> void \}\n\) \{/, 'export function MarketplaceHero({ onSelectCategory }: { onSelectCategory?: (slug: string) => void }) {\n  const { t } = useTranslation();');
}

// Ensure the useTranslation was correctly injected
if (!content.includes('const { t } = useTranslation()')) {
    content = content.replace('export function MarketplaceHero({ onSelectCategory }: { onSelectCategory?: (slug: string) => void }) {', 'export function MarketplaceHero({ onSelectCategory }: { onSelectCategory?: (slug: string) => void }) {\n  const { t } = useTranslation();');
}


// Replace hardcoded strings
const replacements = {
  'Grand marché africain': '{t.marketplace.heroTag}',
  'Achetez auprès de commerces': '{t.marketplace.heroTitleAlt}',
  '100% vérifiés': '{t.marketplace.heroTitleHighlight}',
  'Découvrez des commerçants et artisans indépendants. Commandez directement, échangez sur WhatsApp et payez par Mobile Money en toute sécurité.': '{t.marketplace.heroDesc}',
  'Explorer le catalogue': '{t.marketplace.heroExplore}',
  'Voir les boutiques': '{t.marketplace.heroSeeShops}',
  'Boutiques Partenaires': '{t.marketplace.heroPartnerShops}',
  'Boutique Partenaire': '{t.marketplace.heroPartnerShops}',
  'Produits Disponibles': '{t.marketplace.heroAvailableProducts}',
  'Commerces certifiés': '{t.marketplace.cardCertified}',
  'Boutiques vérifiées': '{t.marketplace.cardVerifiedShops}',
  'Consultez les boutiques locales avec profil vérifié, avis clients et contact WhatsApp direct.': '{t.marketplace.cardVerifiedDesc}',
  'Découvrir les boutiques →': '{t.marketplace.cardDiscoverShops}',
  'Paiement sécurisé': '{t.marketplace.cardSecurePayment}',
  'Mobile Money &amp; Cartes': '{t.marketplace.cardMobileMoney}',
  'Mobile Money & Cartes': '{t.marketplace.cardMobileMoney}',
  'Wave, Orange Money, MTN, Moov et Cartes bancaires. Transactions rapides et protégées.': '{t.marketplace.cardPaymentDesc}',
  'Voir tous les produits →': '{t.marketplace.cardSeeAll}'
};

for (const [fr, key] of Object.entries(replacements)) {
    // Escape string for regex if it contains special chars like ?, .
    const regex = new RegExp(fr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, key);
}

fs.writeFileSync('src/components/marketplace/MarketplaceHero.tsx', content);
console.log("MarketplaceHero patched.");
