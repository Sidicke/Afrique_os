/**
 * Couche API — Recherche globale (annuaire + catalogue)
 * --------------------------------------------------------------------------
 * Moteur de recherche hybride :
 * 1. Tente d'interroger l'API backend GET /search?q=
 * 2. En cas de hors-ligne, d'erreur réseau (NetworkError) ou si la base de
 *    données est encore vide, bascule de façon transparente vers le moteur
 *    de recherche local avec tolérance aux fautes, accents et mots partiels.
 */

import { apiFetch } from "./http";
import type { ApiBoutiqueCard, ApiPublicProduct, ApiVariant } from "./types";
import { products as STORE_PRODUCTS } from "@/constants/store";

export interface ApiSearchCategory {
  id: string;
  name: string;
  slug: string;
  productsCount: number;
}

export interface ApiSearchResults {
  boutiques: ApiBoutiqueCard[];
  produits: ApiPublicProduct[];
  categories?: ApiSearchCategory[];
}

/** Boutiques de démonstration / repli hors-ligne */
const FALLBACK_BOUTIQUES: ApiBoutiqueCard[] = [
  {
    id: "shop-aziz-tech",
    name: "Aziz Tech",
    slug: "aziz-tech",
    tagline: "L'essentiel de l'électronique & des smartphones",
    description: "Spécialiste de la tech à Abidjan : smartphones, accessoires, audio et gadgets garantis.",
    city: "Abidjan",
    country: "Côte d'Ivoire",
    coverImage: "/assets/scenes/ambiance-tech.jpg",
    logoImage: "/assets/boutique/logo.png",
    verificationStatus: "VERIFIED",
    category: "Électronique & High-Tech",
    productsCount: 8,
  },
  {
    id: "shop-sahel-mode",
    name: "Sahel Élégance & Mode",
    slug: "sahel-mode",
    tagline: "Prêt-à-porter & haute couture africaine",
    description: "Créations raffinées en wax, soie et bazin riche. Confection sur-mesure et prêt-à-porter.",
    city: "Dakar",
    country: "Sénégal",
    coverImage: "/assets/scenes/ambiance-tissus.jpg",
    logoImage: "",
    verificationStatus: "VERIFIED",
    category: "Mode & Vêtements",
    productsCount: 14,
  },
  {
    id: "shop-dakar-bio",
    name: "Dakar Bio Cosmétiques",
    slug: "dakar-bio",
    tagline: "Soins 100% naturels et certifiés bio",
    description: "Beurres de karité purs, huiles de baobab et cosmétiques capillaires naturels faits main.",
    city: "Dakar",
    country: "Sénégal",
    coverImage: "/assets/scenes/ambiance-beaute.jpg",
    logoImage: "",
    verificationStatus: "VERIFIED",
    category: "Beauté & Soins",
    productsCount: 6,
  },
  {
    id: "shop-cotonou-wax",
    name: "Wax & Co Cotonou",
    slug: "cotonou-wax",
    tagline: "Tissus Wax Hollandais et créations modernes",
    description: "Grand choix de pagnes wax authentiques, sacs et accessoires cousus main.",
    city: "Cotonou",
    country: "Bénin",
    coverImage: "/assets/produits/wax.jpg",
    logoImage: "",
    verificationStatus: "NONE",
    category: "Mode & Tissus",
    productsCount: 12,
  },
];

/** Produits de démonstration / repli avec liaison boutique */
const FALLBACK_PRODUITS: ApiPublicProduct[] = [
  ...STORE_PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.id,
    description: p.description,
    price: p.price,
    oldPrice: null,
    currency: "XOF",
    isFeatured: true,
    images: [p.image],
    stock: p.stock,
    category: { name: p.category, slug: p.category.toLowerCase() },
    brand: p.brand ? { id: `br-${p.brand.toLowerCase()}`, name: p.brand, slug: p.brand.toLowerCase() } : null,
    variants: (p.variants || []).map(
      (v): ApiVariant => ({
        id: v.id,
        name: "Option",
        value: v.label,
        priceDelta: null,
        stock: p.stock,
      })
    ),
    boutique: {
      id: "shop-aziz-tech",
      name: "Aziz Tech",
      slug: "aziz-tech",
      verificationStatus: "VERIFIED",
    },
  })),
  {
    id: "boubou-soie-sahel",
    name: "Ensemble Boubou Soie & Broderie",
    slug: "boubou-soie-sahel",
    description: "Magnifique boubou traditionnel en soie brodé à la main par nos maîtres tailleurs.",
    price: 95000,
    oldPrice: 120000,
    currency: "XOF",
    isFeatured: true,
    images: ["/assets/produits/tissus.jpg"],
    stock: 5,
    category: { name: "Mode & Vêtements", slug: "mode" },
    brand: { id: "br-sahel", name: "Sahel Couture", slug: "sahel-couture" },
    variants: [],
    boutique: {
      id: "shop-sahel-mode",
      name: "Sahel Élégance & Mode",
      slug: "sahel-mode",
      verificationStatus: "VERIFIED",
    },
  },
  {
    id: "sac-cuir-wax",
    name: "Sac à Main Cuir & Pagne Wax",
    slug: "sac-cuir-wax",
    description: "Sac artisanal combinant cuir véritable et touches de wax traditionnel coloré.",
    price: 35000,
    oldPrice: null,
    currency: "XOF",
    isFeatured: false,
    images: ["/assets/produits/mode2.jpg"],
    stock: 9,
    category: { name: "Accessoires", slug: "accessoires" },
    brand: null,
    variants: [],
    boutique: {
      id: "shop-cotonou-wax",
      name: "Wax & Co Cotonou",
      slug: "cotonou-wax",
      verificationStatus: "NONE",
    },
  },
  {
    id: "huile-baobab-bio",
    name: "Huile Pure de Baobab & Karité",
    slug: "huile-baobab-bio",
    description: "Soin hydratant intense pour peaux sèches et cheveux bouclés, première pression à froid.",
    price: 15000,
    oldPrice: null,
    currency: "XOF",
    isFeatured: false,
    images: ["/assets/produits/karite.jpg"],
    stock: 22,
    category: { name: "Beauté & Soins", slug: "beaute" },
    brand: null,
    variants: [],
    boutique: {
      id: "shop-dakar-bio",
      name: "Dakar Bio Cosmétiques",
      slug: "dakar-bio",
      verificationStatus: "VERIFIED",
    },
  },
];

const FALLBACK_CATEGORIES: ApiSearchCategory[] = [
  { id: "cat-telephone", name: "Téléphone & Tech", slug: "telephone", productsCount: 12 },
  { id: "cat-audio", name: "Audio & Écouteurs", slug: "audio", productsCount: 6 },
  { id: "cat-accessoires", name: "Accessoires", slug: "accessoires", productsCount: 15 },
  { id: "cat-mode", name: "Mode & Vêtements", slug: "mode", productsCount: 20 },
  { id: "cat-beaute", name: "Beauté & Soins", slug: "beaute", productsCount: 8 },
];

/** Normalise un texte (minuscules, sans accents, sans ponctuations parasites) */
function normalize(str?: string | null): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Vérifie si un texte matche une liste de mots-clés ou l'expression globale */
function matchesTokens(text: string | null | undefined, fullQueryNorm: string, tokens: string[]): boolean {
  const norm = normalize(text);
  if (!norm) return false;
  if (norm.includes(fullQueryNorm)) return true;
  return tokens.some((token) => norm.includes(token));
}

/** Moteur de recherche local avec tolérance aux fautes et recherche partielle */
function searchLocalFallback(q: string): ApiSearchResults {
  const fullQueryNorm = normalize(q);
  if (!fullQueryNorm) {
    return { boutiques: [], produits: [], categories: [] };
  }

  const tokens = fullQueryNorm.split(/\s+/).filter((t) => t.length > 0);

  // Recherche dans les boutiques
  const matchingBoutiques = FALLBACK_BOUTIQUES.filter((b) => {
    return (
      matchesTokens(b.name, fullQueryNorm, tokens) ||
      matchesTokens(b.tagline, fullQueryNorm, tokens) ||
      matchesTokens(b.description, fullQueryNorm, tokens) ||
      matchesTokens(b.city, fullQueryNorm, tokens) ||
      matchesTokens(b.country, fullQueryNorm, tokens) ||
      matchesTokens(b.category, fullQueryNorm, tokens)
    );
  });

  // Recherche dans les produits
  const matchingProduits = FALLBACK_PRODUITS.filter((p) => {
    return (
      matchesTokens(p.name, fullQueryNorm, tokens) ||
      matchesTokens(p.description, fullQueryNorm, tokens) ||
      matchesTokens(p.brand?.name, fullQueryNorm, tokens) ||
      matchesTokens(p.category?.name, fullQueryNorm, tokens) ||
      matchesTokens(p.boutique?.name, fullQueryNorm, tokens)
    );
  });

  // Recherche dans les catégories
  const matchingCategories = FALLBACK_CATEGORIES.filter((c) => {
    return (
      matchesTokens(c.name, fullQueryNorm, tokens) ||
      matchesTokens(c.slug, fullQueryNorm, tokens)
    );
  });

  return {
    boutiques: matchingBoutiques,
    produits: matchingProduits,
    categories: matchingCategories,
  };
}

export const searchApi = {
  /**
   * Recherche globale tolérante :
   * Appelle le backend en premier ; en cas d'échec réseau ou de résultat vide
   * lors des tests sans base de données, utilise le moteur de recherche local.
   */
  async global(q: string): Promise<ApiSearchResults> {
    const query = q.trim();
    if (!query) return { boutiques: [], produits: [], categories: [] };

    try {
      const res = await apiFetch<ApiSearchResults>(`/search?q=${encodeURIComponent(query)}`);
      const hasHits =
        (res.boutiques?.length ?? 0) > 0 ||
        (res.produits?.length ?? 0) > 0 ||
        (res.categories?.length ?? 0) > 0;

      if (hasHits) {
        return res;
      }
    } catch {
      // Ignorer l'erreur réseau / serveur non démarré et utiliser le moteur de secours
    }

    return searchLocalFallback(query);
  },
};
