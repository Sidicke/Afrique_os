const fs = require('fs');

const frAdditions = `
    // Deals and Latest
    dealsDirect: "OFFRES DIRECTES",
    dealsSelection: "SÉLECTION DU MOMENT",
    dealsSubtitle: "Prix réduits par les vendeurs",
    dealsDefaultDesc: "Offre exclusive à ne pas manquer ! Profitez d'une réduction exceptionnelle aujourd'hui.",
    latestTag: "DÉCOUVERTE",
    latestSubtitle: "Mode, tech, maison, beauté : explorez le catalogue complet de toutes les boutiques partenaires vérifiées.",
    latestCta: "Découvrir tout le catalogue →",
`;

const enAdditions = `
    // Deals and Latest
    dealsDirect: "DIRECT DEALS",
    dealsSelection: "CURRENT SELECTION",
    dealsSubtitle: "Prices reduced by sellers",
    dealsDefaultDesc: "Exclusive offer not to be missed! Enjoy an exceptional discount today.",
    latestTag: "DISCOVERY",
    latestSubtitle: "Fashion, tech, home, beauty: explore the complete catalog of all verified partner shops.",
    latestCta: "Discover the entire catalog →",
`;

const patchLocales = (file, additions) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('// Search Results extra', additions + '\n    // Search Results extra');
  fs.writeFileSync(file, content);
}

patchLocales('src/lib/i18n/locales/fr.ts', frAdditions);
patchLocales('src/lib/i18n/locales/en.ts', enAdditions);

const patchFile = (file, replacements) => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('const { t } = useTranslation();')) {
      content = content.replace(/export default function (\w+)\(\) \{/, 'export default function $1() {\n  const { t } = useTranslation();');
  }

  for (const [fr, key] of Object.entries(replacements)) {
      const regex = new RegExp(fr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      content = content.replace(regex, key);
  }
  fs.writeFileSync(file, content);
};

patchFile('src/components/marketplace/MarketplaceDailyDeals.tsx', {
  'OFFRES DIRECTES': '{t.marketplace.dealsDirect}',
  'SÉLECTION DU MOMENT': '{t.marketplace.dealsSelection}',
  'Prix réduits par les vendeurs': '{t.marketplace.dealsSubtitle}',
  "Offre exclusive à ne pas manquer ! Profitez d'une réduction exceptionnelle aujourd'hui.": '{t.marketplace.dealsDefaultDesc}'
});

patchFile('src/components/marketplace/MarketplaceLatestProducts.tsx', {
  'DÉCOUVERTE': '{t.marketplace.latestTag}',
  'Mode, tech, maison, beauté : explorez le catalogue complet de toutes les boutiques partenaires vérifiées.': '{t.marketplace.latestSubtitle}',
  'Découvrir tout le catalogue →': '{t.marketplace.latestCta}'
});

console.log("Locales and lists patched.");
