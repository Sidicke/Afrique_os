const fs = require('fs');
let sessionTs = fs.readFileSync('src/lib/api/session.ts', 'utf8');

if (!sessionTs.includes('boutiqueName')) {
  // Update ApiUser type if it is defined here? No, ApiUser is in types.ts.
  // Actually, we can just add it to the user object.
  sessionTs = sessionTs.replace(
    'export function switchActiveBoutique(boutiqueId: string, boutiqueSlug: string): void {',
    'export function switchActiveBoutique(boutiqueId: string, boutiqueSlug: string, boutiqueName?: string): void {'
  );
  sessionTs = sessionTs.replace(
    'current = { ...current, user: { ...current.user, boutiqueId, boutiqueSlug } };',
    'current = { ...current, user: { ...current.user, boutiqueId, boutiqueSlug, boutiqueName: boutiqueName || current.user.boutiqueName } as any };'
  );
  
  sessionTs = sessionTs.replace(
    'export function getBoutiqueSlug(): string | null {',
    'export function getBoutiqueName(): string | null {\n  return (current?.user as any)?.boutiqueName ?? null;\n}\n\nexport function getBoutiqueSlug(): string | null {'
  );
  fs.writeFileSync('src/lib/api/session.ts', sessionTs);
}
