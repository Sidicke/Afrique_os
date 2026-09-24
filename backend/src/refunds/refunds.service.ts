import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefundsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(clientId: string, orderId: string, reason: string, description?: string, evidenceUrl?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId: clientId },
      select: { id: true, status: true, boutiqueId: true },
    });

    if (!order) throw new NotFoundException('Commande introuvable.');
    if (order.status !== 'PAID' && order.status !== 'DELIVERED') {
      throw new BadRequestException('Vous ne pouvez demander un remboursement que pour une commande payée.');
    }

    const existing = await this.prisma.refundRequest.findUnique({ where: { orderId } });
    if (existing) throw new BadRequestException('Une demande existe déjà pour cette commande.');

    return this.prisma.refundRequest.create({
      data: {
        orderId,
        clientId,
        boutiqueId: order.boutiqueId,
        reason,
        description,
        evidenceUrl,
      },
    });
  }

  async getVendorRequests(boutiqueId: string) {
    return this.prisma.refundRequest.findMany({
      where: { boutiqueId },
      include: { order: true, client: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVendorRequestById(boutiqueId: string, id: string) {
    const req = await this.prisma.refundRequest.findFirst({
      where: { id, boutiqueId },
      include: { order: true, client: { select: { id: true, name: true, email: true } }, boutique: { select: { name: true } } },
    });
    if (!req) throw new NotFoundException('Demande introuvable.');
    return req;
  }

  async vendorReply(boutiqueId: string, id: string, comment: string) {
    const req = await this.prisma.refundRequest.findUnique({ where: { id, boutiqueId } });
    if (!req) throw new NotFoundException('Demande introuvable.');
    if (req.status !== 'PENDING') throw new BadRequestException('Impossible de répondre à ce stade.');

    return this.prisma.refundRequest.update({
      where: { id },
      data: {
        vendorComment: comment,
        vendorRepliedAt: new Date(),
        status: 'VENDOR_REPLIED',
      },
    });
  }

  async getAdminRequests() {
    return this.prisma.refundRequest.findMany({
      include: { 
        order: true, 
        client: { select: { id: true, name: true, email: true } },
        boutique: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminRequestById(id: string) {
    const req = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: { order: true, client: { select: { id: true, name: true, email: true } }, boutique: { select: { name: true } } },
    });
    if (!req) throw new NotFoundException('Demande introuvable.');
    return req;
  }

  async adminDecide(id: string, action: 'APPROVE' | 'REJECT', resolutionText: string) {
    const req = await this.prisma.refundRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Demande introuvable.');

    return this.prisma.refundRequest.update({
      where: { id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        resolutionText,
      },
    });
  }
}
