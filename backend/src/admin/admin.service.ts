import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BoutiqueStatus,
  ModerationStatus,
  ModerationTargetType,
  OrderStatus,
  Prisma,
  Role,
  SubscriptionStatus,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { BoutiquesService } from '../boutiques/boutiques.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { OrderStatusDto } from './dto/order-status.dto';
import { PlanUpdateDto } from './dto/plan-update.dto';
import { ReportDecisionDto } from './dto/report-decision.dto';
import { SettingsUpdateDto } from './dto/settings-update.dto';
import { StoreStatusDto } from './dto/store-status.dto';
import { SubscriptionUpdateDto } from './dto/subscription-update.dto';
import { UserStatusDto } from './dto/user-status.dto';
import { VerificationDecisionDto } from './dto/verification-decision.dto';

export type AdminPeriod = '7_days' | '30_days' | '90_days' | 'this_year';

/** Mapping backend → contrat frontend (types/admin.ts) */
const STORE_STATUS_MAP: Record<BoutiqueStatus, string> = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'BLOCKED',
};

const VERIFICATION_STATUS_MAP: Record<VerificationStatus, string | null> = {
  NONE: null,
  PENDING: 'PENDING',
  VERIFIED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const SUBSCRIPTION_STATUS_MAP: Record<SubscriptionStatus, string> = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
};

const REPORT_STATUS_MAP: Record<ModerationStatus, string> = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_REVIEW',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
};

const TARGET_TYPE_MAP: Record<ModerationTargetType, string> = {
  BOUTIQUE: 'store',
  PRODUCT: 'product',
  USER: 'seller',
  ORDER: 'order',
  REVIEW: 'content',
};

const ORDER_STATUS_UI: Record<OrderStatus, string> = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  WHATSAPP_CONFIRMED: 'PAID',
  SHIPPING: 'SHIPPING',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

interface AdminIdentity {
  id: string;
  email: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boutiquesService: BoutiquesService,
    private readonly ordersService: OrdersService,
  ) {}

  /* ================================================================
   * Overview (doc 03) — Command Center
   * ================================================================ */

  async getOverview(period: AdminPeriod) {
    const { start } = this.range(period);
    const prev = this.range(period, true);

    const [totalStores, totalUsers, totalOrders, periodOrders, periodUsers, periodStores] =
      await this.prisma.$transaction([
        this.prisma.boutique.count(),
        this.prisma.user.count(),
        this.prisma.order.count(),
        this.prisma.order.findMany({
          where: { createdAt: { gte: start } },
          select: { total: true, status: true, createdAt: true },
        }),
        this.prisma.user.findMany({
          where: { createdAt: { gte: start } },
          select: { createdAt: true },
        }),
        this.prisma.boutique.findMany({
          where: { createdAt: { gte: start } },
          select: { createdAt: true },
        }),
      ]);

    const gmv = (orders: { status: OrderStatus; total: Prisma.Decimal }[]) =>
      orders
        .filter((o) => o.status !== OrderStatus.CANCELLED)
        .reduce((s, o) => s + Number(o.total), 0);

    const periodGmv = gmv(periodOrders);
    const prevGmv = gmv(
      await this.prisma.order.findMany({
        where: { createdAt: { gte: prev.start, lt: start } },
        select: { total: true, status: true },
      }),
    );
    const change = (current: number, previous: number) =>
      previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : 100;

    const [pendingVerifications, openReports, activeSubscriptions, activeStores, suspendedStores] =
      await this.prisma.$transaction([
        this.prisma.boutique.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
        this.prisma.moderationReport.count({
          where: { status: { in: [ModerationStatus.NEW, ModerationStatus.IN_PROGRESS] } },
        }),
        this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
        this.prisma.boutique.count({ where: { status: BoutiqueStatus.ACTIVE } }),
        this.prisma.boutique.count({ where: { status: BoutiqueStatus.SUSPENDED } }),
      ]);

    const kpis = [
      this.kpi('stores', 'Boutiques', totalStores, 'store', 'gold', 'au total', {
        label: 'Gérer',
        href: '/admin/stores',
      }),
      this.kpi('active-stores', 'Boutiques actives', activeStores, 'store', 'green', 'sur la plateforme'),
      this.kpi('users', 'Utilisateurs', totalUsers, 'users', 'blue', 'au total', {
        label: 'Voir',
        href: '/admin/users',
      }),
      this.kpi('orders', 'Commandes', totalOrders, 'orders', 'ivory', 'au total', {
        label: 'Voir',
        href: '/admin/orders',
      }),
      {
        ...this.kpi('gmv', 'GMV (FCFA)', Math.round(periodGmv), 'wallet', 'terracotta', 'sur la période'),
        changePercent: change(periodGmv, prevGmv),
        isPositive: periodGmv >= prevGmv,
      },
      this.kpi('mrr', 'MRR (FCFA)', await this.computeMrr(), 'chart', 'gold', 'revenus récurrents'),
    ];

    return {
      kpis,
      priorityActions: [
        {
          id: 'verifications',
          level: pendingVerifications > 0 ? ('high' as const) : ('info' as const),
          title: 'Vérifications en attente',
          description: `${pendingVerifications} vendeur${pendingVerifications > 1 ? 's' : ''} attend${pendingVerifications > 1 ? 'ent' : ''} la validation de son dossier`,
          count: pendingVerifications,
          href: '/admin/verification',
          icon: 'shield',
        },
        {
          id: 'reports',
          level: openReports > 0 ? ('critical' as const) : ('info' as const),
          title: 'Signalements ouverts',
          description: `${openReports} signalement${openReports > 1 ? 's' : ''} nécessitant une décision`,
          count: openReports,
          href: '/admin/moderation',
          icon: 'alert',
        },
        {
          id: 'suspended',
          level: suspendedStores > 0 ? ('medium' as const) : ('info' as const),
          title: 'Boutiques suspendues',
          description: `${suspendedStores} boutique${suspendedStores > 1 ? 's' : ''} en attente de réactivation ou de fermeture`,
          count: suspendedStores,
          href: '/admin/stores?status=SUSPENDED',
          icon: 'store',
        },
      ],
      period,
      performance: await this.buildPerformanceSeries(period, periodUsers, periodStores, periodOrders),
      activity: await this.buildActivity(start),
      snapshots: await this.buildSnapshots(),
      systemStatus: await this.buildSystemStatus(),
    };
  }

  /** Calcule l'état réel du système à partir de métriques live (doc 03 §21). */
  private async buildSystemStatus() {
    const dbStart = Date.now();
    const [productCount, pendingOrderCount] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.order.count({ where: { status: { in: [OrderStatus.PENDING, OrderStatus.PAID] } } }),
    ]);
    const dbMs = Date.now() - dbStart;

    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeLabel = hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;

    return [
      { id: 'api', label: 'API', status: 'operational' as const, detail: `Uptime ${uptimeLabel}` },
      {
        id: 'database',
        label: 'Base de données',
        status: dbMs < 500 ? 'operational' as const : dbMs < 2000 ? 'degraded' as const : 'down' as const,
        detail: `${dbMs} ms`,
      },
      { id: 'products', label: 'Catalogue produits', status: 'operational' as const, detail: `${productCount.toLocaleString('fr-FR')} réf.` },
      { id: 'orders', label: 'Commandes en cours', status: 'operational' as const, detail: `${pendingOrderCount} actives` },
    ];
  }

  /* ================================================================
   * Verification Center (doc 04)
   * ================================================================ */

  async getVerifications(q?: string) {
    const where: Prisma.BoutiqueWhereInput = {
      // Tous les dossiers (file d'attente + résolus) : les onglets
      // « Approuvés » / « Rejetés » du frontend restent alimentés.
      verificationStatus: { not: VerificationStatus.NONE },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { owner: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const boutiques = await this.prisma.boutique.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 300,
    });

    const pendingIds = boutiques
      .filter((b) => b.verificationStatus === VerificationStatus.PENDING)
      .map((b) => b.id);
    const rejectedIds = boutiques
      .filter((b) => b.verificationStatus === VerificationStatus.REJECTED)
      .map((b) => b.id);

    // Un dossier en attente avec une note interne = en cours d'examen ; un
    // dossier rejeté avec une note = des corrections demandées (doc 04 §8).
    const [pendingNoteGroups, rejectedNoteGroups] = await Promise.all([
      pendingIds.length
        ? this.prisma.adminNote.groupBy({
            where: { targetType: 'boutique', targetId: { in: pendingIds } },
            by: ['targetId'],
            _count: true,
          })
        : Promise.resolve([]),
      rejectedIds.length
        ? this.prisma.adminNote.groupBy({
            where: { targetType: 'boutique', targetId: { in: rejectedIds } },
            by: ['targetId'],
            _count: true,
          })
        : Promise.resolve([]),
    ]);

    return {
      kpis: {
        pending: pendingIds.length,
        inReview: pendingNoteGroups.length,
        changesRequired: rejectedNoteGroups.length,
        approved: boutiques.filter((b) => b.verificationStatus === VerificationStatus.VERIFIED).length,
        rejected: rejectedIds.length,
      },
      rows: boutiques.map((b) => ({
        id: b.id,
        merchantName: b.owner.name ?? b.owner.email,
        storeName: b.name,
        submittedAt: b.createdAt.toISOString(),
        status: VERIFICATION_STATUS_MAP[b.verificationStatus] ?? 'PENDING',
        priority: this.priorityFor(b.createdAt),
        assignedTo: null,
        updatedAt: b.updatedAt.toISOString(),
      })),
      total: boutiques.length,
    };
  }

  /** Dossier de vérification complet (contexte, documents, notes, historique) */
  async getVerificationCase(id: string) {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true, createdAt: true, status: true } },
        verificationDocuments: { orderBy: { createdAt: 'asc' } },
        _count: { select: { products: true } },
      },
    });
    if (!boutique) throw new NotFoundException('Dossier de vérification introuvable');

    const [notes, history, reports] = await Promise.all([
      this.adminNotes('boutique', id),
      this.adminHistory('boutique', id),
      this.prisma.moderationReport.count({ where: { targetType: 'BOUTIQUE', targetId: id } }),
    ]);

    return {
      id: boutique.id,
      merchant: {
        id: boutique.owner.id,
        name: boutique.owner.name ?? '',
        email: boutique.owner.email,
        phone: boutique.owner.phone ?? '',
        joinedAt: boutique.owner.createdAt.toISOString(),
        accountStatus: boutique.owner.status === UserStatus.BLOCKED ? 'BLOCKED' : 'ACTIVE',
      },
      store: {
        id: boutique.id,
        name: boutique.name,
        slug: boutique.slug,
        category: null,
        location: boutique.city ?? null,
        status: STORE_STATUS_MAP[boutique.status],
        createdAt: boutique.createdAt.toISOString(),
        productsCount: boutique._count.products,
      },
      status: VERIFICATION_STATUS_MAP[boutique.verificationStatus] ?? 'PENDING',
      priority: this.priorityFor(boutique.createdAt),
      submittedAt: boutique.createdAt.toISOString(),
      updatedAt: boutique.updatedAt.toISOString(),
      assignedTo: null,
      documents: boutique.verificationDocuments.map((d) => ({
        id: d.id,
        label: d.label,
        state: d.status === 'approved' ? 'verified' : d.status === 'rejected' ? 'invalid' : 'present',
        hasPreview: Boolean(d.url),
        url: d.url,
        uploadedAt: d.createdAt.toISOString(),
      })),
      checklist: [
        { id: 'identity', group: 'identity', label: 'Pièce d’identité du vendeur', done: boutique.verificationDocuments.some((d) => d.type === 'IDENTITY') },
        { id: 'business', group: 'business', label: 'Registre de commerce', done: boutique.verificationDocuments.some((d) => d.type === 'REGISTRE') },
        { id: 'store', group: 'store', label: 'Boutique en ligne renseignée', done: Boolean(boutique.description) },
        { id: 'store-location', group: 'store', label: 'Localisation renseignée', done: Boolean(boutique.city) },
      ],
      notes,
      history,
      reportsCount: reports,
    };
  }

  /** Décision de vérification : VERIFIED / REJECTED + journal + note éventuelle */
  async reviewVerification(admin: AdminIdentity, id: string, dto: VerificationDecisionDto) {
    if (dto.status !== VerificationStatus.VERIFIED && dto.status !== VerificationStatus.REJECTED) {
      throw new BadRequestException('Statut de vérification invalide');
    }
    const updated = await this.boutiquesService.reviewVerification(id, dto.status);
    await this.log(admin, `verification.${dto.status === VerificationStatus.VERIFIED ? 'approved' : 'rejected'}`, 'boutique', id, updated.name, {
      verificationStatus: dto.status,
    });
    if (dto.note?.trim()) {
      await this.createNote(admin, { targetType: 'boutique', targetId: id, content: dto.note.trim() });
    }
    return {
      id: updated.id,
      status: VERIFICATION_STATUS_MAP[updated.verificationStatus] ?? 'PENDING',
      storeName: updated.name,
    };
  }

  /* ================================================================
   * Stores Management (doc 05)
   * ================================================================ */

  async getStores(q?: string, status?: string) {
    const where: Prisma.BoutiqueWhereInput = {
      ...(status
        ? { status: this.storeStatusFromQuery(status) }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
              { owner: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, active, pending, suspended, blocked, newStores, boutiques] =
      await this.prisma.$transaction([
        this.prisma.boutique.count(),
        this.prisma.boutique.count({ where: { status: BoutiqueStatus.ACTIVE } }),
        this.prisma.boutique.count({ where: { status: BoutiqueStatus.PENDING } }),
        this.prisma.boutique.count({ where: { status: BoutiqueStatus.SUSPENDED } }),
        this.prisma.boutique.count({ where: { status: BoutiqueStatus.CLOSED } }),
        this.prisma.boutique.count({
          where: { createdAt: { gte: this.range('30_days').start } },
        }),
        this.prisma.boutique.findMany({
          where,
          include: { owner: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 300,
        }),
      ]);

    const boutiqueIds = boutiques.map((b) => b.id);
    const orderAggregates = boutiqueIds.length > 0
      ? await this.prisma.order.groupBy({
          by: ['boutiqueId'],
          where: { boutiqueId: { in: boutiqueIds }, status: { not: OrderStatus.CANCELLED } },
          _count: { _all: true },
          _sum: { total: true },
        })
      : [];

    const orderAggMap = new Map<string, { count: number; sum: number }>();
    for (const agg of orderAggregates) {
      orderAggMap.set(agg.boutiqueId, {
        count: agg._count._all,
        sum: Number(agg._sum.total ?? 0),
      });
    }

    const rows = boutiques.map((b) => {
      const agg = orderAggMap.get(b.id) ?? { count: 0, sum: 0 };
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        merchantName: b.owner.name ?? b.owner.email,
        status: STORE_STATUS_MAP[b.status],
        verificationStatus: VERIFICATION_STATUS_MAP[b.verificationStatus],
        plan: this.planName(b.plan),
        ordersCount: agg.count,
        gmvFcfa: agg.sum,
        createdAt: b.createdAt.toISOString(),
        lastActivityAt: b.updatedAt.toISOString(),
      };
    });

    return {
      kpis: { total, active, pending, suspended, blocked, newStores },
      rows,
      total,
    };
  }

  async getStoreDetail(id: string) {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true } },
        subscription: {
          include: { plan: { select: { name: true, slug: true } } },
        },
        _count: { select: { products: true, orders: true } },
      },
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable');

    const monthStart = new Date();
    monthStart.setDate(1);
    const [ordersThisMonth, reports, notes, history] = await Promise.all([
      this.prisma.order.count({ where: { boutiqueId: id, createdAt: { gte: monthStart } } }),
      this.prisma.moderationReport.count({ where: { targetType: 'BOUTIQUE', targetId: id } }),
      this.adminNotes('boutique', id),
      this.adminHistory('boutique', id),
    ]);

    const gmvAgg = await this.prisma.order.aggregate({
      where: { boutiqueId: id, status: { not: OrderStatus.CANCELLED } },
      _sum: { total: true },
    });

    return {
      id: boutique.id,
      name: boutique.name,
      slug: boutique.slug,
      tagline: boutique.tagline,
      description: boutique.description,
      category: null,
      location: boutique.city ?? null,
      email: boutique.email,
      phone: boutique.phone,
      status: STORE_STATUS_MAP[boutique.status],
      verificationStatus: VERIFICATION_STATUS_MAP[boutique.verificationStatus],
      verifiedAt: null,
      verifiedBy: null,
      plan: this.planName(boutique.plan),
      subscriptionStatus: boutique.subscription
        ? SUBSCRIPTION_STATUS_MAP[boutique.subscription.status]
        : 'TRIAL',
      renewalDate: boutique.subscription?.currentPeriodEnd?.toISOString() ?? null,
      createdAt: boutique.createdAt.toISOString(),
      updatedAt: boutique.updatedAt.toISOString(),
      merchant: {
        id: boutique.owner.id,
        name: boutique.owner.name ?? '',
        email: boutique.owner.email,
        phone: boutique.owner.phone ?? '',
        accountStatus: boutique.owner.status === UserStatus.BLOCKED ? 'BLOCKED' : 'ACTIVE',
        joinedAt: boutique.owner.createdAt.toISOString(),
      },
      productsCount: boutique._count.products,
      ordersCount: boutique._count.orders,
      ordersThisMonth,
      gmvFcfa: Number(gmvAgg._sum.total ?? 0),
      reportsCount: reports,
      activeWarnings: reports,
      previousSuspensions: history.filter((h) => h.label.toLowerCase().includes('suspend')).length,
      activity: await this.storeActivity(id),
      history,
      notes,
    };
  }

  async setStoreStatus(admin: AdminIdentity, id: string, dto: StoreStatusDto) {
    const updated = await this.boutiquesService.updateStatus(id, dto.status);
    await this.log(admin, `store.${this.statusActionName(dto.status)}`, 'boutique', id, updated.name, {
      status: dto.status,
      ...(dto.reason ? { reason: dto.reason } : {}),
    });
    return { id: updated.id, name: updated.name, status: STORE_STATUS_MAP[updated.status] };
  }

  /* ================================================================
   * Users Management (doc 06)
   * ================================================================ */

  async getUsers(q?: string, role?: string) {
    const where: Prisma.UserWhereInput = {
      ...(role ? { role: role as Role } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, clients, sellers, admins, blocked, newUsers, prevUsers, users] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: Role.CLIENT } }),
        this.prisma.user.count({ where: { role: Role.VENDEUR } }),
        this.prisma.user.count({ where: { role: Role.ADMIN } }),
        this.prisma.user.count({ where: { status: UserStatus.BLOCKED } }),
        this.prisma.user.count({
          where: { createdAt: { gte: this.range('30_days').start } },
        }),
        this.prisma.user.count({
          where: { createdAt: { gte: this.range('30_days', true).start, lt: this.range('30_days').start } },
        }),
        this.prisma.user.findMany({
          where,
          include: { boutiques: { select: { id: true, name: true }, take: 1 } },
          orderBy: { createdAt: 'desc' },
          take: 300,
        }),
      ]);

    const rows = users.map((u) => ({
      id: u.id,
      name: u.name ?? '—',
      email: u.email,
      phone: u.phone ?? '—',
      role: u.role,
      status: u.status === UserStatus.BLOCKED ? 'BLOCKED' : 'ACTIVE',
      storeName: u.boutiques[0]?.name ?? null,
      storeId: u.boutiques[0]?.id ?? null,
      lastActiveAt: u.updatedAt.toISOString(),
      createdAt: u.createdAt.toISOString(),
    }));

    return {
      kpis: {
        total,
        clients,
        sellers,
        admins,
        suspended: blocked,
        newUsers,
        newUsersChangePercent:
          prevUsers > 0 ? Math.round(((newUsers - prevUsers) / prevUsers) * 1000) / 10 : 100,
      },
      rows,
      total,
    };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        boutiques: {
          include: { subscription: { select: { status: true, plan: { select: { slug: true } } } } },
        },
        conversations: { select: { id: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const [orders, notes, history] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId: id },
        include: { boutique: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.adminNotes('user', id),
      this.adminHistory('user', id),
    ]);

    const clientOrders = orders.filter((o) => o.userId === id);
    const totalSpent = clientOrders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((s, o) => s + Number(o.total), 0);

    const store = user.boutiques[0];
    const verificationId =
      store && store.verificationStatus !== VerificationStatus.NONE ? store.id : null;

    return {
      id: user.id,
      name: user.name ?? '—',
      email: user.email,
      phone: user.phone ?? '—',
      role: user.role,
      status: user.status === UserStatus.BLOCKED ? 'BLOCKED' : 'ACTIVE',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastActiveAt: user.updatedAt.toISOString(),
      lastLoginAt: null,
      store: store
        ? {
            id: store.id,
            name: store.name,
            slug: store.slug,
            status: STORE_STATUS_MAP[store.status],
            verificationStatus: VERIFICATION_STATUS_MAP[store.verificationStatus],
            verificationId,
            plan: this.planName(store.plan),
            subscriptionStatus: store.subscription
              ? SUBSCRIPTION_STATUS_MAP[store.subscription.status]
              : 'TRIAL',
            createdAt: store.createdAt.toISOString(),
          }
        : null,
      clientStats:
        user.role === Role.CLIENT || clientOrders.length > 0
          ? {
              ordersCount: clientOrders.length,
              totalSpentFcfa: totalSpent,
              conversationsCount: user.conversations.length,
              lastOrderAt: clientOrders[0]?.createdAt.toISOString() ?? null,
            }
          : null,
      activity: this.userActivity(user, clientOrders),
      orders: orders.map((o) => ({
        id: o.id,
        storeName: o.boutique.name,
        amountFcfa: Number(o.total),
        status: ORDER_STATUS_UI[o.status],
        date: o.createdAt.toISOString(),
      })),
      history,
      notes,
    };
  }

  async setUserStatus(admin: AdminIdentity, id: string, dto: UserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role === Role.ADMIN) {
      throw new BadRequestException('Impossible de modifier le statut d’un compte administrateur');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === UserStatus.BLOCKED ? { refreshTokenHash: null } : {}),
      },
      select: { id: true, name: true, email: true, status: true },
    });
    await this.log(
      admin,
      dto.status === UserStatus.BLOCKED ? 'user.blocked' : 'user.unblocked',
      'user',
      id,
      updated.name ?? updated.email,
      { status: dto.status, ...(dto.reason ? { reason: dto.reason } : {}) },
    );
    return {
      id: updated.id,
      status: updated.status === UserStatus.BLOCKED ? 'BLOCKED' : 'ACTIVE',
    };
  }

  /* ================================================================
   * Orders Platform Overview (doc 07)
   * ================================================================ */

  async getOrders(q?: string, status?: string) {
    const where: Prisma.OrderWhereInput = {
      ...(status ? { status: status as OrderStatus } : {}),
      ...(q
        ? {
            OR: [
              { reference: { contains: q.replace(/^#/, ''), mode: 'insensitive' } },
              { customerName: { contains: q, mode: 'insensitive' } },
              { customerPhone: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 864e5);

    const [total, today, yesterday, pending, delivered, cancelled, gmvAgg, orders, filteredTotal] =
      await this.prisma.$transaction([
        this.prisma.order.count(),
        this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.order.count({
          where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
        }),
        this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
        this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
        this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
        this.prisma.order.aggregate({
          where: { status: { not: OrderStatus.CANCELLED } },
          _sum: { total: true },
        }),
        this.prisma.order.findMany({
          where,
          include: {
            boutique: { select: { id: true, name: true, status: true, owner: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 300,
        }),
        this.prisma.order.count({ where }),
      ]);

    const gmv = Number(gmvAgg._sum.total ?? 0);

    return {
      kpis: {
        total,
        today,
        todayChangePercent: yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 1000) / 10 : 100,
        pending,
        delivered,
        cancelled,
        gmvFcfa: Math.round(gmv),
        aovFcfa: total > 0 ? Math.round(gmv / total) : 0,
      },
      total: filteredTotal,
      volume: await this.buildOrderVolume(),
      anomalies: await this.buildOrderAnomalies(),
      rows: orders.map((o) => ({
        id: o.id,
        reference: `#${o.reference}`,
        customer: { id: o.userId ?? o.id, name: o.customerName, phone: o.customerPhone },
        store: { id: o.boutique.id, name: o.boutique.name, status: STORE_STATUS_MAP[o.boutique.status] },
        sellerName: o.boutique.owner.name ?? '—',
        amountFcfa: Number(o.total),
        currency: 'XOF',
        status: ORDER_STATUS_UI[o.status],
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
    };
  }

  /** Changement de statut par l'admin (mêmes règles métier que le vendeur) */
  async setOrderStatus(admin: AdminIdentity, id: string, dto: OrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { boutiqueId: true, reference: true },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    const updated = await this.ordersService.updateStatus(order.boutiqueId, id, { status: dto.status as any });
    await this.log(admin, `order.status_${dto.status.toLowerCase()}`, 'order', id, `#${order.reference}`, {
      status: dto.status,
      ...(dto.reason ? { reason: dto.reason } : {}),
    });
    return updated;
  }

  /**
   * Annulation administrative : CANCELLED + remise en stock (miroir de
   * l'annulation client) — uniquement avant expédition, tracée au journal.
   */
  async cancelOrder(admin: AdminIdentity, id: string, dto: CancelOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cette commande est déjà annulée');
    }
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PAID
    ) {
      throw new BadRequestException(
        'Cette commande ne peut plus être annulée : elle est en cours d’expédition ou livrée',
      );
    }
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED, cancellationReason: dto.reason },
        include: { items: true },
      });

      // Si la commande était déjà payée, régulariser le solde vendeur et restituer les points
      if (order.status === OrderStatus.PAID) {
        await tx.boutique.update({
          where: { id: order.boutiqueId },
          data: { balance: { decrement: Number(order.total) } },
        });

        if (order.userId && order.pointsUsed > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: { pointsBalance: { increment: order.pointsUsed } },
          });
          await tx.pointTransaction.create({
            data: {
              userId: order.userId,
              amount: order.pointsUsed,
              reason: 'REFUND_ON_ORDER_CANCEL',
              orderId: order.id,
            },
          });
        }
      }

      for (const line of updated.items) {
        if (!line.productId) continue;
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { increment: line.quantity } },
        });
        if (line.variantId) {
          await tx.variant.update({
            where: { id: line.variantId },
            data: { stock: { increment: line.quantity } },
          });
        }
      }
      return updated;
    });
    await this.log(admin, 'order.cancelled', 'order', id, `#${cancelled.reference}`, {
      reason: dto.reason,
    });
    return cancelled;
  }

  async getOrderDetail(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        boutique: {
          select: { id: true, name: true, status: true, owner: { select: { id: true, name: true } } },
        },
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    const notes = await this.adminNotes('order', id);
    const history = await this.adminHistory('order', id);

    const itemsTotal = order.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
    const pendingHours = order.status === OrderStatus.PENDING
      ? Math.floor((Date.now() - order.createdAt.getTime()) / 36e5)
      : 0;

    return {
      id: order.id,
      reference: `#${order.reference}`,
      customer: { id: order.userId ?? order.id, name: order.customerName, phone: order.customerPhone },
      store: { id: order.boutique.id, name: order.boutique.name, status: STORE_STATUS_MAP[order.boutique.status] },
      sellerName: order.boutique.owner.name ?? '—',
      seller: { id: order.boutique.owner.id, name: order.boutique.owner.name ?? '—' },
      amountFcfa: Number(order.total),
      currency: 'XOF',
      status: ORDER_STATUS_UI[order.status],
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((i) => ({
        id: i.id,
        name: i.productName,
        variant: i.variantLabel ?? null,
        quantity: i.quantity,
        unitPriceFcfa: Number(i.unitPrice),
      })),
      subtotalFcfa: Math.round(itemsTotal),
      deliveryFeeFcfa: Number(order.deliveryPrice),
      totalFcfa: Number(order.total),
      paymentMethod: order.paymentMethod.toLowerCase().replace(/_/g, '_'),
      delivery: {
        method: order.deliveryName ?? 'Standard',
        zone: order.city ?? order.country ?? '—',
        address: null,
        feeFcfa: Number(order.deliveryPrice),
        status: order.status === OrderStatus.DELIVERED ? 'Livrée' : 'En cours',
      },
      timeline: [
        { id: 'created', label: 'Commande créée', at: order.createdAt.toISOString() },
        ...(order.paidAt
          ? [{ id: 'paid', label: 'Paiement confirmé', at: order.paidAt.toISOString() }]
          : []),
        ...(order.status !== OrderStatus.PENDING
          ? [{ id: 'status', label: `Statut : ${this.orderStatusLabel(order.status)}`, at: order.updatedAt.toISOString() }]
          : []),
        ...history.map((h, i) => ({ ...h, id: `log-${i}` })),
      ],
      notes,
      anomaly:
        pendingHours >= 48
          ? {
              id: `anomaly-${order.id}`,
              level: 'medium' as const,
              message: `Paiement en attente depuis ${Math.floor(pendingHours / 24)} jour(s)`,
              orderId: order.id,
            }
          : null,
    };
  }

  /* ================================================================
   * Subscriptions & Revenue (doc 08)
   * ================================================================ */

  async getSubscriptions() {
    const [subscriptions, plans, mrr, activeCount, trialCount, cancelled30] =
      await this.prisma.$transaction([
        this.prisma.subscription.findMany({
          include: {
            boutique: { select: { id: true, name: true, owner: { select: { name: true, email: true } } } },
            plan: { select: { slug: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 300,
        }),
        this.prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } }),
        this.aggregateMrr(),
        this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
        this.prisma.subscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
        this.prisma.subscription.count({
          where: { status: SubscriptionStatus.CANCELLED, cancelledAt: { gte: this.range('30_days').start } },
        }),
      ]);

    const mrrValue = Number(mrr._sum.price ?? 0);
    const planIds = plans.map((p) => p.id);
    const [currentPlanCounts, previousPlanCounts] = await Promise.all([
      planIds.length > 0
        ? this.prisma.subscription.groupBy({
            by: ['planId'],
            where: { planId: { in: planIds }, status: SubscriptionStatus.ACTIVE },
            _count: { _all: true },
          })
        : [],
      planIds.length > 0
        ? this.prisma.subscription.groupBy({
            by: ['planId'],
            where: {
              planId: { in: planIds },
              status: SubscriptionStatus.ACTIVE,
              createdAt: { lt: this.range('30_days').start },
            },
            _count: { _all: true },
          })
        : [],
    ]);

    const currentMap = new Map(currentPlanCounts.map((c) => [c.planId, c._count._all]));
    const previousMap = new Map(previousPlanCounts.map((c) => [c.planId, c._count._all]));

    const planRows = plans.map((p) => {
      const subs = currentMap.get(p.id) ?? 0;
      const previousMonthSubs = previousMap.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        monthlyPriceFcfa: Number(p.price),
        yearlyPriceFcfa: Number(p.price) * 12,
        status: p.isActive ? 'ACTIVE' : 'DISABLED',
        subscribersCount: subs,
        mrrFcfa: Math.round(Number(p.price) * subs),
        growthPercent:
          previousMonthSubs > 0
            ? Math.round(((subs - previousMonthSubs) / previousMonthSubs) * 1000) / 10
            : 100,
        conversionPercent: 0,
        churnPercent: 0,
        shareOfMrrPercent:
          mrrValue > 0 ? Math.round((Number(p.price) * subs * 1000) / mrrValue) / 10 : 0,
      };
    });

    const trialsExpiring = subscriptions
      .filter((s) => s.status === SubscriptionStatus.TRIAL && s.trialEndsAt)
      .map((s) => ({
        storeId: s.boutique.id,
        storeName: s.boutique.name,
        plan: s.plan.name,
        expiresInDays: Math.max(0, Math.ceil((s.trialEndsAt!.getTime() - Date.now()) / 864e5)),
      }))
      .filter((t) => t.expiresInDays <= 7)
      .sort((a, b) => a.expiresInDays - b.expiresInDays);

    const alerts: { id: string; level: 'critical' | 'high' | 'medium' | 'info'; message: string }[] = [];
    if (trialsExpiring.length > 0) {
      alerts.push({
        id: 'trials-expiring',
        level: 'medium',
        message: `${trialsExpiring.length} essai(s) arrivent à expiration sous 7 jours`,
      });
    }
    const pastDue = subscriptions.filter((s) => s.status === SubscriptionStatus.PAST_DUE).length;
    if (pastDue > 0) {
      alerts.push({
        id: 'past-due',
        level: 'high',
        message: `${pastDue} abonnement(s) en paiement en retard`,
      });
    }
    if (activeCount > 0 && cancelled30 / (activeCount + cancelled30) > 0.1) {
      alerts.push({
        id: 'churn',
        level: 'critical',
        message: `Churn mensuel élevé : ${Math.round((cancelled30 / (activeCount + cancelled30)) * 100)} % d'annulations sur 30 jours`,
      });
    }

    return {
      kpis: {
        mrrFcfa: Math.round(mrrValue),
        mrrChangePercent: 0,
        arrFcfa: Math.round(mrrValue * 12),
        arrChangePercent: 0,
        activeSubscriptions: activeCount,
        trialsActive: trialCount,
        trialConversionPercent: activeCount + trialCount > 0
          ? Math.round((activeCount / (activeCount + trialCount)) * 1000) / 10
          : 0,
        churnPercent: activeCount + cancelled30 > 0
          ? Math.round((cancelled30 / (activeCount + cancelled30)) * 1000) / 10
          : 0,
        revenuePerPaidStoreFcfa: activeCount > 0 ? Math.round(mrrValue / activeCount) : 0,
      },
      revenueSeries: await this.buildRevenueSeries(),
      plans: planRows,
      trialsExpiring,
      alerts,
      events: await this.buildSubscriptionEvents(),
      total: subscriptions.length,
      rows: subscriptions.map((s) => ({
        id: s.id,
        store: { id: s.boutique.id, name: s.boutique.name },
        ownerName: s.boutique.owner.name ?? s.boutique.owner.email,
        plan: s.plan.name,
        status: SUBSCRIPTION_STATUS_MAP[s.status],
        billingCycle: 'monthly',
        amountFcfa: Number(s.price),
        currency: 'XOF',
        startedAt: s.startsAt.toISOString(),
        renewalDate: s.currentPeriodEnd?.toISOString() ?? null,
        trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
        paymentMethod: 'MOBILE_MONEY',
        lastTransactionAt: s.updatedAt.toISOString(),
      })),
    };
  }

  async getSubscriptionDetail(id: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        boutique: {
          include: { owner: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!sub) throw new NotFoundException('Abonnement introuvable');

    const history = await this.adminHistory('subscription', id);
    return {
      id: sub.id,
      store: { id: sub.boutique.id, name: sub.boutique.name },
      ownerName: sub.boutique.owner.name ?? sub.boutique.owner.email,
      owner: sub.boutique.owner,
      plan: sub.plan.name,
      status: SUBSCRIPTION_STATUS_MAP[sub.status],
      billingCycle: 'monthly',
      amountFcfa: Number(sub.price),
      currency: 'XOF',
      startedAt: sub.startsAt.toISOString(),
      renewalDate: sub.currentPeriodEnd?.toISOString() ?? null,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      paymentMethod: 'MOBILE_MONEY',
      lastTransactionAt: sub.updatedAt.toISOString(),
      storeStatus: STORE_STATUS_MAP[sub.boutique.status],
      verificationStatus: VERIFICATION_STATUS_MAP[sub.boutique.verificationStatus],
      planPriceFcfa: Number(sub.plan.price),
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? sub.currentPeriodStart.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
      planChanges: history.filter((h) => h.label.toLowerCase().includes('plan')),
      transactions: [
        {
          id: 'initial',
          type: 'charge',
          amountFcfa: Number(sub.price),
          status: 'paid',
          at: sub.startsAt.toISOString(),
        },
        ...(sub.status === SubscriptionStatus.ACTIVE
          ? [
              {
                id: 'renewal',
                type: 'renewal' as const,
                amountFcfa: Number(sub.price),
                status: 'paid',
                at: sub.currentPeriodStart.toISOString(),
              },
            ]
          : []),
      ],
      history,
    };
  }

  /** Changement de plan / statut (réservé ADMIN) — cohérence avec boutique.plan */
  /** Transitions de statut autorisées (miroir de la discipline boutique) */
  private readonly SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
    TRIAL: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED],
    ACTIVE: [SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELLED],
    PAST_DUE: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED],
    CANCELLED: [],
  };

  async updateSubscription(admin: AdminIdentity, id: string, dto: SubscriptionUpdateDto) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, boutique: { select: { name: true } } },
    });
    if (!sub) throw new NotFoundException('Abonnement introuvable');
    if (dto.status && dto.status !== sub.status) {
      const allowed = this.SUBSCRIPTION_TRANSITIONS[sub.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Transition de statut invalide : ${sub.status} → ${dto.status}`,
        );
      }
    }

    let planId = sub.planId;
    let planSlug = sub.plan.slug;
    if (dto.planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan) throw new BadRequestException('Plan introuvable');
      if (!plan.isActive) throw new BadRequestException('Ce plan est désactivé');
      planId = plan.id;
      planSlug = plan.slug;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.subscription.update({
        where: { id },
        data: {
          ...(dto.planId ? { planId, price: (await tx.plan.findUniqueOrThrow({ where: { id: planId } })).price } : {}),
          ...(dto.status ? { status: dto.status, ...(dto.status === SubscriptionStatus.CANCELLED ? { cancelledAt: new Date() } : {}) } : {}),
        },
      });
      if (dto.planId) {
        await tx.boutique.update({ where: { id: sub.boutiqueId }, data: { plan: planSlug } });
      }
      return u;
    });

    await this.log(
      admin,
      dto.planId ? 'subscription.change_plan' : `subscription.status_${dto.status?.toLowerCase()}`,
      'subscription',
      id,
      sub.boutique.name,
      { plan: planSlug, status: updated.status, ...(dto.reason ? { reason: dto.reason } : {}) },
    );

    return this.getSubscriptionDetail(id);
  }

  /** Activation / désactivation d'un plan (PlansManager) */
  async updatePlan(admin: AdminIdentity, id: string, dto: PlanUpdateDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan introuvable');
    const updated = await this.prisma.plan.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
    await this.log(admin, `plan.${updated.isActive ? 'enabled' : 'disabled'}`, 'plan', id, updated.name);
    return updated;
  }

  /* ================================================================
   * Analytics (doc 09)
   * ================================================================ */

  async getAnalytics(period: AdminPeriod) {
    const { start } = this.range(period);

    const [users, stores, orders, orderItems, products, subscriptions] =
      await this.prisma.$transaction([
        this.prisma.user.findMany({ select: { createdAt: true, role: true } }),
        this.prisma.boutique.findMany({
          select: { createdAt: true, status: true, verificationStatus: true, id: true, name: true },
        }),
        this.prisma.order.findMany({
          where: { createdAt: { gte: start } },
          select: { total: true, status: true, createdAt: true, boutiqueId: true, customerPhone: true },
        }),
        this.prisma.orderItem.findMany({
          where: { order: { createdAt: { gte: start } } },
          select: {
            productId: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            order: { select: { boutiqueId: true } },
            product: { select: { category: { select: { id: true, name: true } }, boutique: { select: { name: true } } } },
          },
        }),
        this.prisma.product.findMany({ select: { id: true, categoryId: true, boutiqueId: true } }),
        this.prisma.subscription.findMany({ select: { status: true } }),
      ]);

    const activeOrders = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const gmv = activeOrders.reduce((s, o) => s + Number(o.total), 0);
    const activeClients = new Set(activeOrders.map((o) => o.customerPhone).filter(Boolean)).size;
    const newStores = stores.filter((s) => s.createdAt >= start).length;
    const activeStores = stores.filter((s) => s.status === BoutiqueStatus.ACTIVE).length;

    const kpis = [
      this.kpi('active-users', 'Utilisateurs actifs', users.length, 'users', 'blue', 'comptes enregistrés'),
      this.kpi('new-stores', 'Nouvelles boutiques', newStores, 'store', 'gold', 'sur la période'),
      this.kpi('active-stores', 'Boutiques actives', activeStores, 'store', 'green', 'visibles'),
      this.kpi('orders', 'Commandes', orders.length, 'orders', 'ivory', 'sur la période'),
      this.kpi('gmv', 'GMV', Math.round(gmv), 'wallet', 'terracotta', 'sur la période'),
      this.kpi('clients', 'Clients actifs', activeClients, 'users', 'gold', 'ayant commandé'),
    ];

    // Funnel vendeur : créées → vérifiées → publiées → produits → 1ère commande
    const withProducts = new Set(products.map((p) => p.boutiqueId)).size;
    const withOrders = new Set(orders.map((o) => o.boutiqueId)).size;
    const verified = stores.filter((s) => s.verificationStatus === VerificationStatus.VERIFIED).length;
    const published = stores.filter((s) => s.status === BoutiqueStatus.ACTIVE).length;
    const funnel = this.buildFunnel(stores.length, verified, published, withProducts, withOrders);

    // Performance par catégorie
    const catMap = new Map<string, { id: string; name: string; productsCount: number; storesCount: Set<string>; ordersCount: number; gmvFcfa: number }>();
    for (const item of orderItems) {
      const cat = item.product?.category;
      if (!cat) continue;
      const entry = catMap.get(cat.id) ?? {
        id: cat.id,
        name: cat.name,
        productsCount: 0,
        storesCount: new Set<string>(),
        ordersCount: 0,
        gmvFcfa: 0,
      };
      entry.ordersCount += 1;
      entry.storesCount.add(item.order.boutiqueId);
      entry.gmvFcfa += Number(item.unitPrice) * item.quantity;
      catMap.set(cat.id, entry);
    }
    const catProducts = new Map<string, number>();
    for (const p of products) {
      if (!p.categoryId) continue;
      catProducts.set(p.categoryId, (catProducts.get(p.categoryId) ?? 0) + 1);
    }
    for (const [catId, count] of catProducts) {
      const entry = catMap.get(catId);
      if (entry) entry.productsCount = count;
    }

    // Top boutiques & produits
    const storeStats = new Map<string, { ordersCount: number; gmvFcfa: number }>();
    for (const o of activeOrders) {
      const e = storeStats.get(o.boutiqueId) ?? { ordersCount: 0, gmvFcfa: 0 };
      e.ordersCount += 1;
      e.gmvFcfa += Number(o.total);
      storeStats.set(o.boutiqueId, e);
    }
    const storeNames = new Map(stores.map((s) => [s.id, s.name]));
    const topStores = [...storeStats.entries()]
      .sort((a, b) => b[1].gmvFcfa - a[1].gmvFcfa)
      .slice(0, 5)
      .map(([id, stats]) => ({
        id,
        name: storeNames.get(id) ?? '—',
        ordersCount: stats.ordersCount,
        gmvFcfa: Math.round(stats.gmvFcfa),
        growthPercent: 0,
      }));

    const productStats = new Map<string, { name: string; storeName: string; ordersCount: number; gmvFcfa: number }>();
    for (const item of orderItems) {
      const key = item.productId ?? item.productName;
      const e = productStats.get(key) ?? {
        name: item.productName,
        storeName: item.product?.boutique?.name ?? '—',
        ordersCount: 0,
        gmvFcfa: 0,
      };
      e.ordersCount += 1;
      e.gmvFcfa += Number(item.unitPrice) * item.quantity;
      productStats.set(key, e);
    }
    const topProducts = [...productStats.values()]
      .sort((a, b) => b.gmvFcfa - a.gmvFcfa)
      .slice(0, 5);

    const trends = await this.buildAnalyticTrends(period, orders, subscriptions, stores);

    return {
      kpis,
      period,
      growth: await this.buildGrowthSeries(period, users, stores, orders),
      funnel,
      categories: [...catMap.values()].map((c) => ({
        id: c.id,
        name: c.name,
        productsCount: c.productsCount,
        storesCount: c.storesCount.size,
        ordersCount: c.ordersCount,
        gmvFcfa: Math.round(c.gmvFcfa),
        growthPercent: 0,
      })),
      topStores,
      topProducts,
      searchTerms: [],
      trends,
    };
  }

  /* ================================================================
   * Moderation & Security (doc 10)
   * ================================================================ */

  async getModeration() {
    const [reports, logs, suspendedStores, blockedUsers, riskStores] = await Promise.all([
      this.prisma.moderationReport.findMany({
        include: { reporter: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.adminLog.findMany({
        include: { admin: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.boutique.count({ where: { status: BoutiqueStatus.SUSPENDED } }),
      this.prisma.user.count({ where: { status: UserStatus.BLOCKED } }),
      this.buildRiskStores(),
    ]);

    const open = reports.filter((r) =>
      ([
        ModerationStatus.NEW,
        ModerationStatus.IN_PROGRESS,
      ] as ModerationStatus[]).includes(r.status),
    );
    const critical = open.filter((r) => r.severity === 'critical');

    return {
      kpis: {
        openReports: open.length,
        criticalReports: critical.length,
        activeIncidents: critical.length,
        suspendedStores,
        suspendedAccounts: blockedUsers,
        recentActions: logs.length,
      },
      reports: reports.map((r) => this.toReportRow(r)),
      incidents: open
        .filter((r) => r.severity === 'critical' || r.severity === 'high')
        .map((r) => ({
          id: r.id,
          title: `Incident — ${this.reportReason(r.reason)}`,
          severity: r.severity,
          status: r.status === ModerationStatus.NEW ? 'OPEN' : 'ANALYSIS',
          detectedAt: r.createdAt.toISOString(),
          affectedStores: r.targetType === 'BOUTIQUE' ? 1 : 0,
          affectedUsers: r.targetType === 'USER' ? 1 : 0,
          description: r.details ?? '',
          assignedTo: null,
        })),
      riskStores,
      auditLog: logs.map((l) => ({
        id: l.id,
        admin: l.admin.name ?? l.admin.email,
        action: this.actionLabel(l.action),
        target: l.targetLabel ?? l.targetType ?? '—',
        severity: this.actionSeverity(l.action),
        at: l.createdAt.toISOString(),
      })),
    };
  }

  async getModerationCase(id: string) {
    const report = await this.prisma.moderationReport.findUnique({
      where: { id },
      include: { reporter: { select: { name: true, email: true } } },
    });
    if (!report) throw new NotFoundException('Signalement introuvable');

    const [notes, history, target] = await Promise.all([
      this.adminNotes('report', id),
      this.adminHistory('report', id),
      this.resolveReportTarget(report.targetType, report.targetId),
    ]);

    return {
      id: report.id,
      type: TARGET_TYPE_MAP[report.targetType],
      severity: report.severity,
      status: REPORT_STATUS_MAP[report.status],
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      reporter: { name: report.reporter?.name ?? 'Signalement anonyme', detail: report.reporter?.email ?? '—' },
      target,
      context: this.reportContext(report),
      description: report.details ?? report.reason,
      relatedCount: 0,
      assignedTo: null,
      notes,
      history,
    };
  }

  async decideReport(admin: AdminIdentity, id: string, dto: ReportDecisionDto) {
    const report = await this.prisma.moderationReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Signalement introuvable');

    const updated = await this.prisma.moderationReport.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.note?.trim() ? { resolutionNote: dto.note.trim() } : {}),
        ...(dto.status === ModerationStatus.RESOLVED || dto.status === ModerationStatus.REJECTED
          ? { resolvedById: admin.id, resolvedAt: new Date() }
          : {}),
      },
    });
    await this.log(admin, `report.${dto.status.toLowerCase()}`, 'report', id, report.targetLabel ?? report.reason, {
      targetType: report.targetType,
    });
    if (dto.note?.trim()) {
      await this.createNote(admin, { targetType: 'report', targetId: id, content: dto.note.trim() });
    }
    return { id: updated.id, status: REPORT_STATUS_MAP[updated.status] };
  }

  /* ================================================================
   * Platform Settings (doc 11)
   * ================================================================ */

  async getSettings() {
    const row = await this.prisma.platformSettings.findUnique({
      where: { id: 'global' },
      include: { updatedBy: { select: { name: true, email: true } } },
    });
    if (!row) throw new NotFoundException('Paramètres globaux non initialisés (relancer le seed)');
    return {
      settings: row.data,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy?.name ?? row.updatedBy?.email ?? 'Plateforme',
    };
  }

  async updateSettings(admin: AdminIdentity, dto: SettingsUpdateDto) {
    const row = await this.prisma.platformSettings.findUnique({ where: { id: 'global' } });
    if (!row) throw new NotFoundException('Paramètres globaux non initialisés (relancer le seed)');

    const merged = this.deepMerge(row.data, dto.data) as Prisma.InputJsonValue;
    const updated = await this.prisma.platformSettings.update({
      where: { id: 'global' },
      data: { data: merged, updatedById: admin.id },
    });
    await this.log(admin, 'settings.updated', 'settings', 'global', 'Paramètres globaux', {
      keys: Object.keys(dto.data),
    });
    return {
      settings: updated.data,
      updatedAt: updated.updatedAt.toISOString(),
      updatedBy: await this.adminName(admin.id),
    };
  }

  /* ================================================================
   * Notes internes + profil admin
   * ================================================================ */

  async createNote(admin: AdminIdentity, dto: CreateNoteDto) {
    const note = await this.prisma.adminNote.create({
      data: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        content: dto.content,
        adminId: admin.id,
      },
      include: { admin: { select: { name: true } } },
    });
    return {
      id: note.id,
      author: note.admin.name ?? 'Administrateur',
      content: note.content,
      at: note.createdAt.toISOString(),
    };
  }

  /** Profil de l'administrateur connecté (doc 02 §15) */
  async getProfile(adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const [logs, settings] = await Promise.all([
      this.prisma.adminLog.findMany({
        where: { adminId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      this.prisma.platformSettings.findUnique({ where: { id: 'global' } }),
    ]);

    const toggles = (settings?.data as { notifications?: { system?: { id: string; label: string; description: string; enabled: boolean }[] } } | undefined)
      ?.notifications?.system ?? [];

    return {
      user: {
        id: user.id,
        name: user.name ?? '',
        email: user.email,
        phone: user.phone ?? '',
        role: 'ADMIN',
        joinedAt: user.createdAt.toISOString(),
      },
      security: {
        twoFactorEnabled: false,
        passwordLastChangedAt: null,
      },
      sessions: [
        {
          id: 'current',
          label: 'Appareil actuel',
          location: 'Session en cours',
          lastActiveAt: new Date().toISOString(),
          current: true,
        },
      ],
      activity: logs.map((l) => ({
        id: l.id,
        action: this.actionLabel(l.action),
        at: l.createdAt.toISOString(),
      })),
      notificationPrefs: toggles.length > 0 ? toggles : [
        { id: 'critical_events', label: 'Événements critiques', description: 'Signalements, incidents, anomalies', enabled: true },
        { id: 'verification', label: 'Vérifications', description: 'Nouveaux dossiers en attente', enabled: true },
        { id: 'weekly_digest', label: 'Résumé hebdomadaire', description: 'Synthèse de la plateforme chaque lundi', enabled: false },
      ],
    };
  }

  /* ================================================================
   * Helpers internes
   * ================================================================ */

  private kpi(
    id: string,
    label: string,
    value: number | string,
    icon: 'store' | 'users' | 'orders' | 'wallet' | 'chart' | 'shield' | 'checkCircle' | 'alert',
    tone: 'gold' | 'blue' | 'green' | 'terracotta' | 'ivory',
    comparisonText?: string,
    action?: { label: string; href: string },
  ) {
    return {
      id,
      label,
      value: typeof value === 'number' ? new Intl.NumberFormat('fr-FR').format(value) : value,
      ...(comparisonText ? { comparisonText } : {}),
      ...(action ? { action } : {}),
      tone,
      icon,
    };
  }

  private range(period: AdminPeriod, previous = false) {
    const now = new Date();
    const day = 864e5;
    const daysMap: Record<AdminPeriod, number> = {
      '7_days': 7,
      '30_days': 30,
      '90_days': 90,
      this_year: 365,
    };
    const days = daysMap[period];
    const start = new Date(now.getTime() - (previous ? 2 * days : days) * day);
    return { start, days };
  }

  private priorityFor(createdAt: Date): 'low' | 'medium' | 'high' | 'critical' {
    const ageDays = (Date.now() - createdAt.getTime()) / 864e5;
    if (ageDays > 14) return 'high';
    if (ageDays > 7) return 'medium';
    return 'low';
  }

  private async computeMrr(): Promise<number> {
    const agg = await this.aggregateMrr();
    return Number(agg._sum.price ?? 0);
  }

  private aggregateMrr() {
    return this.prisma.subscription.aggregate({
      where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] } },
      _sum: { price: true },
    });
  }

  private async buildPerformanceSeries(
    period: AdminPeriod,
    users: { createdAt: Date }[],
    stores: { createdAt: Date }[],
    orders: { createdAt: Date; total: Prisma.Decimal; status: OrderStatus }[],
  ) {
    const keys = this.orderedKeys(period);
    const count = (items: { createdAt: Date }[]) => {
      const m = new Map<string, number>();
      for (const i of items) {
        const k = this.bucketKey(i.createdAt, period);
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    };
    const sum = (items: { createdAt: Date; total: Prisma.Decimal; status: OrderStatus }[]) => {
      const m = new Map<string, number>();
      for (const i of items) {
        if (i.status === OrderStatus.CANCELLED) continue;
        const k = this.bucketKey(i.createdAt, period);
        m.set(k, (m.get(k) ?? 0) + Number(i.total));
      }
      return m;
    };
    const toSeries = (m: Map<string, number>) =>
      keys.map((k) => ({ date: this.bucketLabel(k, period), value: Math.round(m.get(k) ?? 0) }));

    const usersMap = count(users);
    const storesMap = count(stores);
    const ordersMap = count(orders);
    const gmvMap = sum(orders);

    return {
      defaultMetric: 'gmv' as const,
      series: {
        orders: toSeries(ordersMap),
        gmv: toSeries(gmvMap),
        revenue: toSeries(gmvMap),
        users: toSeries(usersMap),
        stores: toSeries(storesMap),
      },
    };
  }

  private async buildActivity(start: Date): Promise<Array<{
    id: string;
    type: 'new_store' | 'store_verified' | 'store_suspended' | 'new_order' | 'subscription_upgraded' | 'report_submitted' | 'new_user' | 'new_merchant';
    actor: string;
    description: string;
    timestamp: string;
    resourceHref?: string;
  }>> {
    const [stores, orders, reports, logs, users] = await Promise.all([
      this.prisma.boutique.findMany({
        where: { createdAt: { gte: start } },
        include: { owner: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: start } },
        include: { boutique: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.moderationReport.findMany({
        where: { createdAt: { gte: start } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      this.prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: start }, role: { in: [Role.CLIENT, Role.VENDEUR] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const events: Array<{
      id: string;
      type: 'new_store' | 'store_verified' | 'store_suspended' | 'new_order' | 'subscription_upgraded' | 'report_submitted' | 'new_user' | 'new_merchant';
      actor: string;
      description: string;
      timestamp: string;
      resourceHref?: string;
    }> = [];
    const push = (
      e: {
        id: string;
        type: 'new_store' | 'store_verified' | 'store_suspended' | 'new_order' | 'subscription_upgraded' | 'report_submitted' | 'new_user' | 'new_merchant';
        actor: string;
        description: string;
        timestamp: string;
        resourceHref?: string;
      },
    ) => events.push(e);

    for (const s of stores) {
      push({
        id: `store-${s.id}`,
        type: 'new_store',
        actor: s.owner.name ?? s.name,
        description: `Boutique « ${s.name} » créée`,
        timestamp: s.createdAt.toISOString(),
        resourceHref: `/admin/stores/${s.id}`,
      });
    }
    for (const o of orders) {
      push({
        id: `order-${o.id}`,
        type: 'new_order',
        actor: o.customerName,
        description: `Commande #${o.reference} chez ${o.boutique.name}`,
        timestamp: o.createdAt.toISOString(),
        resourceHref: `/admin/orders/${o.id}`,
      });
    }
    for (const r of reports) {
      push({
        id: `report-${r.id}`,
        type: 'report_submitted',
        actor: r.reporterId ? 'Utilisateur' : 'Système',
        description: `Signalement : ${r.reason}`,
        timestamp: r.createdAt.toISOString(),
        resourceHref: `/admin/moderation/${r.id}`,
      });
    }
    for (const l of logs) {
      const type = l.action.startsWith('verification.approved')
        ? 'store_verified'
        : l.action.startsWith('store.suspend')
          ? 'store_suspended'
          : l.action.startsWith('subscription')
            ? 'subscription_upgraded'
            : null;
      if (!type) continue;
      push({
        id: `log-${l.id}`,
        type,
        actor: l.adminId ? await this.adminName(l.adminId) : 'Administrateur',
        description: this.actionLabel(l.action),
        timestamp: l.createdAt.toISOString(),
      });
    }
    for (const u of users) {
      push({
        id: `user-${u.id}`,
        type: u.role === Role.VENDEUR ? 'new_merchant' : 'new_user',
        actor: u.name ?? u.email,
        description: u.role === Role.VENDEUR ? 'Nouveau vendeur inscrit' : 'Nouveau client inscrit',
        timestamp: u.createdAt.toISOString(),
      });
    }

    return events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 12);
  }

  private async buildSnapshots() {
    const { start } = this.range('30_days');
    const [stores, users, orders, subscriptions, boutiquePlans] = await Promise.all([
      this.prisma.boutique.groupBy({ by: ['status'], _count: true }),
      this.prisma.user.groupBy({ by: ['role'], _count: true }),
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
      this.prisma.subscription.groupBy({ by: ['status'], _count: true }),
      this.prisma.boutique.findMany({ select: { plan: true } }),
    ]);

    const mrr = await this.computeMrr();
    const planCount = (slug: string) => boutiquePlans.filter((b) => b.plan === slug).length;

    return {
      stores: {
        active: this.countByStatus(stores, BoutiqueStatus.ACTIVE),
        pending: this.countByStatus(stores, BoutiqueStatus.PENDING),
        suspended: this.countByStatus(stores, BoutiqueStatus.SUSPENDED),
        blocked: this.countByStatus(stores, BoutiqueStatus.CLOSED),
        newStores: await this.prisma.boutique.count({ where: { createdAt: { gte: start } } }),
      },
      users: {
        total: await this.prisma.user.count(),
        clients: this.countByRole(users, Role.CLIENT),
        merchants: this.countByRole(users, Role.VENDEUR),
        newUsers: await this.prisma.user.count({ where: { createdAt: { gte: start } } }),
      },
      orders: {
        pending: this.countByOrderStatus(orders, OrderStatus.PENDING),
        processing:
          this.countByOrderStatus(orders, OrderStatus.PAID) +
          this.countByOrderStatus(orders, OrderStatus.SHIPPING),
        completed: this.countByOrderStatus(orders, OrderStatus.DELIVERED),
        cancelled: this.countByOrderStatus(orders, OrderStatus.CANCELLED),
      },
      subscriptions: {
        free: Math.max(0, (await this.prisma.boutique.count()) - subscriptions.length),
        trial: this.countBySubscriptionStatus(subscriptions, SubscriptionStatus.TRIAL),
        pro: planCount('pro'),
        business: planCount('business'),
        mrrFcfa: Math.round(mrr),
      },
    };
  }

  private countByStatus(groups: Array<{ status: BoutiqueStatus; _count: number }>, value: BoutiqueStatus) {
    return groups.find((g) => g.status === value)?._count ?? 0;
  }

  private countByRole(groups: Array<{ role: Role; _count: number }>, value: Role) {
    return groups.find((g) => g.role === value)?._count ?? 0;
  }

  private countByOrderStatus(groups: Array<{ status: OrderStatus; _count: number }>, value: OrderStatus) {
    return groups.find((g) => g.status === value)?._count ?? 0;
  }

  private countBySubscriptionStatus(
    groups: Array<{ status: SubscriptionStatus; _count: number }>,
    value: SubscriptionStatus,
  ) {
    return groups.find((g) => g.status === value)?._count ?? 0;
  }

  private async buildOrderVolume() {
    const { start } = this.range('30_days');
    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, total: true, status: true },
    });
    const keys = this.orderedKeys('30_days');
    const buckets = new Map(keys.map((k) => [k, { orders: 0, gmv: 0 }]));
    for (const o of orders) {
      const b = buckets.get(this.bucketKey(o.createdAt, '30_days'));
      if (!b) continue;
      b.orders += 1;
      if (o.status !== OrderStatus.CANCELLED) b.gmv += Number(o.total);
    }
    return keys.map((k) => ({
      label: this.bucketLabel(k, '30_days'),
      orders: buckets.get(k)?.orders ?? 0,
      gmvFcfa: Math.round(buckets.get(k)?.gmv ?? 0),
    }));
  }

  private async buildOrderAnomalies() {
    const threshold = new Date(Date.now() - 48 * 36e5);
    const pending = await this.prisma.order.findMany({
      where: { status: OrderStatus.PENDING, createdAt: { lt: threshold } },
      select: { id: true, reference: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });
    return pending.map((o) => ({
      id: `pending-${o.id}`,
      level: 'medium' as const,
      message: `Commande #${o.reference} : paiement en attente depuis plus de 48 h`,
      orderId: o.id,
    }));
  }

  private async buildRevenueSeries() {
    const subs = await this.prisma.subscription.findMany({
      select: { createdAt: true, price: true, status: true, cancelledAt: true, plan: { select: { name: true } } },
    });
    const months = this.monthKeys();
    const buckets = new Map(months.map((m) => [m, { mrr: 0, subscription: 0, newRevenue: 0, lostRevenue: 0 }]));
    for (const s of subs) {
      const created = this.monthKey(s.createdAt);
      const cancelled = s.cancelledAt ? this.monthKey(s.cancelledAt) : null;
      if (buckets.has(created)) {
        buckets.get(created)!.newRevenue += Number(s.price);
        buckets.get(created)!.subscription += Number(s.price);
      }
      if (cancelled && buckets.has(cancelled)) {
        buckets.get(cancelled)!.lostRevenue += Number(s.price);
      }
    }
    // MRR = prix des abonnements encore actifs, cumulé par mois
    let running = 0;
    const runningMap = new Map<string, number>();
    for (const s of subs) {
      if (s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.PAST_DUE) {
        running += Number(s.price);
      }
      runningMap.set(this.monthKey(s.createdAt), running);
    }
    return months.map((m) => {
      const b = buckets.get(m)!;
      return {
        label: this.monthLabel(m),
        mrrFcfa: Math.round(runningMap.get(m) ?? 0),
        subscriptionFcfa: Math.round(b.subscription),
        newRevenueFcfa: Math.round(b.newRevenue),
        lostRevenueFcfa: Math.round(b.lostRevenue),
      };
    });
  }

  private async buildSubscriptionEvents() {
    const logs = await this.prisma.adminLog.findMany({
      where: { targetType: 'subscription' },
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    const subs = await this.prisma.subscription.findMany({
      include: { boutique: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const events: Array<{
      id: string;
      type: 'upgrade' | 'downgrade' | 'cancel' | 'new_trial' | 'renewal';
      actor: string;
      description: string;
      timestamp: string;
      resourceHref?: string;
    }> = [];
    for (const l of logs) {
      events.push({
        id: l.id,
        type: l.action.includes('change_plan') ? 'upgrade' : 'renewal',
        actor: l.admin.name ?? 'Administrateur',
        description: this.actionLabel(l.action),
        timestamp: l.createdAt.toISOString(),
      });
    }
    for (const s of subs) {
      events.push({
        id: `trial-${s.id}`,
        type: 'new_trial',
        actor: s.boutique.name,
        description: `Essai démarré pour « ${s.boutique.name} »`,
        timestamp: s.createdAt.toISOString(),
        resourceHref: `/admin/subscriptions/${s.id}`,
      });
    }
    return events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 10);
  }

  private async buildGrowthSeries(
    period: AdminPeriod,
    users: { createdAt: Date }[],
    stores: { createdAt: Date }[],
    orders: { createdAt: Date }[],
  ) {
    const keys = this.orderedKeys(period);
    const map = (items: { createdAt: Date }[]) => {
      const m = new Map<string, number>();
      for (const i of items) {
        const k = this.bucketKey(i.createdAt, period);
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    };
    const u = map(users);
    const s = map(stores);
    const o = map(orders);
    return keys.map((k) => ({
      label: this.bucketLabel(k, period),
      users: u.get(k) ?? 0,
      stores: s.get(k) ?? 0,
      orders: o.get(k) ?? 0,
    }));
  }

  private buildFunnel(
    created: number,
    verified: number,
    published: number,
    withProducts: number,
    withOrders: number,
  ) {
    const conv = (from: number, to: number) => (from > 0 ? Math.round((to / from) * 1000) / 10 : 0);
    return [
      { id: 'created', label: 'Boutiques créées', count: created, conversionPercent: 100 },
      { id: 'verified', label: 'Vérifiées', count: verified, conversionPercent: conv(created, verified) },
      { id: 'published', label: 'Publiées', count: published, conversionPercent: conv(verified, published) },
      { id: 'products', label: 'Avec produits', count: withProducts, conversionPercent: conv(published, withProducts) },
      { id: 'orders', label: '1ʳᵉ commande', count: withOrders, conversionPercent: conv(withProducts, withOrders) },
    ];
  }

  private async buildAnalyticTrends(
    period: AdminPeriod,
    orders: { createdAt: Date; status: OrderStatus }[],
    subscriptions: { status: SubscriptionStatus }[],
    stores: { createdAt: Date; status: BoutiqueStatus; verificationStatus: VerificationStatus }[],
  ) {
    const { start } = this.range(period);
    const cancelled = orders.filter((o) => o.status === OrderStatus.CANCELLED).length;
    const cancelRate = orders.length > 0 ? Math.round((cancelled / orders.length) * 100) : 0;
    const pendingVerifications = stores.filter((s) => s.verificationStatus === VerificationStatus.PENDING).length;
    const trials = subscriptions.filter((s) => s.status === SubscriptionStatus.TRIAL).length;

    const trends: Array<{ id: string; label: string; value: string; positive: boolean; level: 'info' | 'attention' | 'critical' }> = [];
    if (cancelRate > 20) {
      trends.push({ id: 'cancel-rate', label: 'Taux d’annulation', value: `${cancelRate} %`, positive: false, level: 'attention' });
    } else {
      trends.push({ id: 'cancel-rate', label: 'Taux d’annulation', value: `${cancelRate} %`, positive: true, level: 'info' });
    }
    if (pendingVerifications > 0) {
      trends.push({ id: 'pending-verif', label: 'Dossiers en attente', value: String(pendingVerifications), positive: false, level: 'attention' });
    }
    if (trials > 0) {
      trends.push({ id: 'trials', label: 'Essais en cours', value: String(trials), positive: true, level: 'info' });
    }
    const newStores = stores.filter((s) => s.createdAt >= start).length;
    trends.push({ id: 'new-stores', label: 'Nouvelles boutiques (période)', value: String(newStores), positive: true, level: 'info' });
    return trends.slice(0, 4);
  }

  private async buildRiskStores() {
    const reports = await this.prisma.moderationReport.findMany({
      where: {
        status: { in: [ModerationStatus.NEW, ModerationStatus.IN_PROGRESS] },
        targetType: { in: ['BOUTIQUE', 'USER'] as ModerationTargetType[] },
      },
      select: { targetType: true, targetId: true, severity: true, createdAt: true },
    });
    const byStore = new Map<string, { reportsCount: number; warnings: number; severity: string }>();
    const storeIds: string[] = [];
    for (const r of reports) {
      const id = r.targetId;
      if (!storeIds.includes(id)) storeIds.push(id);
      const e = byStore.get(id) ?? { reportsCount: 0, warnings: 0, severity: 'low' };
      e.reportsCount += 1;
      if (r.severity === 'high' || r.severity === 'critical') e.warnings += 1;
      if (this.severityRank(r.severity) > this.severityRank(e.severity)) e.severity = r.severity;
      byStore.set(id, e);
    }
    const stores = await this.prisma.boutique.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true, updatedAt: true },
    });
    return [...byStore.entries()].map(([id, stats]) => {
      const store = stores.find((s) => s.id === id);
      return {
        storeId: id,
        storeName: store?.name ?? '—',
        reportsCount: stats.reportsCount,
        warnings: stats.warnings,
        previousSuspensions: 0,
        lastActivityAt: store?.updatedAt.toISOString() ?? new Date().toISOString(),
        riskLevel: stats.severity,
      };
    });
  }

  private async resolveReportTarget(targetType: ModerationTargetType, targetId: string) {
    if (targetType === 'BOUTIQUE') {
      const store = await this.prisma.boutique.findUnique({
        where: { id: targetId },
        select: { id: true, name: true, status: true },
      });
      return { kind: 'Boutique', label: store?.name ?? 'Boutique inconnue', href: store ? `/admin/stores/${store.id}` : '#' };
    }
    if (targetType === 'PRODUCT') {
      const product = await this.prisma.product.findUnique({
        where: { id: targetId },
        select: { id: true, name: true, boutiqueId: true },
      });
      return { kind: 'Produit', label: product?.name ?? 'Produit inconnu', href: product ? `/admin/stores/${product.boutiqueId}` : '#' };
    }
    if (targetType === 'ORDER') {
      const order = await this.prisma.order.findUnique({
        where: { id: targetId },
        select: { id: true, reference: true },
      });
      return { kind: 'Commande', label: order ? `#${order.reference}` : 'Commande inconnue', href: order ? `/admin/orders/${order.id}` : '#' };
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true, name: true, email: true } });
    return { kind: 'Utilisateur', label: user?.name ?? user?.email ?? 'Utilisateur inconnu', href: user ? `/admin/users/${user.id}` : '#' };
  }

  private reportContext(report: {
    reason: string;
    details: string | null;
    targetType: ModerationTargetType;
    targetId: string;
  }) {
    const ctx: Array<{ label: string; value: string }> = [
      { label: 'Motif', value: report.reason },
      { label: 'Cible', value: TARGET_TYPE_MAP[report.targetType] },
    ];
    if (report.details) ctx.push({ label: 'Détails', value: report.details });
    return ctx;
  }

  private toReportRow(r: {
    id: string;
    targetType: ModerationTargetType;
    severity: string;
    status: ModerationStatus;
    reason: string;
    reporter: { name: string | null; email: string } | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: r.id,
      type: TARGET_TYPE_MAP[r.targetType],
      severity: r.severity,
      status: REPORT_STATUS_MAP[r.status],
      targetLabel: r.reason,
      reporterName: r.reporter?.name ?? 'Anonyme',
      relatedCount: 0,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      assignedTo: null,
    };
  }

  private async adminNotes(targetType: string, targetId: string) {
    const notes = await this.prisma.adminNote.findMany({
      where: { targetType, targetId },
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return notes.map((n) => ({
      id: n.id,
      author: n.admin.name ?? 'Administrateur',
      content: n.content,
      at: n.createdAt.toISOString(),
    }));
  }

  private async adminHistory(targetType: string, targetId: string) {
    const logs = await this.prisma.adminLog.findMany({
      where: { targetType, targetId },
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return logs.map((l) => ({
      id: l.id,
      label: this.actionLabel(l.action),
      at: l.createdAt.toISOString(),
      by: l.admin.name ?? 'Administrateur',
    }));
  }

  private async storeActivity(boutiqueId: string) {
    const [orders, logs] = await Promise.all([
      this.prisma.order.findMany({
        where: { boutiqueId },
        select: { id: true, reference: true, createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.adminLog.findMany({
        where: { targetType: 'boutique', targetId: boutiqueId },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
    ]);
    const events: Array<{ id: string; label: string; at: string }> = [];
    for (const o of orders) {
      events.push({
        id: `order-${o.id}`,
        label: `Commande #${o.reference} — ${this.orderStatusLabel(o.status)}`,
        at: o.createdAt.toISOString(),
      });
    }
    for (const l of logs) {
      events.push({ id: `log-${l.id}`, label: this.actionLabel(l.action), at: l.createdAt.toISOString() });
    }
    return events.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
  }

  private userActivity(
    user: { id: string; createdAt: Date; updatedAt: Date },
    orders: { id: string; createdAt: Date; reference: string }[],
  ) {
    const events: Array<{ id: string; label: string; at: string }> = [
      { id: 'joined', label: 'Compte créé', at: user.createdAt.toISOString() },
    ];
    for (const o of orders.slice(0, 5)) {
      events.push({ id: `order-${o.id}`, label: `Commande #${o.reference} passée`, at: o.createdAt.toISOString() });
    }
    return events.sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  private async log(
    admin: AdminIdentity,
    action: string,
    targetType: string | undefined,
    targetId: string | undefined,
    targetLabel: string | undefined,
    details?: Prisma.InputJsonValue,
  ) {
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action,
        targetType,
        targetId,
        targetLabel,
        ...(details ? { details } : {}),
      },
    });
  }

  private async adminName(id: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { name: true, email: true },
    });
    return user?.name ?? user?.email ?? 'Administrateur';
  }

  private storeStatusFromQuery(status: string): BoutiqueStatus {
    const map: Record<string, BoutiqueStatus> = {
      ACTIVE: BoutiqueStatus.ACTIVE,
      PENDING: BoutiqueStatus.PENDING,
      SUSPENDED: BoutiqueStatus.SUSPENDED,
      BLOCKED: BoutiqueStatus.CLOSED,
    };
    const found = map[status.toUpperCase()];
    if (!found) {
      throw new BadRequestException(`Statut de boutique invalide : ${status}`);
    }
    return found;
  }

  private statusActionName(status: BoutiqueStatus): string {
    const map: Record<BoutiqueStatus, string> = {
      PENDING: 'pending',
      ACTIVE: 'activated',
      SUSPENDED: 'suspended',
      CLOSED: 'blocked',
    };
    return map[status];
  }

  /** Slug de plan (champ `boutique.plan`) → nom affichable (contrat frontend) */
  private planName(slug: string): string {
    const map: Record<string, string> = {
      starter: 'Starter',
      pro: 'Pro',
      business: 'Business',
    };
    return map[slug] ?? (slug.charAt(0).toUpperCase() + slug.slice(1));
  }

  private orderStatusLabel(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      PENDING: 'En attente de paiement',
      PAID: 'Payée',
      WHATSAPP_CONFIRMED: 'Confirmée',
      SHIPPING: 'Expédiée',
      DELIVERED: 'Livrée',
      CANCELLED: 'Annulée',
    };
    return map[status];
  }

  private actionLabel(action: string): string {
    const map: Record<string, string> = {
      'verification.approved': 'Vérification approuvée',
      'verification.rejected': 'Vérification rejetée',
      'store.activated': 'Boutique activée',
      'store.suspended': 'Boutique suspendue',
      'store.blocked': 'Boutique bloquée',
      'store.pending': 'Boutique remise en attente',
      'user.blocked': 'Utilisateur bloqué',
      'user.unblocked': 'Utilisateur débloqué',
      'report.new': 'Signalement pris en charge',
      'report.in_progress': 'Signalement en cours de traitement',
      'report.resolved': 'Signalement résolu',
      'report.rejected': 'Signalement rejeté',
      'subscription.change_plan': 'Changement de plan',
      'settings.updated': 'Paramètres globaux modifiés',
      'plan.enabled': 'Plan activé',
      'plan.disabled': 'Plan désactivé',
    };
    return map[action] ?? action.replace(/\./g, ' ');
  }

  private actionSeverity(action: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    if (action.includes('suspended') || action.includes('blocked') || action.includes('rejected')) return 'high';
    if (action.includes('resolved') || action.includes('approved') || action.includes('activated')) return 'info';
    return 'info';
  }

  private reportReason(reason: string): string {
    return reason.length > 40 ? `${reason.slice(0, 40)}…` : reason;
  }

  private severityRank(severity: string): number {
    return { low: 1, medium: 2, high: 3, critical: 4 }[severity] ?? 1;
  }

  private orderedKeys(period: AdminPeriod): string[] {
    const { start } = this.range(period);
    const keys: string[] = [];
    if (period === 'this_year') {
      const currentMonth = new Date().getMonth();
      for (let m = 0; m <= currentMonth; m++) {
        keys.push(`${new Date().getFullYear()}-${String(m + 1).padStart(2, '0')}`);
      }
    } else {
      const cursor = new Date(start);
      const today = new Date();
      while (cursor <= today) {
        keys.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return keys;
  }

  private bucketKey(date: Date, period: AdminPeriod): string {
    if (period === 'this_year') return this.monthKey(date);
    return date.toISOString().slice(0, 10);
  }

  private bucketLabel(key: string, period: AdminPeriod): string {
    if (period === 'this_year') return this.monthLabel(key);
    const [, m, d] = key.split('-');
    return `${d}/${m}`;
  }

  private monthKeys(): string[] {
    const now = new Date();
    const keys: string[] = [];
    const currentMonth = now.getMonth();
    for (let m = 0; m <= currentMonth; m++) {
      keys.push(`${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`);
    }
    return keys;
  }

  private monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private monthLabel(key: string): string {
    const [, m] = key.split('-');
    const labels = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    return labels[Number(m) - 1] ?? key;
  }

  private deepMerge(base: unknown, patch: unknown): unknown {
    if (Array.isArray(base) || Array.isArray(patch)) return patch;
    if (patch && typeof patch === 'object' && base && typeof base === 'object') {
      const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
      for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
        out[k] = this.deepMerge(out[k], v);
      }
      return out;
    }
    return patch;
  }
}
