import { Injectable } from '@nestjs/common';
import { BoutiqueStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';

/**
 * Un résultat « produit » de la recherche globale — MÊME format que le
 * catalogue public (`ProductsService.publicProductSelect` / `mapPublicProduct`).
 * Les cartes produits de la recherche (ProductCard côté frontend) consomment
 * exactement le même contrat que l'accueil : images, marque, avis, note,
 * ventes et boutique avec son statut de vérification.
 */
export type SearchProductHit = ReturnType<typeof ProductsService.mapPublicProduct>;

/** Un résultat « boutique » de la recherche globale (annuaire) */
export interface SearchBoutiqueHit {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
  coverImage: string | null;
  logoImage: string | null;
  /** Vérification du compte vendeur — badge de confiance sur la carte */
  verificationStatus: string | null;
  category: string | null;
  productsCount: number;
}

/**
 * Moteur de recherche globale (accueil client).
 * --------------------------------------------------------------------------
 * Recherche par sous-chaîne, insensible à la casse (PostgreSQL `contains` +
 * `mode: insensitive`) sur :
 *  - boutiques : nom, description, ville, pays, tagline
 *  - produits  : nom, description (+ le nom de la boutique et la catégorie)
 *
 * Architecture volontairement simple et isolée (module dédié) pour évoluer
 * vers le moteur du Marketplace : filtres, autocomplétion, tolérance aux
 * fautes, tri par pertinence — sans toucher au reste de l'API.
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche globale : boutiques + produits (boutiques ACTIVE uniquement).
   * `q` tronqué à 100 caractères ; résultats plafonnés pour rester rapide.
   */
  async search(q: string) {
    const query = q.trim().slice(0, 100);
    if (!query) return { boutiques: [], produits: [] };

    const [boutiques, produits] = await Promise.all([
      this.searchBoutiques(query),
      this.searchProduits(query),
    ]);

    return { boutiques, produits };
  }

  /** Boutiques ACTIVE dont nom / description / ville / pays / tagline matchent */
  private async searchBoutiques(query: string): Promise<SearchBoutiqueHit[]> {
    const boutiques = await this.prisma.boutique.findMany({
      where: {
        status: BoutiqueStatus.ACTIVE,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tagline: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { country: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        description: true,
        city: true,
        country: true,
        coverImage: true,
        logoImage: true,
        verificationStatus: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
      take: 8,
    });

    // Catégorie dominante (même calcul que l'annuaire — mutualisable plus tard)
    const ids = boutiques.map((b) => b.id);
    const groups = ids.length
      ? await this.prisma.product.groupBy({
          by: ['boutiqueId', 'categoryId'],
          where: { boutiqueId: { in: ids }, isActive: true, categoryId: { not: null } },
          _count: { _all: true },
        })
      : [];
    const categoryIds = [...new Set(
      groups.map((g) => g.categoryId).filter((id): id is string => Boolean(id)),
    )];
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));
    const dominant = new Map<string, string>();
    const bestCount = new Map<string, number>();
    for (const g of groups) {
      if (!g.categoryId) continue;
      const current = bestCount.get(g.boutiqueId) ?? 0;
      if (g._count._all > current) {
        bestCount.set(g.boutiqueId, g._count._all);
        dominant.set(g.boutiqueId, categoryName.get(g.categoryId) ?? '');
      }
    }

    return boutiques.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      tagline: b.tagline,
      description: b.description,
      city: b.city,
      country: b.country,
      coverImage: b.coverImage,
      logoImage: b.logoImage,
      verificationStatus: b.verificationStatus,
      category: dominant.get(b.id) ?? null,
      productsCount: b._count.products,
    }));
  }

  /** Produits actifs (boutique ACTIVE) dont nom / description matchent */
  private async searchProduits(query: string): Promise<SearchProductHit[]> {
    const produits = await this.prisma.product.findMany({
      where: {
        isActive: true,
        boutique: { status: BoutiqueStatus.ACTIVE },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          // La marque compte : « samsung » doit retrouver le Smartphone Pro
          { brand: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      // Projection partagée avec le catalogue public : zéro dérive possible
      select: ProductsService.publicProductSelect,
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return produits.map(ProductsService.mapPublicProduct);
  }
}
