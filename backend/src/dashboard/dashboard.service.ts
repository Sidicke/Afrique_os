import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type StatsPeriod = '7_days' | '30_days' | 'this_year';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vue d'ensemble du dashboard vendeur (KPIs du mois) */
  async getOverview(boutiqueId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Séries du graphique calculées en parallèle des commandes (Promise résolue)
    const revenueChartPromise = this.buildRevenueChart(
      boutiqueId,
      monthStart,
      prevMonthStart,
    );

    // Commandes du mois courant vs mois précédent (hors annulées pour le CA)
    const [monthOrders, prevMonthOrders, totalOrders, recentOrders, bestSellers, boutique] =
      await this.prisma.$transaction([
        this.prisma.order.findMany({
          where: { boutiqueId, createdAt: { gte: monthStart } },
          select: { total: true, status: true, createdAt: true, customerPhone: true, customerName: true },
        }),
        this.prisma.order.findMany({
          where: { boutiqueId, createdAt: { gte: prevMonthStart, lt: monthStart } },
          select: { total: true, status: true, createdAt: true, customerPhone: true, customerName: true },
        }),
        this.prisma.order.count({ where: { boutiqueId } }),
        this.prisma.order.findMany({
          where: { boutiqueId },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
        this.prisma.orderItem.groupBy({
          by: ['productId', 'productName'],
          where: { order: { boutiqueId, status: { not: OrderStatus.CANCELLED } } },
          _sum: { quantity: true, unitPrice: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        this.prisma.boutique.findUnique({
          where: { id: boutiqueId },
          select: { monthlyGoalFcfa: true },
        }),
      ]);

    const revenue = (orders: typeof monthOrders) =>
      orders
        .filter((o) => o.status !== OrderStatus.CANCELLED)
        .reduce((sum, o) => sum + Number(o.total), 0);

    const monthRevenue = revenue(monthOrders);
    const prevRevenue = revenue(prevMonthOrders);
    const changePercent =
      prevRevenue > 0 ? ((monthRevenue - prevRevenue) / prevRevenue) * 100 : (monthRevenue > 0 ? 100 : 0);

    const ordersChangePercent = prevMonthOrders.length > 0
      ? ((monthOrders.length - prevMonthOrders.length) / prevMonthOrders.length) * 100
      : (monthOrders.length > 0 ? 100 : 0);

    const completedMonthOrders = monthOrders.filter(
      (o) => o.status !== OrderStatus.CANCELLED,
    );
    const prevCompletedMonthOrders = prevMonthOrders.filter(
      (o) => o.status !== OrderStatus.CANCELLED,
    );

    const uniqueBuyers = new Set(
      completedMonthOrders.map((o) => o.customerPhone || o.customerName),
    ).size;
    const prevUniqueBuyers = new Set(
      prevCompletedMonthOrders.map((o) => o.customerPhone || o.customerName),
    ).size;
    const buyerChange =
      prevUniqueBuyers > 0
        ? ((uniqueBuyers - prevUniqueBuyers) / prevUniqueBuyers) * 100
        : uniqueBuyers > 0
          ? 100
          : 0;

    const conversionRateVal =
      monthOrders.length > 0
        ? (completedMonthOrders.length / monthOrders.length) * 100
        : 0;
    const prevConvVal =
      prevMonthOrders.length > 0
        ? (prevCompletedMonthOrders.length / prevMonthOrders.length) * 100
        : 0;
    const convChange =
      prevConvVal > 0
        ? ((conversionRateVal - prevConvVal) / prevConvVal) * 100
        : conversionRateVal > 0
          ? 100
          : 0;

    return {
      monthlyGoalFcfa: Number(boutique?.monthlyGoalFcfa ?? 0),
      kpis: {
        revenue: {
          title: "Chiffre d'affaires",
          value: `${this.formatFcfa(monthRevenue)} FCFA`,
          rawNumber: monthRevenue,
          changePercent: Math.round(changePercent * 10) / 10,
          isPositive: changePercent >= 0,
          comparisonText: 'vs mois dernier',
          iconName: 'revenue',
        },
        orders: {
          title: 'Commandes',
          value: String(monthOrders.length),
          rawNumber: monthOrders.length,
          changePercent: Math.round(ordersChangePercent * 10) / 10,
          isPositive: ordersChangePercent >= 0,
          comparisonText: 'vs mois dernier',
          iconName: 'orders',
        },
        visitors: {
          title: 'Clients actifs',
          value: String(uniqueBuyers),
          rawNumber: uniqueBuyers,
          changePercent: Math.round(buyerChange * 10) / 10,
          isPositive: buyerChange >= 0,
          comparisonText: 'clients uniques ce mois',
          iconName: 'visitors',
        },
        conversionRate: {
          title: 'Taux de conversion',
          value: monthOrders.length > 0 ? `${Math.round(conversionRateVal * 10) / 10}%` : '0%',
          rawNumber: Math.round(conversionRateVal * 10) / 10,
          changePercent: Math.round(convChange * 10) / 10,
          isPositive: convChange >= 0,
          comparisonText: monthOrders.length > 0 ? 'commandes abouties' : 'aucune commande',
          iconName: 'conversion',
        },
      },
      revenueChart: await revenueChartPromise,
      repeatCustomerRate: 0,
      customerSegments: { retailersPercent: 0, distributorsPercent: 0, wholesalersPercent: 0 },
      activeDays: this.computeActiveDays(monthOrders),
      bestSellers: bestSellers.map((b) => ({
        id: b.productId ?? '',
        name: b.productName,
        salesCount: b._sum?.quantity ?? 0,
        revenueFcfa: Number(b._sum?.unitPrice ?? 0) * (b._sum?.quantity ?? 0),
      })),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: `#${o.reference}`,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        status: o.status.toLowerCase(),
        paymentMethod: o.paymentMethod.toLowerCase(),
        totalPriceFcfa: Number(o.total),
        cancellationReason: o.cancellationReason ?? undefined,
        createdAt: o.createdAt.toISOString(),
      })),
      totalOrders: totalOrders,
    };
  }

  /** Statistiques paramétrables par période */
  async getStats(boutiqueId: string, period: StatsPeriod) {
    const { start, days } = this.periodRange(period);
    const prevStart = new Date(start.getTime() - days * 24 * 3600 * 1000);

    const [orders, prevOrders] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { boutiqueId, createdAt: { gte: start } },
        select: { total: true, status: true, createdAt: true, customerPhone: true, customerName: true },
      }),
      this.prisma.order.findMany({
        where: { boutiqueId, createdAt: { gte: prevStart, lt: start } },
        select: { total: true, status: true, createdAt: true, customerPhone: true, customerName: true },
      }),
    ]);

    const getRevenue = (ords: typeof orders) =>
      ords.filter((o) => o.status !== OrderStatus.CANCELLED).reduce((sum, o) => sum + Number(o.total), 0);

    const revenue = getRevenue(orders);
    const prevRevenue = getRevenue(prevOrders);

    const revChangePercent = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : (revenue > 0 ? 100 : 0);
    const ordChangePercent = prevOrders.length > 0 ? ((orders.length - prevOrders.length) / prevOrders.length) * 100 : (orders.length > 0 ? 100 : 0);

    const revKpi = {
      title: "Chiffre d'Affaires",
      value: `${this.formatFcfa(revenue)} FCFA`,
      rawNumber: revenue,
      changePercent: Math.round(revChangePercent * 10) / 10,
      isPositive: revChangePercent >= 0,
      comparisonText: `vs période prec. (${days} j)`,
      iconName: 'revenue',
      type: 'metric' as const,
    };

    const ordKpi = {
      title: 'Commandes',
      value: String(orders.length),
      rawNumber: orders.length,
      changePercent: Math.round(ordChangePercent * 10) / 10,
      isPositive: ordChangePercent >= 0,
      comparisonText: `vs période prec. (${days} j)`,
      iconName: 'orders',
      type: 'metric' as const,
    };

    const completedOrds = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const uniqueClientsCount = new Set(
      completedOrds.map((o) => o.customerPhone || o.customerName),
    ).size;
    const convPct =
      orders.length > 0
        ? Math.round((completedOrds.length / orders.length) * 1000) / 10
        : 0;

    const visKpi = {
      title: 'Clients actifs',
      value: String(uniqueClientsCount),
      rawNumber: uniqueClientsCount,
      changePercent: 0,
      isPositive: true,
      comparisonText: 'sur cette période',
      iconName: 'visitors',
      type: 'metric' as const,
    };
    const convKpi = {
      title: 'Conversion',
      value: `${convPct}%`,
      rawNumber: convPct,
      changePercent: 0,
      isPositive: true,
      comparisonText: 'commandes abouties',
      iconName: 'conversion',
      type: 'metric' as const,
    };

    // Contrôle du plan (Business requis pour les stats avancées)
    const boutique = await this.prisma.boutique.findUnique({
      where: { id: boutiqueId },
      select: { plan: true, ownerId: true }
    });
    let isBusiness = false;
    if (boutique) {
      if (['business', 'enterprise'].includes(boutique.plan)) {
        isBusiness = true;
      } else {
        const ownerBoutiques = await this.prisma.boutique.findMany({
          where: { ownerId: boutique.ownerId },
          select: { plan: true },
        });
        isBusiness = ownerBoutiques.some(b => ['business', 'enterprise'].includes(b.plan));
      }
    }

    if (!isBusiness) {
      return {
        kpis: { revenue: revKpi, orders: ordKpi, visitors: visKpi, conversion: convKpi },
        chart: [],
        repeatCustomerRatio: 0,
        segments: [],
        bestSellers: [],
        activeDays: [],
        requiresBusiness: true,
      };
    }

    const completedOrders = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const prevCompletedOrders = prevOrders.filter((o) => o.status !== OrderStatus.CANCELLED);

    const avgBasket = completedOrders.length ? revenue / completedOrders.length : 0;
    const prevAvgBasket = prevCompletedOrders.length ? prevRevenue / prevCompletedOrders.length : 0;
    const avgBasketChange = prevAvgBasket > 0 ? ((avgBasket - prevAvgBasket) / prevAvgBasket) * 100 : (avgBasket > 0 ? 100 : 0);

    // --- Analytics Avancées ---
    return {
      kpis: {
        revenue: revKpi,
        orders: ordKpi,
        avgBasket: {
          title: 'Panier moyen',
          value: `${this.formatFcfa(Math.round(avgBasket))} FCFA`,
          rawNumber: Math.round(avgBasket),
          changePercent: Math.round(avgBasketChange * 10) / 10,
          isPositive: avgBasketChange >= 0,
          comparisonText: `sur ${days} jours`,
          iconName: 'basket',
        },
        conversion: convKpi,
      },
      revenueChart: await this.buildSeries(boutiqueId, start),
      repeatCustomerRate: 0,
      customerSegments: { retailersPercent: 0, distributorsPercent: 0, wholesalersPercent: 0 },
      activeDays: this.computeActiveDays(orders),
    };
  }

  /** Clients dérivés des commandes (nom + téléphone) */
  async getCustomers(boutiqueId: string) {
    const orders = await this.prisma.order.findMany({
      where: { boutiqueId },
      select: {
        customerName: true,
        customerPhone: true,
        city: true,
        total: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const byPhone = new Map<
      string,
      { name: string; phone: string; city: string; ordersCount: number; totalSpentFcfa: number; lastOrderDate: Date }
    >();
    for (const o of orders) {
      const key = o.customerPhone || o.customerName;
      const isCompleted = o.status !== OrderStatus.CANCELLED;
      const existing = byPhone.get(key);
      if (existing) {
        if (isCompleted) {
          existing.ordersCount += 1;
          existing.totalSpentFcfa += Number(o.total);
        }
        if (!existing.city && o.city) existing.city = o.city;
        if (o.createdAt > existing.lastOrderDate) existing.lastOrderDate = o.createdAt;
      } else {
        byPhone.set(key, {
          name: o.customerName,
          phone: o.customerPhone || '',
          city: o.city || '',
          ordersCount: isCompleted ? 1 : 0,
          totalSpentFcfa: isCompleted ? Number(o.total) : 0,
          lastOrderDate: o.createdAt,
        });
      }
    }

    // Contrôle du plan (Business requis pour la segmentation client avancée)
    const boutique = await this.prisma.boutique.findUnique({
      where: { id: boutiqueId },
      select: { plan: true, ownerId: true }
    });
    let isBusiness = false;
    if (boutique) {
      if (['business', 'enterprise'].includes(boutique.plan)) {
        isBusiness = true;
      } else {
        const ownerBoutiques = await this.prisma.boutique.findMany({
          where: { ownerId: boutique.ownerId },
          select: { plan: true },
        });
        isBusiness = ownerBoutiques.some(b => ['business', 'enterprise'].includes(b.plan));
      }
    }

    return [...byPhone.values()]
      .map((c) => ({
        id: c.phone,
        name: c.name,
        phone: c.phone,
        city: c.city,
        ordersCount: c.ordersCount,
        totalSpentFcfa: c.totalSpentFcfa,
        segment: isBusiness ? this.segment(c.ordersCount, c.totalSpentFcfa) : '🔒 Business',
        lastOrderDate: c.lastOrderDate.toISOString().slice(0, 10),
      }))
      .sort((a, b) => b.totalSpentFcfa - a.totalSpentFcfa);
  }

  // ===== Helpers =====

  private periodRange(period: StatsPeriod) {
    const now = new Date();
    if (period === '7_days') {
      return { start: new Date(now.getTime() - 7 * 24 * 3600 * 1000), days: 7 };
    }
    if (period === '30_days') {
      return { start: new Date(now.getTime() - 30 * 24 * 3600 * 1000), days: 30 };
    }
    return { start: new Date(now.getFullYear(), 0, 1), days: 365 };
  }

  private async buildRevenueChart(
    boutiqueId: string,
    monthStart: Date,
    prevMonthStart: Date,
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        boutiqueId,
        status: { not: OrderStatus.CANCELLED },
        createdAt: { gte: prevMonthStart },
      },
      select: { total: true, createdAt: true },
    });
    return this.chartSeries(orders, prevMonthStart, 2);
  }

  private async buildSeries(boutiqueId: string, start: Date) {
    const orders = await this.prisma.order.findMany({
      where: { boutiqueId, status: { not: OrderStatus.CANCELLED }, createdAt: { gte: start } },
      select: { total: true, createdAt: true },
    });
    return this.chartSeries(orders, start, 1);
  }

  /** Série [date, valeur] — bucket par jour */
  private chartSeries(
    orders: { total: Prisma.Decimal; createdAt: Date }[],
    _start: Date,
    _monthCount: number,
  ) {
    const buckets = new Map<string, number>();
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      buckets.set(day, (buckets.get(day) ?? 0) + Number(o.total));
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, value]) => ({
        date,
        currentPeriodFcfa: value,
        previousPeriodFcfa: 0,
      }));
  }

  /**
   * Répartition des commandes par jour de la semaine (Lun → Dim), avec le
   * jour de pointe identifié — alimente le graphique « Activité hebdo ».
   */
  private computeActiveDays(orders: { createdAt: Date }[]) {
    const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;
    // getDay() : 0 = dimanche → index dans DAYS
    const dayIndex = (d: Date) => [6, 0, 1, 2, 3, 4, 5][d.getDay()];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const o of orders) {
      counts[dayIndex(o.createdAt)] += 1;
    }
    const max = Math.max(...counts, 1);
    return DAYS.map((day, i) => ({
      day,
      ordersCount: counts[i],
      isPeakDay: counts[i] === max && counts[i] > 0,
    }));
  }

  private segment(ordersCount: number, totalSpent: number): string {
    if (ordersCount >= 8 || totalSpent >= 500000) return 'VIP';
    if (ordersCount >= 4) return 'Fidèle';
    if (ordersCount >= 2) return 'Régulier';
    return 'Nouveau';
  }

  private formatFcfa(value: number): string {
    return value.toLocaleString('fr-FR');
  }

  /**
   * Analytics multi-boutiques consolidés pour l'ensemble des enseignes du vendeur.
   * 100% réel, calculé à partir de la base de données.
   */
  async getMultiStoreAnalytics(ownerId: string, period: StatsPeriod) {
    const boutiques = await this.prisma.boutique.findMany({
      where: { ownerId },
      select: { id: true, name: true, slug: true, plan: true },
      orderBy: { createdAt: 'asc' },
    });

    if (boutiques.length === 0) {
      return {
        kpis: {
          totalRevenue: 0,
          totalOrders: 0,
          avgBasket: 0,
          revenueGrowth: 0,
          ordersGrowth: 0,
          avgBasketGrowth: 0,
        },
        storeRevenues: [],
        topProducts: [],
      };
    }

    const { start, days } = this.periodRange(period);
    const prevStart = new Date(start.getTime() - days * 24 * 3600 * 1000);
    const boutiqueIds = boutiques.map((b) => b.id);

    const [currentOrders, prevOrders, topItems] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          boutiqueId: { in: boutiqueIds },
          createdAt: { gte: start },
        },
        select: {
          id: true,
          boutiqueId: true,
          total: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: {
          boutiqueId: { in: boutiqueIds },
          createdAt: { gte: prevStart, lt: start },
        },
        select: {
          id: true,
          boutiqueId: true,
          total: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          order: {
            boutiqueId: { in: boutiqueIds },
            status: { not: OrderStatus.CANCELLED },
            createdAt: { gte: start },
          },
        },
        _sum: { quantity: true, unitPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    // Associer les boutiques aux produits les plus vendus
    const productIds = topItems.map((t) => t.productId).filter((id): id is string => Boolean(id));
    const productsInfo = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        images: true,
        boutique: { select: { id: true, name: true } },
      },
    });
    const productMap = new Map(productsInfo.map((p) => [p.id, p]));

    const topProducts = topItems.map((item, idx) => {
      const pInfo = item.productId ? productMap.get(item.productId) : null;
      const units = item._sum?.quantity ?? 0;
      const revenue = Number(item._sum?.unitPrice ?? 0) * units;
      return {
        id: item.productId || String(idx + 1),
        name: item.productName,
        storeName: pInfo?.boutique?.name || 'Boutique',
        revenue,
        units,
        growth: 0,
        image: pInfo?.images?.[0] || undefined,
      };
    });

    const colors = ['bg-blue-700', 'bg-gold-strong', 'bg-emerald-600', 'bg-purple-600', 'bg-indigo-600'];
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalPrevRevenue = 0;
    let totalPrevOrders = 0;

    const storeRevenues = boutiques.map((b, i) => {
      const bOrders = currentOrders.filter(
        (o) => o.boutiqueId === b.id && o.status !== OrderStatus.CANCELLED,
      );
      const bPrevOrders = prevOrders.filter(
        (o) => o.boutiqueId === b.id && o.status !== OrderStatus.CANCELLED,
      );

      const bRev = bOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const bPrevRev = bPrevOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const growth = bPrevRev > 0 ? ((bRev - bPrevRev) / bPrevRev) * 100 : bRev > 0 ? 100 : 0;

      totalRevenue += bRev;
      totalOrders += bOrders.length;
      totalPrevRevenue += bPrevRev;
      totalPrevOrders += bPrevOrders.length;

      return {
        storeId: b.id,
        storeName: b.name,
        revenue: bRev,
        orders: bOrders.length,
        growth: Math.round(growth * 10) / 10,
        color: colors[i % colors.length],
      };
    });

    const avgBasket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const prevAvgBasket = totalPrevOrders > 0 ? Math.round(totalPrevRevenue / totalPrevOrders) : 0;

    const revGrowth =
      totalPrevRevenue > 0
        ? ((totalRevenue - totalPrevRevenue) / totalPrevRevenue) * 100
        : totalRevenue > 0
          ? 100
          : 0;
    const ordGrowth =
      totalPrevOrders > 0
        ? ((totalOrders - totalPrevOrders) / totalPrevOrders) * 100
        : totalOrders > 0
          ? 100
          : 0;
    const basketGrowth =
      prevAvgBasket > 0
        ? ((avgBasket - prevAvgBasket) / prevAvgBasket) * 100
        : avgBasket > 0
          ? 100
          : 0;

    const initiatedOrders = currentOrders.length;
    const confirmedOrders = currentOrders.filter(
      (o) => o.status !== OrderStatus.CANCELLED,
    ).length;
    const deliveredOrders = currentOrders.filter(
      (o) => o.status === OrderStatus.DELIVERED,
    ).length;
    const cancelledOrders = currentOrders.filter(
      (o) => o.status === OrderStatus.CANCELLED,
    ).length;
    const conversionRate =
      initiatedOrders > 0
        ? Math.round((confirmedOrders / initiatedOrders) * 1000) / 10
        : 0;

    return {
      kpis: {
        totalRevenue,
        totalOrders,
        avgBasket,
        revenueGrowth: Math.round(revGrowth * 10) / 10,
        ordersGrowth: Math.round(ordGrowth * 10) / 10,
        avgBasketGrowth: Math.round(basketGrowth * 10) / 10,
      },
      storeRevenues,
      topProducts,
      funnel: {
        initiatedOrders,
        confirmedOrders,
        deliveredOrders,
        cancelledOrders,
        conversionRate,
      },
    };
  }
}
