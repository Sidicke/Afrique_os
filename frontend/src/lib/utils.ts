export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type SupportedCurrency = "XOF" | "XAF" | "NGN" | "GHS" | "KES" | "ZAR";

export const EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  XOF: 1,
  XAF: 1,
  NGN: 0.40,
  GHS: 41,
  KES: 4.65,
  ZAR: 33.2,
};

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  XOF: "FCFA",
  XAF: "FCFA",
  NGN: "₦",
  GHS: "GH₵",
  KES: "KSh",
  ZAR: "R",
};

/** Formate un montant dynamiquement selon la devise sélectionnée avec taux de conversion */
export function formatCurrency(amount: number, forceCurrency?: string): string {
  let currency = (forceCurrency as SupportedCurrency);
  if (!currency && typeof window !== "undefined") {
    currency = (localStorage.getItem("zennshop_curr") as SupportedCurrency) || "XOF";
  }
  currency = currency || "XOF";

  const rate = EXCHANGE_RATES[currency] || 1;
  const converted = amount / rate;

  const hasDecimals = ["ZAR"].includes(currency);
  const maxFraction = hasDecimals ? 2 : 0;
  const minFraction = hasDecimals && converted % 1 !== 0 ? 2 : 0;

  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: minFraction,
    maximumFractionDigits: maxFraction,
  })
    .format(converted)
    .replace(/[\u202f\u00a0]/g, " ");

  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  if (["NGN", "GHS", "KES", "ZAR"].includes(currency)) {
    return `${symbol} ${formatted}`;
  }
  return `${formatted} ${symbol}`;
}

/** Legacy alias (compatibilité descendante) - utilise la conversion multi-devise automatique */
export function formatFcfa(amount: number | string): string {
  return formatCurrency(Number(amount) || 0);
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
 * Temps relatif sensible à la langue (« à l'instant » / « just now »).
 * Renvoie "" si la date est invalide.
 * @param iso - Date ISO 8601
 * @param lang - "fr" (défaut) ou "en"
 */
export function timeAgo(iso: string, lang: "fr" | "en" = "fr"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);

  if (lang === "en") {
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD} d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

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
  return "/espace-vendeur";
}

/**
 * Formatte une date selon la langue active.
 * @param iso - Date ISO 8601 ou objet Date
 * @param lang - "fr" (défaut) ou "en"
 * @param options - Options Intl.DateTimeFormat optionnelles
 */
export function formatDate(
  iso: string | Date,
  lang: "fr" | "en" = "fr",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const locale = lang === "en" ? "en-GB" : "fr-FR";
  const defaultOptions: Intl.DateTimeFormatOptions = options ?? { day: "numeric", month: "short", year: "numeric" };
  return d.toLocaleDateString(locale, defaultOptions);
}
