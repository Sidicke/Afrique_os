import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BoutiqueStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentCryptoService } from '../common/crypto/payment-crypto.service';
import { CreateBoutiqueDto } from './dto/create-boutique.dto';
import { UpdateBoutiqueDto } from './dto/update-boutique.dto';
import { InviteTeamMemberDto, UpdateTeamMemberDto } from './dto/team-member.dto';

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
  monthlyGoalFcfa: true,
} as const;

@Injectable()
export class BoutiquesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentCrypto: PaymentCryptoService,
  ) {}

  async getWallet(boutiqueId: string) {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id: boutiqueId },
      select: { balance: true },
    });
    const withdrawals = await this.prisma.withdrawalRequest.findMany({
      where: { boutiqueId },
      orderBy: { createdAt: 'desc' },
    });
    const decryptedWithdrawals = withdrawals.map((w) => ({
      ...w,
      paymentInfo: this.paymentCrypto.decrypt(w.paymentInfo),
    }));
    return { balance: boutique?.balance || 0, withdrawals: decryptedWithdrawals };
  }

  async requestWithdrawal(boutiqueId: string, amount: number, paymentInfo: string) {
    if (!amount || amount < 500 || !Number.isFinite(amount)) {
      throw new BadRequestException('Le montant minimum de retrait est de 500 FCFA');
    }
    if (!paymentInfo || !paymentInfo.trim()) {
      throw new BadRequestException('Les informations de paiement sont requises');
    }

    return this.prisma.$transaction(async (tx) => {
      const boutique = await tx.boutique.findUnique({ where: { id: boutiqueId } });
      if (!boutique) throw new NotFoundException('Boutique introuvable');
      if (boutique.status !== BoutiqueStatus.ACTIVE) {
        throw new BadRequestException('Seule une boutique active peut demander un retrait');
      }
      if (boutique.balance.toNumber() < amount) {
        throw new BadRequestException('Solde insuffisant pour ce retrait');
      }

      // Application des frais fixes de transfert vendeur
      const fixedFee = Number(boutique.fedapayVendorFixedFee ?? 150);
      if (amount <= fixedFee) {
        throw new BadRequestException(
          `Le montant du retrait doit être supérieur aux frais fixes de transfert (${fixedFee} FCFA)`,
        );
      }
      const netAmount = amount - fixedFee;

      // Chiffrement E2EE AES-256-GCM des coordonnées de paiement sensibles
      const encryptedPaymentInfo = this.paymentCrypto.encrypt(paymentInfo.trim());

      // Débit atomique conditionnel anti-race condition
      const updated = await tx.boutique.updateMany({
        where: {
          id: boutiqueId,
          status: BoutiqueStatus.ACTIVE,
          balance: { gte: amount },
        },
        data: { balance: { decrement: amount } },
      });

      if (updated.count === 0) {
        throw new BadRequestException('Solde insuffisant pour ce retrait');
      }

      return tx.withdrawalRequest.create({
        data: {
          boutiqueId,
          amount,
          fee: fixedFee,
          netAmount,
          paymentInfo: encryptedPaymentInfo,
        },
      });
    });
  }

  /** Création d'une boutique (toujours PENDING, vérifiée par un admin ensuite) */
  async create(ownerId: string, dto: CreateBoutiqueDto) {
    // 1. Vérifier la limite de création selon le plan le plus élevé de l'utilisateur
    const userBoutiques = await this.prisma.boutique.findMany({
      where: { ownerId },
      select: { plan: true, verificationStatus: true },
    });
    
    const count = userBoutiques.length;
    let userPlan = 'starter';
    if (userBoutiques.some(b => b.plan === 'enterprise')) userPlan = 'enterprise';
    else if (userBoutiques.some(b => b.plan === 'business')) userPlan = 'business';

    if (userPlan === 'starter' && count >= 1) {
      throw new ForbiddenException("Vous avez atteint la limite de 1 boutique de votre plan Starter. Passez à Business pour en gérer jusqu'à 3.");
    }
    if (userPlan === 'business' && count >= 3) {
      throw new ForbiddenException("Vous avez atteint la limite de 3 boutiques de votre plan Business. Contactez-nous pour l'offre Enterprise.");
    }

    // Si le propriétaire a déjà une boutique vérifiée KYC, la nouvelle boutique hérite de la vérification
    const isOwnerKycVerified = userBoutiques.some((b) => b.verificationStatus === VerificationStatus.VERIFIED);
    const initialVerificationStatus = isOwnerKycVerified ? VerificationStatus.VERIFIED : VerificationStatus.NONE;

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
        plan: userPlan,
        slug: await this.uniqueSlug(slugBase),
        status: BoutiqueStatus.ACTIVE,
        verificationStatus: initialVerificationStatus,
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

    // Si approuvé, toutes les enseignes de ce même propriétaire bénéficient de la vérification KYC
    if (status === VerificationStatus.VERIFIED) {
      await this.prisma.boutique.updateMany({
        where: { ownerId: boutique.ownerId },
        data: { verificationStatus: VerificationStatus.VERIFIED },
      });
    }

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

  /**
   * Gestion de l'équipe collaboratrice
   */
  async getTeamMembers(boutiqueId: string) {
    return this.prisma.teamMember.findMany({
      where: { boutiqueId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        boutiqueId: true,
        email: true,
        name: true,
        role: true,
        status: true,
        invitedAt: true,
        acceptedAt: true,
        createdAt: true,
      },
    });
  }

  async inviteTeamMember(boutiqueId: string, inviterId: string, dto: InviteTeamMemberDto) {
    const email = dto.email.toLowerCase().trim();
    if (!email) throw new BadRequestException("L'e-mail est obligatoire");

    const existing = await this.prisma.teamMember.findUnique({
      where: { boutiqueId_email: { boutiqueId, email } },
    });

    if (existing) {
      if (existing.status === 'REVOKED') {
        return this.prisma.teamMember.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            role: dto.role || existing.role,
            invitedAt: new Date(),
          },
        });
      }
      throw new ConflictException('Ce collaborateur est déjà membre ou invité sur cette boutique');
    }

    const matchedUser = await this.prisma.user.findUnique({ where: { email } });

    return this.prisma.teamMember.create({
      data: {
        boutiqueId,
        invitedById: inviterId,
        email,
        name: dto.name?.trim() || matchedUser?.name || null,
        role: dto.role || 'EDITOR',
        status: 'PENDING',
        userId: matchedUser?.id || null,
      },
    });
  }

  async updateTeamMember(boutiqueId: string, memberId: string, dto: UpdateTeamMemberDto) {
    const member = await this.prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.boutiqueId !== boutiqueId) {
      throw new NotFoundException('Membre introuvable');
    }
    return this.prisma.teamMember.update({
      where: { id: memberId },
      data: {
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  async removeTeamMember(boutiqueId: string, memberId: string) {
    const member = await this.prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.boutiqueId !== boutiqueId) {
      throw new NotFoundException('Membre introuvable');
    }
    await this.prisma.teamMember.delete({ where: { id: memberId } });
    return { success: true };
  }
}
