export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Formate un montant en FCFA avec séparateur de milliers (« 1 250 000 FCFA ») */
export function formatFcfa(amount: number): string {
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/[\u202f\u00a0]/g, " ");
  return `${formatted} FCFA`;
}

/** Initiales d'un nom complet (« Awa Diallo » → « AD ») */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Redirection sûre après connexion : n'accepte que des chemins internes
 * commençant par « / » (jamais d'URL externe → pas d'open redirect).
 */
export function safeRedirectPath(
  next: string | undefined | null,
  fallback: string,
): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return fallback;
}

/**
 * URL de la vitrine publique d'une boutique. Avec un slug (ex. celui du
 * vendeur connecté) → `/boutique/[slug]` ; sans slug → la démo `/boutique`.
 */
export function publicShopHref(
  boutiqueSlug: string | null | undefined,
): string {
  return boutiqueSlug ? `/boutique/${boutiqueSlug}` : "/boutique";
}

/**
 * Temps relatif en français (« à l'instant », « il y a 5 min », « il y a 3 j »).
 * Renvoie "" si la date est invalide.
 */
export function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Destination d'accueil selon le rôle après connexion :
 * ADMIN → console plateforme /admin (utilisateur suprême),
 * CLIENT → espace client (avec chemin contextuel si fourni),
 * VENDEUR (défaut) → espace vendeur.
 */
export function roleHomePath(
  role: string | null | undefined,
  clientFallback = "/espace-client",
): string {
  if (role === "ADMIN") return "/admin";
  if (role === "CLIENT") return clientFallback;
  return "/espace-admin";
}
