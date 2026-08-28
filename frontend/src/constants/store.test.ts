import { describe, expect, it } from "vitest";
import {
  categories,
  categoryFilters,
  featuredProduct,
  formatPrice,
  productRating,
  productReviewCount,
  products,
  recommendationCategories,
  stockLabel,
  store,
} from "./store";

describe("formatPrice", () => {
  it("formate un prix en FCFA avec séparateur de milliers", () => {
    expect(formatPrice(350000)).toBe("350 000 FCFA");
  });

  it("formate les petits prix sans séparateur", () => {
    expect(formatPrice(45000)).toBe("45 000 FCFA");
    expect(formatPrice(20000)).toBe("20 000 FCFA");
  });

  it("gère les prix unitaires", () => {
    expect(formatPrice(500)).toBe("500 FCFA");
  });
});

describe("Note et nombre d'avis (dynamiques)", () => {
  it("calcule la note moyenne arrondie à 1 décimale", () => {
    const smartphone = products[0];
    expect(productRating(smartphone.reviews)).toBeCloseTo(
      smartphone.reviews.reduce((s, r) => s + r.rating, 0) / smartphone.reviews.length,
      1
    );
  });

  it("compte les avis de chaque produit", () => {
    for (const product of products) {
      expect(productReviewCount(product.reviews)).toBe(product.reviews.length);
    }
  });

  it("retourne 0 pour une liste d'avis vide", () => {
    expect(productRating([])).toBe(0);
    expect(productReviewCount([])).toBe(0);
  });
});

describe("Identité de la boutique (configurable)", () => {
  it("expose une marque cohérente avec nom, tagline et localisation", () => {
    expect(store.name).toBe("Aziz Tech");
    expect(store.tagline.length).toBeGreaterThan(0);
    expect(store.description.length).toBeGreaterThan(0);
    expect(store.city.length).toBeGreaterThan(0);
  });
});

describe("Catalogue produits", () => {
  it("définit des identifiants produits uniques", () => {
    const ids = products.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mappe chaque produit vers une vraie image du dossier assets/boutique", () => {
    for (const product of products) {
      expect(product.image).toMatch(/^\/assets\/boutique\/[\w-]+\.jpg$/);
    }
  });

  it("garantit des prix FCFA positifs", () => {
    for (const product of products) {
      expect(product.price).toBeGreaterThan(0);
    }
  });

  it("n'utilise que des catégories valides (hors « Tous »)", () => {
    const validCategories = categories.filter((c) => c !== "Tous");
    for (const product of products) {
      expect(validCategories).toContain(product.category);
    }
  });

  it("fournit au moins une variante par produit avec des ids uniques", () => {
    for (const product of products) {
      expect(product.variants.length).toBeGreaterThan(0);
      const variantIds = product.variants.map((v) => v.id);
      expect(new Set(variantIds).size).toBe(variantIds.length);
    }
  });

  it("définit un stock et une référence pour chaque produit", () => {
    for (const product of products) {
      expect(product.stock).toBeGreaterThanOrEqual(0);
      expect(product.sku.length).toBeGreaterThan(0);
    }
  });

  it("fournit des avis valides (note entre 1 et 5, commentaire non vide)", () => {
    for (const product of products) {
      for (const review of product.reviews) {
        expect(review.rating).toBeGreaterThanOrEqual(1);
        expect(review.rating).toBeLessThanOrEqual(5);
        expect(review.comment.length).toBeGreaterThan(0);
        expect(review.author.length).toBeGreaterThan(0);
      }
    }
  });

  it("décrit l'état du stock pour la carte et la fiche", () => {
    expect(stockLabel(0)).toBe("Rupture de stock");
    expect(stockLabel(3)).toBe("Plus que 3 en stock");
    expect(stockLabel(12)).toBe("En stock");
  });

  it("couvre chaque catégorie du filtre par un label affichable", () => {
    const values = categoryFilters.map((f) => f.value);
    expect(values).toEqual([...categories]);
    for (const filter of categoryFilters) {
      expect(filter.label.length).toBeGreaterThan(0);
    }
  });
});

describe("Produit mis en avant", () => {
  it("définit un produit phare complet (variantes, avis, atouts)", () => {
    expect(featuredProduct.name.length).toBeGreaterThan(0);
    expect(featuredProduct.subtitle).toBe("Nouveauté");
    expect(featuredProduct.features.length).toBeGreaterThan(0);
    expect(featuredProduct.variants.length).toBeGreaterThan(0);
    expect(featuredProduct.reviews.length).toBeGreaterThan(0);
    expect(featuredProduct.image).toMatch(/^\/assets\/boutique\//);
    expect(featuredProduct.price).toBeGreaterThan(0);
  });
});

describe("Cartes d'exploration", () => {
  it("référencent des images réelles du fonds commun", () => {
    for (const category of recommendationCategories) {
      expect(category.image).toMatch(/^\/assets\/produits\//);
      expect(category.name.length).toBeGreaterThan(0);
    }
  });
});
