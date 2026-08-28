import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** Profil renvoyé au frontend dashboard (MerchantProfile) */
export interface MerchantProfile {
  pointsBalance?: number;
  referralCode?: string;
  name: string;
  shopName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  avatarInitials: string;
  avatarUrl?: string;
  plan: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<MerchantProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        defaultAddress: true,
        defaultCity: true,
        defaultPaymentMethod: true,
        pointsBalance: true,
        referralCode: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const boutique = await this.prisma.boutique.findFirst({
      where: { ownerId: userId },
      select: {
        name: true,
        city: true,
        country: true,
        plan: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const name = user.name ?? '';
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || 'B';

    return {
      name,
      shopName: boutique?.name ?? '',
      email: user.email,
      phone: user.phone ?? '',
      city: boutique?.city ?? '',
      country: boutique?.country ?? '',
      avatarInitials: initials,
      avatarUrl: user.avatarUrl || undefined,
      plan: boutique?.plan ?? 'starter',
      pointsBalance: user.pointsBalance,
      referralCode: user.referralCode || undefined,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, any> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.defaultAddress !== undefined) data.defaultAddress = dto.defaultAddress;
    if (dto.defaultCity !== undefined) data.defaultCity = dto.defaultCity;
    if (dto.defaultPaymentMethod !== undefined) data.defaultPaymentMethod = dto.defaultPaymentMethod;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase().trim();
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Un compte existe déjà avec cet email');
      }
      data.email = email;
    }
    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getProfile(userId);
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async getAffiliationDetails(userId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        referees: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        pointTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (!user.referralCode) {
      let code = this.generateReferralCode();
      let exists = await this.prisma.user.findUnique({ where: { referralCode: code } });
      while (exists) {
        code = this.generateReferralCode();
        exists = await this.prisma.user.findUnique({ where: { referralCode: code } });
      }
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        include: {
          referees: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          pointTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });
    }

    const orderIds = user.pointTransactions
      .filter((t) => t.reason === 'CASHBACK_REFERRAL' && t.orderId)
      .map((t) => t.orderId as string);

    let ordersWithUsers: Array<{ id: string; userId: string | null }> = [];
    if (orderIds.length > 0) {
      ordersWithUsers = await this.prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, userId: true },
      });
    }

    const orderToUserMap = new Map<string, string>();
    for (const ord of ordersWithUsers) {
      if (ord.userId) orderToUserMap.set(ord.id, ord.userId);
    }

    const pointsByRefereeId = new Map<string, number>();
    for (const t of user.pointTransactions) {
      if (t.reason === 'CASHBACK_REFERRAL' && t.orderId) {
        const refUserId = orderToUserMap.get(t.orderId);
        if (refUserId) {
          pointsByRefereeId.set(refUserId, (pointsByRefereeId.get(refUserId) ?? 0) + t.amount);
        }
      }
    }

    const referees = user.referees.map((r) => {
      const parts = r.email.split('@');
      const maskedName = parts[0].length > 2 ? parts[0].substring(0, 2) + '***' : parts[0] + '***';
      const maskedEmail = parts.length > 1 ? `${maskedName}@${parts[1]}` : r.email;

      return {
        id: r.id,
        name: r.name || 'Client invité',
        email: maskedEmail,
        createdAt: r.createdAt,
        pointsGenerated: pointsByRefereeId.get(r.id) ?? 0,
      };
    });

    const totalEarnedReferral = user.pointTransactions
      .filter((t) => t.reason === 'CASHBACK_REFERRAL')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalEarnedCashback = user.pointTransactions
      .filter((t) => t.reason === 'CASHBACK_PURCHASE')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSpentPoints = Math.abs(
      user.pointTransactions
        .filter((t) => t.amount < 0 || t.reason === 'SPENT_ON_ORDER')
        .reduce((sum, t) => sum + t.amount, 0),
    );

    return {
      pointsBalance: user.pointsBalance,
      referralCode: user.referralCode,
      totalEarnedReferral,
      totalEarnedCashback,
      totalSpentPoints,
      refereesCount: user.referees.length,
      referees,
      transactions: user.pointTransactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        reason: t.reason,
        createdAt: t.createdAt,
      })),
    };
  }
}
