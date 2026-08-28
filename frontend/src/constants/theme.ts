/**
 * Design System — Tokens de marque
 * Source : designe_systeme.md + brand_fondation.md + concept_final_v3.md
 * Thème : « Sombre & Lumineux » — Fraunces / Instrument Sans / JetBrains Mono
 */

export const colors = {
  midnight: {
    DEFAULT: "#070F1A",
    950: "#070F1A",
    900: "#0B1626",
    800: "#122033",
    700: "#1B2C42",
  },
  gold: {
    300: "#D8CDB8",
    400: "#C4B697",
    500: "#A8936F",
    600: "#8F7C59",
  },
  ivory: {
    50: "#F5F0EB",
    100: "#EFE7DD",
    200: "#E6DACB",
  },
  green: "#2D6A4F",
  terracotta: "#C87A5A",
  darkText: "#111111",
  lightText: "#FFFFFF",
} as const;

export const fonts = {
  sans: "var(--font-instrument)",
  display: "var(--font-fraunces)",
  mono: "var(--font-jetbrains)",
} as const;

export const radius = {
  small: "8px",
  card: "16px",
  section: "24px",
} as const;

export const animation = {
  duration: { fast: 0.3, base: 0.5, slow: 0.8 },
  easing: [0.22, 1, 0.36, 1] as const,
} as const;

/**
 * Séquence narrative du Hero — 60 frames consécutives extraites du film master.
 * Chaque frame ≈ 55-85 Ko WebP.
 * L'index correspond à l'ordre de la transformation : commerce réel → digital connecté.
 * Scènes :  1-13  commerce physique
 *          14-30  smartphone + boutique en ligne + WhatsApp
 *          31-48  convergence / connexion
 *          49-60  commerçant connecté + commande
 */
const TOTAL_FRAMES = 60;

export const heroFrames = Array.from({ length: TOTAL_FRAMES }, (_, i) => ({
  src: `/frames/frame_${String(i + 1).padStart(3, "0")}.webp`,
  number: i + 1,
}));

/**
 * Assets photographiques — dossier `frontend/public/assets/`.
 * Ces chemins sont utilisés par AssetImage : tant que la photo n'est pas déposée,
 * un placeholder élégant est affiché à la place (voir liste_assets_landing_page.md).
 */
export const assetPaths = {
  products: {
    wax: "/assets/produits/wax.jpg",
    smartphone: "/assets/produits/smartphone.jpg",
    karite: "/assets/produits/karite.jpg",
    mode: "/assets/produits/mode.jpg",
    tech: "/assets/produits/tech.jpg",
    beaute: "/assets/produits/beaute.jpg",
    tissus: "/assets/produits/tissus.jpg",
    local: "/assets/produits/local.jpg",
    import: "/assets/produits/import.jpg",
    bijoux: "/assets/produits/bijoux.jpg",
    solution: "/assets/produits/solution.jpg",
  },
  scenes: {
    matiere: "/assets/scenes/matiere.jpg",
    digital: "/assets/scenes/digital.jpg",
    ambianceTissus: "/assets/scenes/ambiance-tissus.jpg",
    ambianceTech: "/assets/scenes/ambiance-tech.jpg",
    ambianceBeaute: "/assets/scenes/ambiance-beaute.jpg",
    finale: "/assets/scenes/finale.jpg",
  },
  portraits: {
    boutique: "/assets/portraits/boutique.jpg",
    vitrine: "/assets/portraits/vitrine.jpg",
  },
  // Cartes catégories du Showcase (section Produits) — photos réelles, paysage 16:9.
  showcases: {
    mode: "/assets/showcases/mode.jpg",
    electronique: "/assets/showcases/electronique.jpg",
    beaute: "/assets/showcases/beaute.jpg",
    commerce: "/assets/showcases/commerce.jpg",
  },
} as const;

/** Signatures de marque — direction finale validée */
export const brandSignature = {
  badge: "Une nouvelle lumière pour le commerce africain.",
  headline: "Votre commerce, en pleine lumière.",
  subline: "Du commerce d'aujourd'hui à la boutique de demain.",
  cta: "Créer ma boutique",
  manifesto: "Du commerce dispersé au commerce connecté.",
} as const;
