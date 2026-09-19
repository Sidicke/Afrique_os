const fs = require('fs');

const patchFile = (file, replacements) => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('useTranslation')) {
    content = content.replace('import { cn } from "@/lib/utils";', 'import { cn } from "@/lib/utils";\nimport { useTranslation } from "@/lib/i18n";');
    content = content.replace(/export function (\w+)\(\) \{/, 'export function $1() {\n  const { t } = useTranslation();');
    content = content.replace(/export default function (\w+)\(\) \{/, 'export default function $1() {\n  const { t } = useTranslation();');
  }

  for (const [fr, key] of Object.entries(replacements)) {
      const regex = new RegExp(fr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      content = content.replace(regex, key);
  }
  fs.writeFileSync(file, content);
  console.log(file + " patched.");
};

patchFile('src/components/marketplace/TrustBar.tsx', {
  'Boutiques vérifiées': '{t.marketplace.trustVerifiedTitle}',
  'Commerces certifiés et audités': '{t.marketplace.trustVerifiedDesc}',
  'Contact direct': '{t.marketplace.trustWhatsappTitle}',
  'Échangez sur WhatsApp en direct': '{t.marketplace.trustWhatsappDesc}',
  'Paiement mobile': '{t.marketplace.trustPaymentTitle}',
  'Wave, Orange, MTN, Moov...': '{t.marketplace.trustPaymentDesc}',
  'Support client': '{t.marketplace.trustSupportTitle}',
  'Assistance 7j/7 garantie': '{t.marketplace.trustSupportDesc}'
});

patchFile('src/components/marketplace/PromoBanner.tsx', {
  'Plan Business · 2% de commission': '{t.marketplace.promoPlan}',
  'Accélérez vos ventes avec le plan Business': '{t.marketplace.promoTitle}',
  '2% de commission seulement, jusqu&apos;à 150 articles et badge vérifié. Formule Starter (0 FCFA) disponible pour démarrer.': '{t.marketplace.promoDesc}',
  'Découvrir le plan Business →': '{t.marketplace.promoCta}'
});

