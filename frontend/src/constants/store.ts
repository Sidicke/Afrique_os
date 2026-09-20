/**
 * Boutique « Aziz Tech » — Store Page Data
 * ------------------------------------------------------------
 * Toute l'identité d'une boutique est centralisée dans ce fichier.
 * Pour créer une nouvelle boutique, il suffit de modifier :
 *   - `store`                  → nom, tagline, description, ville
 *   - `products`               → le catalogue produits (prix FCFA, variantes, avis)
 *   - `featuredProduct`        → le produit mis en avant
 *   - `recommendationCategories` → les cartes d'exploration
 *
 * Les images se déposent dans `frontend/public/assets/boutique/`
 * (voir docs/Boutique/description.md et docs/travaux/descriptions_assets_landing_page.md).
 */

import { formatCurrency } from "@/lib/utils";

export const store = {
  name: "Aziz Tech",
  tagline: "Tout ce qu'il vous faut",
  description:
    "Aziz Tech, c'est l'essentiel de l'électronique et des accessoires, soigneusement sélectionnés pour votre quotidien. Nous écoutons vos besoins et vous proposons le meilleur de la tech.",
  /** Localisation affichée dans le panier */
  city: "Côte d'Ivoire",
  /** Mini-détails de confiance affichés sur la fiche produit */
  deliveryShortLabel: "Livraison 24-48h",
  deliveryNote: "Livraison 24-48h à Abidjan et partout en Côte d'Ivoire",
  warrantyNote: "Garantie 6 mois sur tous les appareils",
  paymentNote: "Paiement en ligne : Mobile Money ou carte bancaire",
  platformUrl: "/",
} as const;

/** Catégories du catalogue — « Tous » sert de filtre global dans la grille */
export const categories = [
  "Tous",
  "Téléphone",
  "Audio",
  "Accessoires",
  "Autre",
] as const;
export type Category = (typeof categories)[number];

/** Filtres de la barre latérale (label affiché + valeur de catégorie) */
export const categoryFilters: ReadonlyArray<{
  label: string;
  value: Exclude<Category, "Tous"> | "Tous";
}> = [
  { label: "Tous les produits", value: "Tous" },
  { label: "Téléphone", value: "Téléphone" },
  { label: "Audio", value: "Audio" },
  { label: "Accessoires", value: "Accessoires" },
  { label: "Autre", value: "Autre" },
];

/** Variante d'un produit (couleur, modèle, taille…) */
export interface ProductVariant {
  id: string;
  label: string;
}

/** Avis client — la note moyenne et le nombre d'avis sont calculés dynamiquement */
export interface Review {
  id: string;
  author: string;
  rating: number; // 1 à 5
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  /** Marque du produit (ex. Samsung) — filtre « Marques » de la vitrine */
  brand?: string;
  /** Prix en FCFA */
  price: number;
  description: string;
  image: string;
  available: boolean;
  /** Quantité en stock (0 = rupture) */
  stock: number;
  /** Référence interne affichée sur la fiche produit */
  sku: string;
  variants: ProductVariant[];
  reviews: Review[];
  /** Mis en avant */
  isFeatured?: boolean;
  /** Date de création pour le filtre nouveautés */
  createdAt?: string;
  /** Nombre de ventes pour le filtre meilleures ventes */
  salesCount?: number;
  /** Boutique d'origine (catalogue global / futur Marketplace) */
  boutique?: { name: string; slug: string };
}

/**
 * Catalogue produits — branché sur les photos réelles (800×800)
 * de `frontend/public/assets/boutique/`.
 */
export const products: Product[] = [
  {
    id: "smartphone-pro",
    name: "Smartphone Pro",
    category: "Téléphone",
    brand: "Samsung",
    price: 350000,
    description:
      "Un smartphone performant au design soigné : grand écran, double caméra et batterie qui tient toute la journée.",
    image: "/assets/boutique/smartphone-pro.jpg",
    available: true,
    stock: 12,
    sku: "AZT-SP-001",
    variants: [
      { id: "noir", label: "Noir" },
      { id: "argent", label: "Argent" },
      { id: "or", label: "Or" },
    ],
    reviews: [
      {
        id: "sp-1",
        author: "Aminata K.",
        rating: 5,
        comment: "Excellent rapport qualité-prix, livraison rapide.",
        date: "12 juin 2026",
      },
      {
        id: "sp-2",
        author: "Jean-Marc D.",
        rating: 4,
        comment: "Très bon téléphone, l'autonomie est vraiment appréciable.",
        date: "3 mai 2026",
      },
      {
        id: "sp-3",
        author: "Fatou S.",
        rating: 5,
        comment: "La photo est bluffante pour ce prix. Je recommande.",
        date: "21 avril 2026",
      },
      {
        id: "sp-4",
        author: "Yao B.",
        rating: 4,
        comment: "Bon produit, la livraison a pris un peu de temps.",
        date: "2 avril 2026",
      },
    ],
  },
  {
    id: "ecouteurs-sans-fil",
    name: "Écouteurs Sans Fil",
    category: "Audio",
    brand: "Apple",
    price: 45000,
    description:
      "Des écouteurs Bluetooth légers avec réduction de bruit, parfaits pour la musique et les appels.",
    image: "/assets/boutique/ecouteurs.jpg",
    available: true,
    stock: 8,
    sku: "AZT-EC-002",
    variants: [
      { id: "noir", label: "Noir" },
      { id: "blanc", label: "Blanc" },
      { id: "bleu", label: "Bleu" },
    ],
    reviews: [
      {
        id: "ec-1",
        author: "Mariam T.",
        rating: 5,
        comment: "Le son est superbe et ils tiennent bien en place.",
        date: "18 juin 2026",
      },
      {
        id: "ec-2",
        author: "Koffi A.",
        rating: 5,
        comment: "Parfaits pour le sport, légers et confortables.",
        date: "9 mai 2026",
      },
      {
        id: "ec-3",
        author: "Nadia R.",
        rating: 4,
        comment: "Très bons écouteurs, la réduction de bruit est efficace.",
        date: "15 avril 2026",
      },
    ],
  },
  {
    id: "powerbank-20000",
    name: "Powerbank 20 000 mAh",
    category: "Accessoires",
    brand: "Anker",
    price: 25000,
    description:
      "Une batterie externe puissante pour recharger vos appareils plusieurs fois, où que vous soyez.",
    image: "/assets/boutique/powerbank.jpg",
    available: true,
    stock: 20,
    sku: "AZT-PB-003",
    variants: [
      { id: "noir", label: "Noir" },
      { id: "blanc", label: "Blanc" },
    ],
    reviews: [
      {
        id: "pw-1",
        author: "Salif K.",
        rating: 4,
        comment: "Charge bien deux téléphones, pratique pour les voyages.",
        date: "22 juin 2026",
      },
      {
        id: "pw-2",
        author: "Aïcha B.",
        rating: 5,
        comment: "Indispensable, je ne sors plus sans elle.",
        date: "30 mai 2026",
      },
    ],
  },
  {
    id: "montre-connectee",
    name: "Montre Connectée",
    category: "Accessoires",
    price: 75000,
    description:
      "Suivez votre santé et vos notifications au poignet : fréquence cardiaque, sommeil, sport.",
    image: "/assets/boutique/montre-connectee.jpg",
    available: true,
    stock: 5,
    sku: "AZT-MC-004",
    variants: [
      { id: "noir", label: "Noir" },
      { id: "argent", label: "Argent" },
      { id: "dore", label: "Doré" },
    ],
    reviews: [
      {
        id: "mc-1",
        author: "Cédric N.",
        rating: 4,
        comment: "Bonne montre, précise sur le suivi du sommeil.",
        date: "11 juin 2026",
      },
      {
        id: "mc-2",
        author: "Rosalie G.",
        rating: 4,
        comment: "Très élégante, l'écran est lumineux et réactif.",
        date: "27 mai 2026",
      },
    ],
  },
  {
    id: "gadget-importe",
    name: "Gadget Importé",
    category: "Autre",
    price: 20000,
    description:
      "Le petit gadget malin qui simplifie le quotidien : compact, pratique et étonnamment utile.",
    image: "/assets/boutique/gadget-importe.jpg",
    available: true,
    stock: 0,
    sku: "AZT-GD-005",
    variants: [
      { id: "standard", label: "Standard" },
      { id: "pro", label: "Pro" },
    ],
    reviews: [
      {
        id: "gd-1",
        author: "Ibrahim O.",
        rating: 3,
        comment: "Sympa, mais je m'attendais à mieux fini.",
        date: "5 juin 2026",
      },
      {
        id: "gd-2",
        author: "Léa M.",
        rating: 4,
        comment: "Très pratique au quotidien, bon rapport qualité-prix.",
        date: "19 mai 2026",
      },
    ],
  },
];

/** Produit mis en avant dans la section « Nouveauté » (image dédiée) */
export const featuredProduct: Product & {
  subtitle: string;
  features: Array<{ icon: "sound" | "battery" | "design"; title: string; description: string }>;
} = {
  id: "galaxy-s23-ultra",
  name: "Galaxy S23 Ultra",
  category: "Téléphone",
  price: 650000,
  subtitle: "Nouveauté",
  description:
    "Le Galaxy S23 Ultra repousse les limites du smartphone : un écran exceptionnel, des performances de pointe et un appareil photo qui capture chaque instant avec une précision remarquable.",
  image: "/assets/boutique/galaxy-s23-ultra.jpg",
  available: true,
  stock: 6,
  sku: "AZT-GS-ULTRA",
  variants: [
    { id: "noir", label: "Noir" },
    { id: "creme", label: "Crème" },
    { id: "vert", label: "Vert" },
  ],
  reviews: [
    {
      id: "gs-1",
      author: "Patrick L.",
      rating: 5,
      comment: "Le meilleur smartphone que j'ai jamais eu. Caméra incroyable.",
      date: "20 juin 2026",
    },
    {
      id: "gs-2",
      author: "Estelle V.",
      rating: 5,
      comment: "Écran magnifique, batterie endurante, je suis conquis.",
      date: "8 juin 2026",
    },
    {
      id: "gs-3",
      author: "Moussa D.",
      rating: 4,
      comment: "Très bon téléphone, juste un peu lourd en poche.",
      date: "1 juin 2026",
    },
  ],
  features: [
    {
      icon: "sound",
      title: "Son Immersif",
      description: "Des haut-parleurs stéréo puissants pour un son riche et clair.",
    },
    {
      icon: "battery",
      title: "Batterie Endurante",
      description: "Une journée complète d'autonomie pour ne jamais ralentir.",
    },
    {
      icon: "design",
      title: "Design Premium",
      description: "Des lignes élégantes et des finitions haut de gamme.",
    },
  ],
};

/** Cartes d'exploration par univers — photos du fonds commun (dossier produits) */
export const recommendationCategories = [
  {
    id: "phone-rec",
    name: "Téléphone",
    image: "/assets/produits/smartphone.jpg",
  },
  {
    id: "audio-rec",
    name: "Audio",
    image: "/assets/produits/tech.jpg",
  },
  {
    id: "accessoires-rec",
    name: "Accessoires",
    image: "/assets/produits/import.jpg",
  },
];

/**
 * Formate un prix en FCFA avec séparateur de milliers (« 350 000 FCFA »).
 * Implémentation partagée avec le dashboard (lib/utils.formatCurrency).
 */
export function formatPrice(price: number): string {
  return formatCurrency(price);
}

/** Libellé de disponibilité à partir du stock (0 = rupture) */
export function stockLabel(stock: number): string {
  if (stock <= 0) return "Rupture de stock";
  if (stock <= 5) return `Plus que ${stock} en stock`;
  return "En stock";
}

/** Variante par défaut d'un produit (première, avec repli sécurisé) */
export function defaultVariant(
  product: Pick<Product, "variants">
): ProductVariant {
  return product.variants[0] ?? { id: "defaut", label: "Défaut" };
}

/** Note moyenne calculée depuis une liste d'avis (dynamique) */
export function productRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const avg =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return Math.round(avg * 10) / 10;
}

/** Nombre d'avis dans une liste (dynamique) */
export function productReviewCount(reviews: Review[]): number {
  return reviews.length;
}

/** Ligne de panier — une clé unique par (produit, variante) */
export interface CartLine {
  key: string;
  product: Product;
  variant: ProductVariant;
  qty: number;
  negotiatedPrice?: number;
  conversationId?: string;
}
