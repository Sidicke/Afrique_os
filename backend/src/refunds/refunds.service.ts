import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  LedgerDirection,
  PaymentDirection,
  PaymentKind,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerAccounts, LedgerService } from '../common/services/ledger.service';

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

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

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.refundRequest.create({
        data: {
          orderId,
          clientId,
          boutiqueId: order.boutiqueId,
          reason,
          description,
          evidenceUrl,
        },
      });

      // Décision D4 & Règle 13/14 : Toute demande de remboursement bloque immédiatement le reversement vendeur non encore décaissé
      await tx.settlementAllocation.updateMany({
        where: {
          orderId,
          beneficiaryType: 'SELLER_BOUTIQUE',
          status: {
            in: [
              'PENDING_PAYMENT',
              'AWAITING_DELIVERY_VERIFICATION',
              'AWAITING_BUYER_CONFORMITY',
              'ELIGIBLE_FOR_RELEASE',
            ],
          },
        },
        data: {
          status: 'ON_HOLD_DISPUTE',
          holdReason: `Demande de remboursement #${created.id} : ${reason}`,
        },
      });

      return created;
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
    const req = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!req) throw new NotFoundException('Demande introuvable.');
    if (req.status === 'APPROVED' || req.status === 'REJECTED') {
      throw new BadRequestException('Cette demande de remboursement a déjà été traitée.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.refundRequest.update({
        where: { id },
        data: {
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          resolutionText,
        },
      });

      if (action === 'APPROVE') {
        const sellerAllocs = await tx.settlementAllocation.findMany({
          where: {
            orderId: req.orderId,
            beneficiaryType: 'SELLER_BOUTIQUE',
            status: { not: 'REFUNDED' },
          },
        });

        if (sellerAllocs.length > 0) {
          await tx.settlementAllocation.updateMany({
            where: {
              orderId: req.orderId,
              beneficiaryType: 'SELLER_BOUTIQUE',
              status: { not: 'REFUNDED' },
            },
            data: { status: 'REFUNDED' },
          });

          for (const alloc of sellerAllocs) {
            const deduction = Number(alloc.netAmountFcfa || 0);
            if (deduction > 0 && alloc.beneficiaryId) {
              // === CORRECTIF C3 — DÉBIT DU SOLDLE + ÉCRITURE COMPTABLE ===
              await this.ledgerService.debitBoutique(
                tx,
                alloc.beneficiaryId,
                deduction,
                {
                  counterpart: [
                    {
                      accountCode: LedgerAccounts.CUSTOMER,
                      direction: LedgerDirection.CREDIT,
                      amount: deduction,
                    },
                  ],
                  description: `Remboursement accepté — demande ${req.id}`,
                  orderId: req.orderId,
                  payment: {
                    provider: 'PLATFORM',
                    providerRef: `REFUND-${req.id}-${alloc.beneficiaryId}`,
                    kind: PaymentKind.REFUND,
                    direction: PaymentDirection.OUT,
                    grossAmount: deduction,
                    netAmount: deduction,
                    orderId: req.orderId,
                    boutiqueId: alloc.beneficiaryId,
                  },
                },
              );
            }
          }
        } else if (req.order && Number(req.order.netAmount || 0) > 0) {
          const deduction = Number(req.order.netAmount);
          // === CORRECTIF C3 — DÉBIT DU SOLDLE + ÉCRITURE COMPTABLE ===
          await this.ledgerService.debitBoutique(tx, req.boutiqueId, deduction, {
            counterpart: [
              {
                accountCode: LedgerAccounts.CUSTOMER,
                direction: LedgerDirection.CREDIT,
                amount: deduction,
              },
            ],
            description: `Remboursement accepté — demande ${req.id}`,
            orderId: req.orderId,
            payment: {
              provider: 'PLATFORM',
              providerRef: `REFUND-${req.id}`,
              kind: PaymentKind.REFUND,
              direction: PaymentDirection.OUT,
              grossAmount: deduction,
              netAmount: deduction,
              orderId: req.orderId,
              boutiqueId: req.boutiqueId,
            },
          });
        }
      }

      return updated;
    });
  }
}
