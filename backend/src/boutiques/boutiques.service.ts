import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BoutiqueStatus,
  LedgerDirection,
  PaymentDirection,
  PaymentKind,
  SubscriptionStatus,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerAccounts, LedgerService } from '../common/services/ledger.service';
import { CreateBoutiqueDto } from './dto/create-boutique.dto';
import { UpdateBoutiqueDto } from './dto/update-boutique.dto';
import { InviteTeamMemberDto, UpdateTeamMemberDto } from './dto/team-member.dto';
import { SubscribePlanDto } from './dto/subscribe-plan.dto';

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

  async getWallet(boutiqueId: string) {
    const [boutique, withdrawals, heldAllocations] = await Promise.all([
      this.prisma.boutique.findUnique({
        where: { id: boutiqueId },
        select: { balance: true },
      }),
      this.prisma.withdrawalRequest.findMany({
        where: { boutiqueId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.settlementAllocation.findMany({
        where: {
          beneficiaryType: 'SELLER_BOUTIQUE',
          beneficiaryId: boutiqueId,
          status: {
            in: [
              'AWAITING_DELIVERY_VERIFICATION',
              'AWAITING_BUYER_CONFORMITY',
              'ON_HOLD_DISPUTE',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalBalance = Number(boutique?.balance || 0);
    const heldAmount = heldAllocations.reduce(
      (sum, a) => sum + Number(a.netAmountFcfa || 0),
      0,
    );
    const availableToWithdraw = Math.max(0, totalBalance - heldAmount);

    return {
      balance: boutique?.balance || 0,
      heldAmount,
      availableToWithdraw,
      heldAllocations,
      withdrawals,
    };
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

      // Calcul des fonds bloqués (livraison non encore vérifiée, délai de conformité en cours, ou litige ouvert)
      const heldAllocations = await tx.settlementAllocation.findMany({
        where: {
          beneficiaryType: 'SELLER_BOUTIQUE',
          beneficiaryId: boutiqueId,
          status: {
            in: [
              'AWAITING_DELIVERY_VERIFICATION',
              'AWAITING_BUYER_CONFORMITY',
              'ON_HOLD_DISPUTE',
            ],
          },
        },
        select: { netAmountFcfa: true, status: true },
      });

      const heldAmount = heldAllocations.reduce(
        (sum, a) => sum + Number(a.netAmountFcfa || 0),
        0,
      );
      const availableToWithdraw = Math.max(0, boutique.balance.toNumber() - heldAmount);

      if (availableToWithdraw < amount) {
        throw new BadRequestException(
          heldAmount > 0
            ? `Solde disponible insuffisant (${availableToWithdraw} FCFA disponibles ; ${heldAmount} FCFA sont réservés en attente de confirmation de livraison/conformité ou sous litige).`
            : 'Solde insuffisant pour ce retrait',
        );
      }

      // === CORRECTIF C3 — SORTIE D'ARGENT : DÉBIT DU SOLDLE + ÉCRITURE ===
      // La demande de retrait est enregistrée d'abord, afin que son
      // identifiant serve de référence serveur (unique) au `Payment` PAYOUT.
      // Le débit du solde et l'écriture comptable partent dans la MÊME
      // transaction : si le solde est insuffisant, tout est annulé.
      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          boutiqueId,
          amount,
          paymentInfo: paymentInfo.trim(),
        },
      });

      await this.ledgerService.debitBoutique(tx, boutiqueId, amount, {
        counterpart: [
          {
            accountCode: LedgerAccounts.PAYOUT,
            direction: LedgerDirection.CREDIT,
            amount,
          },
        ],
        description: `Demande de retrait — boutique ${boutique.name}`,
        // Débit atomique conditionnel anti-race condition : le solde doit
        // couvrir le retrait ET les fonds bloqués (séquestre).
        guardBalance: true,
        reservedAmount: heldAmount,
        where: { status: BoutiqueStatus.ACTIVE },
        insufficientFundsMessage: 'Solde disponible insuffisant pour ce retrait',
        payment: {
          provider: 'PLATFORM',
          providerRef: `PAYOUT-${withdrawal.id}`,
          kind: PaymentKind.PAYOUT,
          direction: PaymentDirection.OUT,
          grossAmount: amount,
          netAmount: amount,
          boutiqueId,
        },
      });

      return withdrawal;
    });
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ledgerService: LedgerService,
  ) {}

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

  /**
   * Souscrire ou changer de formule d'abonnement (Starter, Pro, Business, Enterprise)
   * Supporte le règlement via PayDunya Checkout ou l'activation directe (Gratuit / Sandbox).
   */
  async subscribePlan(userId: string, dto: SubscribePlanDto) {
    const planSlug = dto.plan.toLowerCase();
    const PLAN_DEFAULTS: Record<
      string,
      { name: string; price: number; description: string; sortOrder: number }
    > = {
      starter: {
        name: 'Starter',
        price: 0,
        description: 'Commencez à vendre gratuitement, sans abonnement.',
        sortOrder: 1,
      },
      pro: {
        name: 'Pro',
        price: 15000,
        description: 'Formule Pro avec commission réduite et badge vérifié.',
        sortOrder: 2,
      },
      business: {
        name: 'Business',
        price: 12500,
        description: 'Jusqu’à 3 boutiques indépendantes, commission 2 % et analytics avancés.',
        sortOrder: 3,
      },
      enterprise: {
        name: 'Enterprise',
        price: 45000,
        description: 'Offre grands comptes, multi-boutiques illimité et accompagnement VIP.',
        sortOrder: 4,
      },
    };

    const meta = PLAN_DEFAULTS[planSlug];
    if (!meta) {
      throw new BadRequestException('Formule d’abonnement invalide.');
    }

    const boutiques = await this.prisma.boutique.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
    });
    if (boutiques.length === 0) {
      throw new BadRequestException(
        'Veuillez créer votre première boutique avant de souscrire un abonnement.',
      );
    }

    // S'assure que le plan existe dans la table Plan
    const planRecord = await this.prisma.plan.upsert({
      where: { slug: planSlug },
      update: { isActive: true },
      create: {
        slug: planSlug,
        name: meta.name,
        description: meta.description,
        price: meta.price,
        isActive: true,
        sortOrder: meta.sortOrder,
      },
    });

    const amountFcfa = meta.price;
    const paymentMethod = dto.paymentMethod ?? (amountFcfa > 0 ? 'PAYDUNYA' : 'DIRECT');

    // Tout abonnement payant (via Mobile Money Bénin MTN/Moov/Celtiis, Carte ou PayDunya)
    // passe obligatoirement par une vraie facture PayDunya Checkout pour débiter le compte Sandbox/Live
    if (amountFcfa > 0 && paymentMethod !== 'DIRECT') {
      const cleanKey = (v?: string) => (v ?? '').trim().replace(/^['"]|['"]$/g, '').trim();
      const masterKey = cleanKey(this.configService.get<string>('PAYDUNYA_MASTER_KEY'));
      const privateKey = cleanKey(this.configService.get<string>('PAYDUNYA_PRIVATE_KEY'));
      const publicKey = cleanKey(this.configService.get<string>('PAYDUNYA_PUBLIC_KEY'));
      const tokenKey = cleanKey(this.configService.get<string>('PAYDUNYA_TOKEN'));
      const environment = cleanKey(this.configService.get<string>('PAYDUNYA_ENVIRONMENT') || 'sandbox').toLowerCase();

      const isConfigured =
        masterKey.trim() !== '' &&
        !masterKey.includes('YOUR_') &&
        privateKey.trim() !== '' &&
        !privateKey.includes('YOUR_') &&
        publicKey.trim() !== '' &&
        !publicKey.includes('YOUR_') &&
        tokenKey.trim() !== '' &&
        !tokenKey.includes('YOUR_');

      if (!isConfigured) {
        throw new BadRequestException(
          'Les 4 clés API PayDunya (PAYDUNYA_MASTER_KEY, PAYDUNYA_PUBLIC_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN) doivent être configurées dans backend/.env pour lancer un test réel sur PayDunya Sandbox.',
        );
      }

      const isLive = environment === 'live' || environment === 'production';
      const baseUrl = isLive
        ? 'https://app.paydunya.com/api/v1'
        : 'https://app.paydunya.com/sandbox-api/v1';
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
      const returnUrl =
        dto.callbackUrl ||
        `${frontendUrl}/espace-vendeur/parametres/formule?subscribed_plan=${encodeURIComponent(planSlug)}`;
      const cancelUrl = `${frontendUrl}/espace-vendeur/parametres/formule?cancelled=1`;
      const ipnUrl = process.env.PAYDUNYA_IPN_URL;

      const mainBoutique = boutiques[0];
      const payload = {
        invoice: {
          items: {
            item_0: {
              name: `Abonnement ZennShop - Formule ${meta.name}`,
              quantity: 1,
              unit_price: String(amountFcfa),
              total_price: String(amountFcfa),
              description: meta.description,
            },
          },
          total_amount: amountFcfa,
          description: `Abonnement mensuel ZennShop (${meta.name}) - ${mainBoutique.name}`,
        },
        store: {
          name: 'ZennShop Plateforme',
          tagline: 'Abonnements Commerçants Bénin',
        },
        custom_data: {
          type: 'SUBSCRIPTION',
          userId,
          planSlug,
          planId: planRecord.id,
          boutiqueId: mainBoutique.id,
          preferredChannel: dto.operator ?? paymentMethod,
          customerPhone: dto.phone ?? '',
        },
        actions: {
          cancel_url: cancelUrl,
          return_url: returnUrl,
          ...(ipnUrl ? { callback_url: ipnUrl } : {}),
        },
      };

      const response = await fetch(`${baseUrl}/checkout-invoice/create`, {
        method: 'POST',
        headers: {
          'PAYDUNYA-MASTER-KEY': masterKey,
          'PAYDUNYA-PRIVATE-KEY': privateKey,
          'PAYDUNYA-PUBLIC-KEY': publicKey,
          'PAYDUNYA-TOKEN': tokenKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new BadRequestException(
          `Erreur HTTP PayDunya (${response.status}): ${errText}`,
        );
      }

      const data = await response.json();
      if (data.response_code !== '00') {
        throw new BadRequestException(
          `PayDunya a refusé la création de la facture (${data.response_code}): ${data.response_text ?? data.description ?? ''}`,
        );
      }

      const token = String(data.token);
      const checkoutUrl =
        data.response_text ??
        `https://paydunya.com/${isLive ? 'checkout' : 'sandbox-checkout'}/invoice/${token}`;
      return {
        success: true,
        mode: 'paydunya_redirect',
        plan: planSlug,
        planName: meta.name,
        amount: amountFcfa,
        token,
        checkoutUrl,
      };
    }

    // Uniquement pour la formule gratuite Starter (0 FCFA)
    await this.activateUserSubscription(userId, planSlug);

    return {
      success: true,
      mode: 'activated',
      plan: planSlug,
      planName: meta.name,
      amount: amountFcfa,
    };
  }

  /**
   * Active atomiquement l'abonnement d'un vendeur sur toutes ses boutiques
   * et synchronise la table Subscription.
   */
  async activateUserSubscription(userId: string, planSlug: string) {
    const normalizedSlug = planSlug.toLowerCase();
    const PLAN_PRICES: Record<string, { name: string; price: number; sortOrder: number }> = {
      starter: { name: 'Starter', price: 0, sortOrder: 1 },
      pro: { name: 'Pro', price: 15000, sortOrder: 2 },
      business: { name: 'Business', price: 12500, sortOrder: 3 },
      enterprise: { name: 'Enterprise', price: 45000, sortOrder: 4 },
    };
    const meta = PLAN_PRICES[normalizedSlug] ?? { name: normalizedSlug, price: 12500, sortOrder: 3 };

    const planRecord = await this.prisma.plan.upsert({
      where: { slug: normalizedSlug },
      update: { isActive: true },
      create: {
        slug: normalizedSlug,
        name: meta.name,
        price: meta.price,
        isActive: true,
        sortOrder: meta.sortOrder,
      },
    });

    const boutiques = await this.prisma.boutique.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.boutique.updateMany({
        where: { ownerId: userId },
        data: { plan: normalizedSlug },
      });

      for (const b of boutiques) {
        if (normalizedSlug === 'starter') {
          await tx.subscription.deleteMany({
            where: { boutiqueId: b.id },
          });
        } else {
          await tx.subscription.upsert({
            where: { boutiqueId: b.id },
            update: {
              planId: planRecord.id,
              status: SubscriptionStatus.ACTIVE,
              price: meta.price,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              cancelledAt: null,
            },
            create: {
              boutiqueId: b.id,
              planId: planRecord.id,
              status: SubscriptionStatus.ACTIVE,
              price: meta.price,
              startsAt: now,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            },
          });
        }
      }
    });

    return { plan: normalizedSlug, planId: planRecord.id };
  }
}
