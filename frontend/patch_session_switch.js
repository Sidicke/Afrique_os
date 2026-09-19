const fs = require('fs');

let sessionTs = fs.readFileSync('src/lib/api/session.ts', 'utf8');

const switchFn = `
/**
 * Change la boutique active du vendeur dans la session locale.
 * Permet la navigation multi-boutiques sans reconnexion.
 */
export function switchActiveBoutique(boutiqueId: string, boutiqueSlug: string): void {
  if (!current) return;
  current = { ...current, user: { ...current.user, boutiqueId, boutiqueSlug } };
  persist();
}
`;

sessionTs = sessionTs + '\n' + switchFn;
fs.writeFileSync('src/lib/api/session.ts', sessionTs);

