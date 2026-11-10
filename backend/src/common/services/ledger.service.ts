import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  LedgerAccountType,
  LedgerDirection,
  PaymentDirection,
  PaymentKind,
  Prisma,
} from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Correctif C3 — GRAND LIVRE (comptabilité en partie double) et modèle de paiement.
 *
 * AVANT
 * -----
 * L'argent de la plateforme n'existait que comme `Boutique.balance`, un simple
 * compteur muté par `increment` / `decrement`. Aucune trace de *pourquoi* le
 * solde a changé, aucune preuve d'idempotence métier : le double crédit ne
 * pouvait être que déduit du code, jamais prouvé.
 *
 * APRÈS
 * -----
 * Chaque mouvement d'argent passe par ce service, qui écrit DEUX choses dans la
 * MÊME transaction que le mouvement métier :
 *
 *  1. une ligne `Payment` APPEND-ONLY — la contrainte UNIQUE
 *     (provider, providerRef, kind) en fait la source de vérité d'idempotence
 *     MÉTIER (bien plus robuste qu'une clé d'idempotence HTTP, falsifiable par
 *     le client) ;
 *  2. un journal `LedgerEntry` en partie double — toutes les lignes d'un même
 *     `journalId` sont équilibrées (total débit = total crédit), vérification
 *     faite ici AVANT écriture, pas seulement par convention.
 *
 * Le compte `BOUTIQUE:<id>` porte la dette de la plateforme envers le vendeur :
 * son solde est tenu IDENTIQUE à `Boutique.balance`, ce qui rend la
 * réconciliation (`reconcileBoutique`) exacte par construction.
 */

/** Tolérance de comparaison des montants (FCFA, 2 décimales). */
export const LEDGER_TOLERANCE = 0.01;

/** Codes des comptes de la plateforme. */
export const LedgerAccounts = {
  ESCROW: 'PLATFORM_ESCROW',
  REVENUE: 'PLATFORM_REVENUE',
  LOYALTY: 'PLATFORM_LOYALTY',
  CUSTOMER: 'PLATFORM_CUSTOMER',
  PAYOUT: 'PLATFORM_PAYOUT',
  /** Compte portant la dette de la plateforme envers une boutique. */
  boutique: (boutiqueId: string) => `BOUTIQUE:${boutiqueId}`,
} as const;

/** Une ligne d'écriture comptable. */
export interface JournalLine {
  /** Code du compte (ex. `PLATFORM_ESCROW`, `BOUTIQUE:<id>`). */
  accountCode: string;
  direction: LedgerDirection;
  amount: number;
  /** Type du compte à créer si absent (inféré du code si omis). */
  accountType?: LedgerAccountType;
  /** Boutique rattachée au compte (requis pour un compte `BOUTIQUE:<id>`). */
  boutiqueId?: string | null;
}

/** Événement financier à journaliser (écriture APPEND-ONLY). */
export interface JournalPayment {
  provider: string;
  providerRef: string;
  kind: PaymentKind;
  direction: PaymentDirection;
  grossAmount: number;
  netAmount: number;
  orderId?: string | null;
  boutiqueId?: string | null;
}

/** Contexte commun à toutes les lignes d'un journal. */
export interface JournalContext {
  description: string;
  orderId?: string | null;
  payment?: JournalPayment;
  currency?: string;
}

/**
 * Comptes « normaux crédit » : leur solde est la différence CRÉDIT − DÉBIT.
 * Comptes « normaux débit » (actif, charge) : DÉBIT − CRÉDIT.
 * C'est la convention usuelle en comptabilité ; elle permet au compte
 * `BOUTIQUE:<id>` de porter exactement le même montant que `Boutique.balance`.
 */
const CREDIT_NORMAL_ACCOUNTS: LedgerAccountType[] = [
  LedgerAccountType.BOUTIQUE,
  LedgerAccountType.CUSTOMER,
  LedgerAccountType.PAYOUT,
  LedgerAccountType.REVENUE,
];

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Type de compte déduit du code, lorsqu'il n'est pas fourni explicitement. */
  private inferAccountType(code: string): LedgerAccountType {
    if (code.startsWith('BOUTIQUE:')) return LedgerAccountType.BOUTIQUE;
    switch (code) {
      case LedgerAccounts.ESCROW:
        return LedgerAccountType.ESCROW;
      case LedgerAccounts.REVENUE:
        return LedgerAccountType.REVENUE;
      case LedgerAccounts.LOYALTY:
        return LedgerAccountType.LOYALTY;
      case LedgerAccounts.CUSTOMER:
        return LedgerAccountType.CUSTOMER;
      case LedgerAccounts.PAYOUT:
        return LedgerAccountType.PAYOUT;
      default:
        return LedgerAccountType.ESCROW;
    }
  }

  /**
   * Écrit un journal comptable EN PARTIE DOUBLE dans la transaction courante.
   *
   * @throws BadRequestException si le journal n'est pas équilibré ou si un
   *         montant est invalide — aucun écrit n'est alors produit.
   */
  async postJournal(
    tx: Prisma.TransactionClient,
    lines: JournalLine[],
    ctx: JournalContext,
  ): Promise<{ journalId: string; paymentId: string | null }> {
    if (!lines || lines.length < 2) {
      throw new BadRequestException(
        'Écriture comptable invalide : un journal comporte au moins deux lignes.',
      );
    }

    // Les lignes à montant nul sont retirées : une commission de 0 FCFA ou
    // une absence de points de fidélité ne doivent pas créer une ligne vide.
    const effectiveLines = lines.filter((line) => line.amount !== 0);

    if (effectiveLines.length < 2) {
      throw new BadRequestException(
        'Écriture comptable invalide : un journal comporte au moins deux lignes non nulles.',
      );
    }

    for (const line of effectiveLines) {
      if (!Number.isFinite(line.amount) || line.amount <= 0) {
        throw new BadRequestException(
          `Écriture comptable invalide : montant ${line.amount} sur le compte ${line.accountCode}.`,
        );
      }
    }

    const totalDebit = effectiveLines
      .filter((l) => l.direction === LedgerDirection.DEBIT)
      .reduce((sum, l) => sum + l.amount, 0);
    const totalCredit = effectiveLines
      .filter((l) => l.direction === LedgerDirection.CREDIT)
      .reduce((sum, l) => sum + l.amount, 0);

    if (Math.abs(totalDebit - totalCredit) > LEDGER_TOLERANCE) {
      throw new BadRequestException(
        `Écriture comptable déséquilibrée : débit ${totalDebit} ≠ crédit ${totalCredit}. Écriture refusée.`,
      );
    }

    // 1. Paiement APPEND-ONLY — la contrainte UNIQUE (provider, providerRef,
    //    kind) fait office de garde d'idempotence MÉTIER.
    let paymentId: string | null = null;
    if (ctx.payment) {
      const p = ctx.payment;
      try {
        const payment = await tx.payment.create({
          data: {
            provider: p.provider,
            providerRef: p.providerRef,
            kind: p.kind,
            direction: p.direction,
            grossAmount: p.grossAmount,
            netAmount: p.netAmount,
            currency: ctx.currency ?? 'XOF',
            orderId: p.orderId ?? ctx.orderId ?? null,
            boutiqueId: p.boutiqueId ?? null,
          },
        });
        paymentId = payment.id;
      } catch (error: any) {
        if (error?.code === 'P2002') {
          throw new ConflictException(
            `Paiement déjà enregistré pour ${p.provider}:${p.providerRef} (${p.kind}) — opération refusée.`,
          );
        }
        throw error;
      }
    }

    // 2. Résolution des comptes (créés à la volée, une seule fois par code).
    const accounts = new Map<string, { id: string; type: LedgerAccountType }>();
    for (const line of effectiveLines) {
      if (accounts.has(line.accountCode)) continue;
      const account = await tx.ledgerAccount.upsert({
        where: { code: line.accountCode },
        create: {
          code: line.accountCode,
          type: line.accountType ?? this.inferAccountType(line.accountCode),
          boutiqueId:
            line.boutiqueId ??
            (line.accountCode.startsWith('BOUTIQUE:')
              ? line.accountCode.slice('BOUTIQUE:'.length)
              : null),
          balance: 0,
        },
        update: {},
      });
      accounts.set(line.accountCode, { id: account.id, type: account.type });
    }

    // 3. Écriture des lignes + mise à jour des soldes dénormalisés.
    const journalId = `JRN_${crypto.randomUUID()}`;
    const currency = ctx.currency ?? 'XOF';

    for (const line of effectiveLines) {
      const account = accounts.get(line.accountCode)!;
      await tx.ledgerEntry.create({
        data: {
          journalId,
          accountId: account.id,
          direction: line.direction,
          amount: line.amount,
          currency,
          description: ctx.description,
          paymentId,
          orderId: ctx.orderId ?? null,
        },
      });

      const creditNormal = CREDIT_NORMAL_ACCOUNTS.includes(account.type);
      const signedDelta =
        line.direction === LedgerDirection.CREDIT
          ? creditNormal
            ? line.amount
            : -line.amount
          : creditNormal
            ? -line.amount
            : line.amount;

      await tx.ledgerAccount.update({
        where: { id: account.id },
        data: { balance: { increment: signedDelta } },
      });
    }

    this.logger.log(
      `[Ledger] Journal ${journalId} — ${lines.length} lignes, débit ${totalDebit} / crédit ${totalCredit}${paymentId ? `, paiement ${paymentId}` : ''}.`,
    );

    return { journalId, paymentId };
  }

  /**
   * Crédite le solde d'une boutique ET journalise l'opération.
   *
   * Le mouvement de solde et son écriture comptable sont effectués dans la
   * MÊME transaction : ils ne peuvent pas diverger.
   *
   * @param counterpart lignes de contrepartie, HORS ligne boutique. Leur total
   *        doit équilibrer la ligne boutique (le service le vérifie).
   */
  async creditBoutique(
    tx: Prisma.TransactionClient,
    boutiqueId: string,
    amount: number,
    opts: {
      counterpart: JournalLine[];
      description: string;
      orderId?: string | null;
      payment?: JournalPayment;
      currency?: string;
    },
  ): Promise<void> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        `Crédit de solde invalide pour la boutique ${boutiqueId} : montant ${amount}.`,
      );
    }

    await tx.boutique.update({
      where: { id: boutiqueId },
      data: { balance: { increment: amount } },
    });

    await this.postJournal(
      tx,
      [
        {
          accountCode: LedgerAccounts.boutique(boutiqueId),
          accountType: LedgerAccountType.BOUTIQUE,
          boutiqueId,
          direction: LedgerDirection.CREDIT,
          amount,
        },
        ...opts.counterpart,
      ],
      {
        description: opts.description,
        orderId: opts.orderId ?? null,
        payment: opts.payment,
        currency: opts.currency,
      },
    );
  }

  /**
   * Débite le solde d'une boutique ET journalise l'opération.
   *
   * @param opts.guardBalance impose un solde suffisant (retrait) ; à défaut, le
   *        débit est appliqué même si le solde devient négatif — comportement
   *        historique des remboursements et annulations, qui doivent aboutir.
   */
  async debitBoutique(
    tx: Prisma.TransactionClient,
    boutiqueId: string,
    amount: number,
    opts: {
      counterpart: JournalLine[];
      description: string;
      orderId?: string | null;
      payment?: JournalPayment;
      currency?: string;
      /** Impose un solde suffisant avant débit. */
      guardBalance?: boolean;
      /** Montant additionnel qui doit rester disponible (séquestre réservé). */
      reservedAmount?: number;
      /** Conditions supplémentaires sur la boutique (ex. statut ACTIVE). */
      where?: Prisma.BoutiqueWhereInput;
      /** Message d'erreur personnalisé en cas de solde insuffisant. */
      insufficientFundsMessage?: string;
    },
  ): Promise<void> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        `Débit de solde invalide pour la boutique ${boutiqueId} : montant ${amount}.`,
      );
    }

    if (opts.guardBalance) {
      const updated = await tx.boutique.updateMany({
        where: {
          id: boutiqueId,
          balance: { gte: amount + (opts.reservedAmount ?? 0) },
          ...(opts.where ?? {}),
        },
        data: { balance: { decrement: amount } },
      });
      if (updated.count === 0) {
        throw new BadRequestException(
          opts.insufficientFundsMessage ?? 'Solde insuffisant pour cette opération.',
        );
      }
    } else {
      await tx.boutique.update({
        where: { id: boutiqueId },
        data: { balance: { decrement: amount } },
      });
    }

    await this.postJournal(
      tx,
      [
        {
          accountCode: LedgerAccounts.boutique(boutiqueId),
          accountType: LedgerAccountType.BOUTIQUE,
          boutiqueId,
          direction: LedgerDirection.DEBIT,
          amount,
        },
        ...opts.counterpart,
      ],
      {
        description: opts.description,
        orderId: opts.orderId ?? null,
        payment: opts.payment,
        currency: opts.currency,
      },
    );
  }

  // ------------------------------------------------------------------
  // RÉCONCILIATION
  // ------------------------------------------------------------------

  /**
   * Réconciliation d'une boutique : le solde porté par le grand livre doit
   * être IDENTIQUE à `Boutique.balance`.
   */
  async reconcileBoutique(boutiqueId: string): Promise<{
    boutiqueId: string;
    boutiqueName: string;
    ledgerBalance: number;
    boutiqueBalance: number;
    delta: number;
    ok: boolean;
  }> {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id: boutiqueId },
      select: { id: true, name: true, balance: true },
    });
    if (!boutique) {
      throw new NotFoundException(`Boutique introuvable : ${boutiqueId}`);
    }

    const account = await this.prisma.ledgerAccount.findUnique({
      where: { code: LedgerAccounts.boutique(boutiqueId) },
      select: { balance: true },
    });

    const ledgerBalance = account ? Number(account.balance) : 0;
    const boutiqueBalance = Number(boutique.balance);
    const delta = boutiqueBalance - ledgerBalance;

    return {
      boutiqueId,
      boutiqueName: boutique.name,
      ledgerBalance,
      boutiqueBalance,
      delta,
      ok: Math.abs(delta) <= LEDGER_TOLERANCE,
    };
  }

  /**
   * Réconciliation globale : Toutes les boutiques dont le solde porté par le
   * grand livre diverge de `Boutique.balance`.
   */
  async reconcileAll(): Promise<{
    checked: number;
    anomalies: Array<{
      boutiqueId: string;
      boutiqueName: string;
      ledgerBalance: number;
      boutiqueBalance: number;
      delta: number;
    }>;
    ok: boolean;
  }> {
    const [boutiques, accounts] = await Promise.all([
      this.prisma.boutique.findMany({
        select: { id: true, name: true, balance: true },
      }),
      this.prisma.ledgerAccount.findMany({
        where: { type: LedgerAccountType.BOUTIQUE },
        select: { boutiqueId: true, balance: true },
      }),
    ]);

    const ledgerByBoutique = new Map(
      accounts
        .filter((a) => a.boutiqueId)
        .map((a) => [a.boutiqueId as string, Number(a.balance)]),
    );

    const anomalies: Array<{
      boutiqueId: string;
      boutiqueName: string;
      ledgerBalance: number;
      boutiqueBalance: number;
      delta: number;
    }> = [];

    for (const boutique of boutiques) {
      const ledgerBalance = ledgerByBoutique.get(boutique.id) ?? 0;
      const boutiqueBalance = Number(boutique.balance);
      const delta = boutiqueBalance - ledgerBalance;
      if (Math.abs(delta) > LEDGER_TOLERANCE) {
        anomalies.push({
          boutiqueId: boutique.id,
          boutiqueName: boutique.name,
          ledgerBalance,
          boutiqueBalance,
          delta,
        });
      }
    }

    return { checked: boutiques.length, anomalies, ok: anomalies.length === 0 };
  }

  /**
   * Réconciliation des paiements : toute commande marquée PAID doit disposer
   * d'un `Payment` de nature CAPTURE dont le montant correspond au total de la
   * commande.
   *
   * Seules les commandes réglées APRÈS l'ouverture du grand livre sont
   * contrôlées : les commandes historiques n'ont pas de capture enregistrée,
   * ce qui n'est pas une anomalie mais l'état antérieur à la migration.
   */
  async reconcilePayments(): Promise<{
    openingDate: Date | null;
    checkedOrders: number;
    missingCaptures: Array<{ orderId: string; reference: string; status: string }>;
    amountMismatches: Array<{
      orderId: string;
      reference: string;
      orderTotal: number;
      capturedAmount: number;
      delta: number;
    }>;
    ok: boolean;
  }> {
    const opening = await this.prisma.ledgerEntry.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    const openingDate = opening?.createdAt ?? null;

    const [paidOrders, captures] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          status: 'PAID',
          ...(openingDate ? { paidAt: { gte: openingDate } } : {}),
        },
        select: { id: true, reference: true, paidAt: true, total: true },
      }),
      this.prisma.payment.findMany({
        where: { kind: PaymentKind.CAPTURE },
        select: { orderId: true, grossAmount: true, netAmount: true },
      }),
    ]);

    const captureByOrder = new Map(
      captures.filter((c) => c.orderId).map((c) => [c.orderId as string, c]),
    );

    const missingCaptures: Array<{ orderId: string; reference: string; status: string }> = [];
    const amountMismatches: Array<{
      orderId: string;
      reference: string;
      orderTotal: number;
      capturedAmount: number;
      delta: number;
    }> = [];

    for (const order of paidOrders) {
      const capture = captureByOrder.get(order.id);
      if (!capture) {
        missingCaptures.push({
          orderId: order.id,
          reference: order.reference,
          status: 'PAID',
        });
        continue;
      }
      const orderTotal = Number(order.total);
      const capturedAmount = Number(capture.grossAmount);
      const delta = capturedAmount - orderTotal;
      if (Math.abs(delta) > LEDGER_TOLERANCE) {
        amountMismatches.push({
          orderId: order.id,
          reference: order.reference,
          orderTotal,
          capturedAmount,
          delta,
        });
      }
    }

    return {
      openingDate,
      checkedOrders: paidOrders.length,
      missingCaptures,
      amountMismatches,
      ok: missingCaptures.length === 0 && amountMismatches.length === 0,
    };
  }
}
