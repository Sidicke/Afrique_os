import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoutiqueStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoutiqueDto } from './dto/create-boutique.dto';
import { UpdateBoutiqueDto } from './dto/update-boutique.dto';

/** Projection publique d'une boutique (vitrine) */
const publicSelect = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  description: true,
  status: true,
  verificationStatus: true,
  plan: true,
  email: true,
  phone: true,
  city: true,
  country: true,
  whatsappNumber: true,
  coverImage: true,
  logoImage: true,
  deliveryShortLabel: true,
  deliveryNote: true,
  warrantyNote: true,
  paymentNote: true,
  socialLinks: true,
  deliveryPacks: true,
  promotions: true,
  notifications: true,
} as const;

@Injectable()
export class BoutiquesService {

  async getWallet(boutiqueId: string) {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id: boutiqueId },
      select: { balance: true }
    });
    const withdrawals = await this.prisma.withdrawalRequest.findMany({
      where: { boutiqueId },
      orderBy: { createdAt: 'desc' }
    });
    return { balance: boutique?.balance || 0, withdrawals };
  }

  async requestWithdrawal(boutiqueId: string, amount: number, paymentInfo: string) {
    if (amount <= 0) throw new BadRequestException("Montant invalide");
    
    return this.prisma.$transaction(async (tx) => {
      const boutique = await tx.boutique.findUnique({ where: { id: boutiqueId } });
      if (!boutique || boutique.balance < amount) throw new BadRequestException("Solde insuffisant");
      
      await tx.boutique.update({
        where: { id: boutiqueId },
        data: { balance: { decrement: amount } }
      });
      
      return tx.withdrawalRequest.create({
        data: {
          boutiqueId,
          amount,
          paymentInfo
        }
      });
    });
  }
  constructor(private readonly prisma: PrismaService) {}

  /** Création d'une boutique (toujours PENDING, vérifiée par un admin ensuite) */
  async create(ownerId: string, dto: CreateBoutiqueDto) {
    const existingName = await this.prisma.boutique.findFirst({
      where: { name: { equals: dto.name.trim(), mode: 'insensitive' } },
    });
    if (existingName) {
      throw new ConflictException('Une boutique avec ce nom existe déjà. Choisissez un nom unique.');
    }

    const slugBase = this.slugify(dto.name);
    const boutique = await this.prisma.boutique.create({
      data: {
        ...dto,
        // Les champs JSON Prisma attendent des objets plats (pas des instances de classe)
        socialLinks: dto.socialLinks ? { ...dto.socialLinks } : undefined,
        deliveryPacks: dto.deliveryPacks ? dto.deliveryPacks.map((p) => ({ ...p })) : undefined,
        promotions: dto.promotions ? dto.promotions.map((p) => ({ ...p })) : undefined,
        notifications: dto.notifications ? dto.notifications.map((n) => ({ ...n })) : undefined,
        ownerId,
        slug: await this.uniqueSlug(slugBase),
        status: BoutiqueStatus.PENDING,
      },
      select: publicSelect,
    });
    return boutique;
  }

  /** Boutiques de l'utilisateur connecté */
  async findMy(ownerId: string) {
    return this.prisma.boutique.findMany({
      where: { ownerId },
      select: publicSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Détail boutique pour son propriétaire (y compris les paramètres) */
  async findOneForOwner(id: string) {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id },
      select: publicSelect,
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable');
    return boutique;
  }

  /** Mise à jour par le propriétaire (guard d'appartenance appliqué au contrôleur) */
  async update(id: string, dto: UpdateBoutiqueDto) {
    const data: Record<string, unknown> = {
      ...dto,
      // Objets plats pour les champs JSON Prisma
      ...(dto.socialLinks ? { socialLinks: { ...dto.socialLinks } } : {}),
      ...(dto.deliveryPacks ? { deliveryPacks: dto.deliveryPacks.map((p) => ({ ...p })) } : {}),
      ...(dto.promotions ? { promotions: dto.promotions.map((p) => ({ ...p })) } : {}),
      ...(dto.notifications ? { notifications: dto.notifications.map((n) => ({ ...n })) } : {}),
    };
    // Si le nom change, le slug est régénéré
    if (dto.name) {
      const current = await this.prisma.boutique.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Boutique introuvable');
      data.slug = await this.uniqueSlug(this.slugify(dto.name));
    }
    return this.prisma.boutique.update({
      where: { id },
      data,
      select: publicSelect,
    });
  }

  /**
   * Demande de vérification du compte (vendeur) : NONE / REJECTED → PENDING.
   * Une boutique déjà PENDING ne change pas (idempotent) ; une boutique
   * VERIFIED ne peut pas revenir en arrière par ce canal.
   */
  async requestVerification(id: string) {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id },
      select: { verificationStatus: true },
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable');
    if (boutique.verificationStatus === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Votre boutique est déjà vérifiée');
    }
    if (boutique.verificationStatus === VerificationStatus.PENDING) {
      // Idempotent : la demande est déjà en cours
      return this.prisma.boutique.findUnique({ where: { id }, select: publicSelect });
    }
    return this.prisma.boutique.update({
      where: { id },
      data: { verificationStatus: VerificationStatus.PENDING },
      select: publicSelect,
    });
  }

  /**
   * Décision de vérification (réservé ADMIN) : VERIFIED → badge affiché,
   * REJECTED → le vendeur peut soumettre une nouvelle demande.
   */
  async reviewVerification(id: string, status: VerificationStatus) {
    if (status !== VerificationStatus.VERIFIED && status !== VerificationStatus.REJECTED) {
      throw new BadRequestException('Statut de vérification invalide');
    }
    const boutique = await this.prisma.boutique.findUnique({ where: { id } });
    if (!boutique) throw new NotFoundException('Boutique introuvable');
    return this.prisma.boutique.update({
      where: { id },
      data: { verificationStatus: status },
      select: publicSelect,
    });
  }

  /** Transition du cycle de vie (réservé ADMIN) */
  async updateStatus(id: string, status: BoutiqueStatus) {
    const current = await this.prisma.boutique.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Boutique introuvable');
    this.assertValidTransition(current.status, status);
    return this.prisma.boutique.update({
      where: { id },
      data: { status },
      select: publicSelect,
    });
  }

  /**
   * Liste publique des boutiques ACTIVE pour l'annuaire (accueil client) :
   * identité, localisation, visuels et nombre de produits actifs.
   */
  async findPublicAll() {
    const boutiques = await this.prisma.boutique.findMany({
      where: { status: BoutiqueStatus.ACTIVE },
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
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Catégorie dominante de chaque boutique (la plus représentée parmi ses
    // produits actifs) — affichée sur la carte de l'annuaire.
    const ids = boutiques.map((b) => b.id);
    const groups = await this.prisma.product.groupBy({
      by: ['boutiqueId', 'categoryId'],
      where: {
        boutiqueId: { in: ids },
        isActive: true,
        categoryId: { not: null },
      },
      _count: { _all: true },
    });
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
    const dominantByBoutique = new Map<string, string>();
    const bestCount = new Map<string, number>();
    for (const g of groups) {
      if (!g.categoryId) continue;
      const current = bestCount.get(g.boutiqueId) ?? 0;
      if (g._count._all > current) {
        bestCount.set(g.boutiqueId, g._count._all);
        dominantByBoutique.set(g.boutiqueId, categoryName.get(g.categoryId) ?? '');
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
      category: dominantByBoutique.get(b.id) ?? null,
      productsCount: b._count.products,
    }));
  }

  /**
   * Profil public complet d'une boutique (vitrine) : identité + config
   * + catégories + produits actifs. Accessible sans authentification.
   */
  async findPublicBySlug(slug: string) {
    const boutique = await this.prisma.boutique.findFirst({
      where: { slug, status: BoutiqueStatus.ACTIVE },
      select: {
        ...publicSelect,
        categories: {
          select: { id: true, name: true, slug: true },
          orderBy: { name: 'asc' },
        },
        products: {
          where: { isActive: true },
          select: {
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
            reviews: { select: { rating: true } },
            variants: {
              select: { id: true, name: true, value: true, priceDelta: true, stock: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable ou inactif');
    return boutique;
  }

  async isNameAvailable(name: string): Promise<boolean> {
    const existing = await this.prisma.boutique.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } },
    });
    return !existing;
  }

  // ===== Helpers =====

  private assertValidTransition(from: BoutiqueStatus, to: BoutiqueStatus) {
    if (from === to) return;
    const allowed: Record<BoutiqueStatus, BoutiqueStatus[]> = {
      PENDING: ['ACTIVE', 'CLOSED'],
      ACTIVE: ['SUSPENDED', 'CLOSED'],
      SUSPENDED: ['ACTIVE', 'CLOSED'],
      CLOSED: [],
    };
    if (!allowed[from].includes(to)) {
      throw new BadRequestException(
        `Transition de statut invalide : ${from} → ${to}`,
      );
    }
  }

  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'boutique'
    );
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let n = 1;
    while (true) {
      const existing = await this.prisma.boutique.findUnique({ where: { slug } });
      if (!existing) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }
}
