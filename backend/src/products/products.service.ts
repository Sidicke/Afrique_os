import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/** Projection produit pour le dashboard vendeur */
const adminProductSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  oldPrice: true,
  currency: true,
  stock: true,
  sku: true,
  isFeatured: true,
  isActive: true,
  images: true,
  categoryId: true,
  category: { select: { id: true, name: true, slug: true } },
  brandId: true,
  brand: { select: { id: true, name: true, slug: true } },
  variants: { select: { id: true, name: true, value: true, priceDelta: true, stock: true } },
  createdAt: true,
  updatedAt: true,
  _count: { select: { orderItems: true } },
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Admin (scopé boutique) =====

  async create(boutiqueId: string, dto: CreateProductDto) {
    const { variants, ...data } = dto;
    const slug = await this.uniqueSlug(boutiqueId, this.slugify(dto.name));

    return this.prisma.product.create({
      data: {
        ...data,
        boutiqueId,
        slug,
        price: new Prisma.Decimal(dto.price),
        oldPrice: dto.oldPrice !== undefined ? new Prisma.Decimal(dto.oldPrice) : undefined,
        variants: variants?.length
          ? {
              create: variants.map((v) => ({
                name: v.name,
                value: v.value,
                priceDelta: v.priceDelta !== undefined ? new Prisma.Decimal(v.priceDelta) : undefined,
                stock: v.stock ?? 0,
              })),
            }
          : undefined,
      },
      select: adminProductSelect,
    });
  }

  async findAllForAdmin(boutiqueId: string) {
    return this.prisma.product.findMany({
      where: { boutiqueId },
      select: adminProductSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForAdmin(boutiqueId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, boutiqueId },
      select: adminProductSelect,
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async update(boutiqueId: string, id: string, dto: UpdateProductDto) {
    await this.findOneForAdmin(boutiqueId, id);
    const { variants, ...data } = dto;

    const updateData: Prisma.ProductUpdateInput = {
      ...data,
      price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
      oldPrice:
        data.oldPrice !== undefined ? new Prisma.Decimal(data.oldPrice) : undefined,
    };
    if (data.name) updateData.slug = await this.uniqueSlug(boutiqueId, this.slugify(data.name));

    if (variants) {
      // Réécriture des variantes (simple : deleteMany + create)
      await this.prisma.variant.deleteMany({ where: { productId: id } });
      if (variants.length > 0) {
        await this.prisma.variant.createMany({
          data: variants.map((v) => ({
            productId: id,
            name: v.name,
            value: v.value,
            priceDelta: v.priceDelta !== undefined ? new Prisma.Decimal(v.priceDelta) : undefined,
            stock: v.stock ?? 0,
          })),
        });
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
      select: adminProductSelect,
    });
  }

  async remove(boutiqueId: string, id: string) {
    await this.findOneForAdmin(boutiqueId, id);
    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }

  // ===== Public (vitrine) =====

  /**
   * Projection produit publique UNIQUE — utilisée par le catalogue d'une
   * boutique, le catalogue global ET la recherche (search.service) : toute
   * évolution du format (champ, marque, vérification…) se fait ici, une
   * seule fois, sans risque de dérive entre les endpoints.
   */
  static readonly publicProductSelect = {
    id: true,
    name: true,
    slug: true,
    description: true,
    price: true,
    oldPrice: true,
    currency: true,
    stock: true,
    isFeatured: true,
    images: true,
    category: { select: { name: true, slug: true } },
    brand: { select: { id: true, name: true, slug: true } },
    variants: {
      select: { id: true, name: true, value: true, priceDelta: true, stock: true },
    },
    reviews: { select: { rating: true } },
    _count: { select: { orderItems: true } },
    // Boutique d'origine + statut de vérification (badge de confiance)
    boutique: {
      select: { id: true, name: true, slug: true, verificationStatus: true },
    },
  } as const;

  /**
   * Enrichit un produit public (rating + ventes) et convertit les Decimals
   * des variantes en chaînes — contrat identique pour catalogue et recherche.
   */
  static mapPublicProduct(this: void, p: {
    reviews: Array<{ rating: number }>;
    _count: { orderItems: number };
    variants: Array<{
      id: string;
      name: string;
      value: string;
      priceDelta: Prisma.Decimal | null;
      stock: number;
    }>;
  }) {
    return {
      ...p,
      variants: p.variants.map((v) => ({
        ...v,
        priceDelta: v.priceDelta !== null ? String(v.priceDelta) : null,
      })),
      rating:
        p.reviews.length > 0
          ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
          : null,
      salesCount: p._count.orderItems,
    };
  }

  /** Résout la boutique par slug public puis délègue au catalogue */
  async findPublicBySlug(slug: string, query: QueryProductsDto) {
    const boutique = await this.prisma.boutique.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable');
    return this.findPublic(boutique.id, query);
  }

  /**
   * Catalogue public : produits actifs d'une boutique, filtres catégorie /
   * recherche / prix, tri (nouveauté, prix asc/desc, popularité), pagination.
   */
  async findPublic(boutiqueId: string, query: QueryProductsDto) {
    const where: Prisma.ProductWhereInput = {
      boutiqueId,
      isActive: true,
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.brand ? { brand: { slug: query.brand } } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
      ...(query.minPrice !== undefined
        ? { price: { gte: new Prisma.Decimal(query.minPrice) } }
        : {}),
      ...(query.maxPrice !== undefined
        ? { price: { lte: new Prisma.Decimal(query.maxPrice) } }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === 'price_asc'
        ? [{ price: 'asc' }]
        : query.sort === 'price_desc'
          ? [{ price: 'desc' }]
          : query.sort === 'popular'
            ? [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
            : [{ createdAt: 'desc' }];

    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: ProductsService.publicProductSelect,
      }),
    ]);

    return {
      items: products.map(ProductsService.mapPublicProduct),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Catégories du catalogue GLOBAL (Marketplace) : nom + slug + nombre de
   * produits actifs réels, toutes boutiques ACTIVE confondues. Alimente le
   * menu « Toutes les catégories » du hero ET la section « Explorer par
   * catégorie » — plus aucun compte codé en dur côté frontend.
   */
  async findPublicCategories() {
    const groups = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: {
        isActive: true,
        boutique: { status: 'ACTIVE' },
        categoryId: { not: null },
      },
      _count: { _all: true },
    });
    const ids = groups
      .map((g) => g.categoryId)
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) return [];
    const categories = await this.prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
    const countByCategory = new Map(
      groups.map((g) => [g.categoryId, g._count._all]),
    );
    return categories
      .map((c) => ({
        name: c.name,
        slug: c.slug,
        count: countByCategory.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Catalogue GLOBAL (accueil client / futur Marketplace) : produits actifs de
   * TOUTES les boutiques ACTIVE, avec la boutique d'origine dans chaque
   * résultat. Mêmes filtres/tri/pagination que le catalogue d'une boutique.
   */
  async findAllPublic(query: QueryProductsDto) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      boutique: { status: 'ACTIVE' },
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.brand ? { brand: { slug: query.brand } } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
      ...(query.minPrice !== undefined
        ? { price: { gte: new Prisma.Decimal(query.minPrice) } }
        : {}),
      ...(query.maxPrice !== undefined
        ? { price: { lte: new Prisma.Decimal(query.maxPrice) } }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      query.sort === 'price_asc'
        ? [{ price: 'asc' }]
        : query.sort === 'price_desc'
          ? [{ price: 'desc' }]
          : query.sort === 'popular'
            ? [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
            : [{ createdAt: 'desc' }];

    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: ProductsService.publicProductSelect,
      }),
    ]);

    return {
      items: products.map(ProductsService.mapPublicProduct),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Projection détail publique UNIQUE (variantes + avis + boutique) — utilisée
   * par `findOnePublic` (par id) ET `findOnePublicBySlug` (lien direct
   * /produit/:slug) : un seul format, aucune dérive entre les deux routes.
   */
  private static readonly publicProductDetailSelect = {
    id: true,
    name: true,
    slug: true,
    description: true,
    price: true,
    oldPrice: true,
    currency: true,
    stock: true,
    sku: true,
    isFeatured: true,
    images: true,
    category: { select: { id: true, name: true, slug: true } },
    brand: { select: { id: true, name: true, slug: true } },
    variants: {
      select: { id: true, name: true, value: true, priceDelta: true, stock: true },
    },
    reviews: {
      select: { id: true, author: true, rating: true, comment: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    },
    boutique: { select: { id: true, name: true, slug: true, verificationStatus: true } },
  } as const;

  /** Détail produit public (variantes + avis) */
  async findOnePublic(boutiqueSlug: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
        boutique: { slug: boutiqueSlug, status: 'ACTIVE' },
      },
      select: ProductsService.publicProductDetailSelect,
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  /**
   * Détail produit public par SLUG (lien profond /produit/:slug du
   * Marketplace). Résout le produit dans TOUTES les boutiques ACTIVE — le
   * slug étant unique par boutique, le premier match (le plus récent) gagne.
   */
  async findOnePublicBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
        boutique: { status: 'ACTIVE' },
      },
      orderBy: { createdAt: 'desc' },
      select: ProductsService.publicProductDetailSelect,
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  /** Lien WhatsApp « commander » pour un produit donné */
  async getWhatsappLink(boutiqueSlug: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
        boutique: { slug: boutiqueSlug, status: 'ACTIVE' },
      },
      select: {
        name: true,
        price: true,
        currency: true,
        boutique: { select: { name: true, whatsappNumber: true } },
      },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    const number = product.boutique.whatsappNumber;
    if (!number) {
      throw new BadRequestException(
        'Cette boutique ne propose pas encore le paiement via WhatsApp',
      );
    }
    const message = `Bonjour ${product.boutique.name}, je suis intéressé(e) par "${product.name}" (${product.price} ${product.currency}).`;
    const url = `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    return { url, productName: product.name, price: product.price };
  }

  // ===== Helpers =====

  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'produit'
    );
  }

  private async uniqueSlug(boutiqueId: string, base: string): Promise<string> {
    let slug = base;
    let n = 1;
    while (true) {
      const existing = await this.prisma.product.findUnique({
        where: { boutiqueId_slug: { boutiqueId, slug } },
      });
      if (!existing) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }
}
