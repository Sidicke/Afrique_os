/**
 * Normalisation d'un numéro de téléphone pour une comparaison tolérante au
 * format : on conserve uniquement le '+' initial éventuel et les chiffres.
 *  - "+225 07 08 12 34 56"  → "+2250708123456"
 *  - "07 08 12 34 56"       → "0708123456"
 *  - "+225-07-08-12-34-56"  → "+2250708123456"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
}

/**
 * Clause `where` Prisma pour comparer un téléphone en acceptant à la fois le
 * format brut saisi (anciennes commandes stockées avec espaces) et le format
 * normalisé (nouvelles commandes) — sans casser les données existantes.
 */
export function phoneMatchClause(phone: string) {
  const raw = phone.trim();
  const normalized = normalizePhone(phone);
  const variants = [...new Set([raw, normalized].filter(Boolean))];
  return { customerPhone: { in: variants } };
}
