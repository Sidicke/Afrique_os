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
    const [monthOrders, prevMonthOrders, totalOrders, recentOrders, bestSellers] =
      await this.prisma.$transaction([
        this.prisma.order.findMany({
          where: { boutiqueId, createdAt: { gte: monthStart } },
          select: { total: true, status: true, createdAt: true },
        }),
        this.prisma.order.findMany({
          where: { boutiqueId, createdAt: { gte: prevMonthStart, lt: monthStart } },
          select: { total: true, status: true, createdAt: true },
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
      ]);

    const revenue = (orders: typeof monthOrders) =>
      orders
        .filter((o) => o.status !== OrderStatus.CANCELLED)
        .reduce((sum, o) => sum + Number(o.total), 0);

    const monthRevenue = revenue(monthOrders);
    const prevRevenue = revenue(prevMonthOrders);
    const changePercent =
      prevRevenue > 0 ? ((monthRevenue - prevRevenue) / prevRevenue) * 100 : 100;

    return {
      kpis: {
        revenue: {
          title: "Chiffre d'Affaires",
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
          changePercent: 0,
          isPositive: true,
          comparisonText: 'ce mois-ci',
          iconName: 'orders',
        },
        visitors: {
          title: 'Visiteurs',
          value: '—',
          rawNumber: 0,
          changePercent: 0,
          isPositive: true,
          comparisonText: 'bientôt disponible',
          iconName: 'visitors',
        },
        conversionRate: {
          title: 'Taux de conversion',
          value: '—',
          rawNumber: 0,
          changePercent: 0,
          isPositive: true,
          comparisonText: 'bientôt disponible',
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

    const orders = await this.prisma.order.findMany({
      where: { boutiqueId, createdAt: { gte: start } },
      select: { total: true, status: true, createdAt: true },
    });

    const active = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const revenue = active.reduce((sum, o) => sum + Number(o.total), 0);

    return {
      kpis: {
        revenue: {
          title: "Chiffre d'Affaires",
          value: `${this.formatFcfa(revenue)} FCFA`,
          rawNumber: revenue,
          changePercent: 0,
          isPositive: true,
          comparisonText: `sur ${days} jours`,
          iconName: 'revenue',
        },
        orders: {
          title: 'Commandes',
          value: String(orders.length),
          rawNumber: orders.length,
          changePercent: 0,
          isPositive: true,
          comparisonText: `sur ${days} jours`,
          iconName: 'orders',
        },
        avgBasket: {
          title: 'Panier moyen',
          value: `${this.formatFcfa(orders.length ? revenue / orders.length : 0)} FCFA`,
          rawNumber: orders.length ? Math.round(revenue / orders.length) : 0,
          changePercent: 0,
          isPositive: true,
          comparisonText: `sur ${days} jours`,
          iconName: 'basket',
        },
        conversion: {
          title: 'Conversion',
          value: '—',
          rawNumber: 0,
          changePercent: 0,
          isPositive: true,
          comparisonText: 'bientôt disponible',
          iconName: 'conversion',
        },
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
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const byPhone = new Map<
      string,
      { name: string; phone: string; ordersCount: number; totalSpentFcfa: number; lastOrderDate: Date }
    >();
    for (const o of orders) {
      const key = o.customerPhone || o.customerName;
      const existing = byPhone.get(key);
      if (existing) {
        existing.ordersCount += 1;
        existing.totalSpentFcfa += Number(o.total);
        if (o.createdAt > existing.lastOrderDate) existing.lastOrderDate = o.createdAt;
      } else {
        byPhone.set(key, {
          name: o.customerName,
          phone: o.customerPhone,
          ordersCount: 1,
          totalSpentFcfa: Number(o.total),
          lastOrderDate: o.createdAt,
        });
      }
    }

    return [...byPhone.values()]
      .map((c) => ({
        id: c.phone,
        name: c.name,
        phone: c.phone,
        city: '',
        ordersCount: c.ordersCount,
        totalSpentFcfa: c.totalSpentFcfa,
        segment: this.segment(c.ordersCount, c.totalSpentFcfa),
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
}
