import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  LedgerAccountType,
  LedgerDirection,
  PaymentDirection,
  PaymentKind,
} from '@prisma/client';
import { LedgerAccounts, LedgerService } from '../src/common/services/ledger.service';

/**
 * Correctif C3 — Grand livre (comptabilité en partie double) et modèle `Payment`.
 *
 * Ces tests verrouillent les trois propriétés qui font du grand livre une
 * preuve plutôt qu'une décoration :
 *
 *  1. **Équilibre** — un journal dont le total débit ≠ total crédit est
 *     REFUSÉ, et rien n'est écrit (ni ligne, ni solde, ni paiement).
 *  2. **Append-only** — les écritures s'ajoutent, ne se modifient jamais ; un
 *     solde de compte est toujours le cumul de ses lignes.
 *  3. **Idempotence métier** — la contrainte UNIQUE (provider, providerRef,
 *     kind) de `Payment` interdit d'enregistrer deux fois le même paiement.
 */

interface FakeAccount {
  id: string;
  code: string;
  type: LedgerAccountType;
  boutiqueId: string | null;
  balance: number;
}

interface FakeEntry {
  id: string;
  journalId: string;
  accountId: string;
  direction: LedgerDirection;
  amount: number;
  paymentId: string | null;
  orderId: string | null;
}

function createInMemoryPrisma() {
  const accounts: FakeAccount[] = [];
  const entries: FakeEntry[] = [];
  const payments: any[] = [];
  const boutiques: any[] = [];
  let seq = 0;

  const tx: any = {
    payment: {
      create: async ({ data }: any) => {
        // Reproduction de la contrainte UNIQUE (provider, providerRef, kind).
        const duplicate = payments.find(
          (p) =>
            p.provider === data.provider &&
            p.providerRef === data.providerRef &&
            p.kind === data.kind,
        );
        if (duplicate) {
          const err: any = new Error('Unique constraint failed');
          err.code = 'P2002';
          throw err;
        }
        const created = { id: `payment_${++seq}`, ...data };
        payments.push(created);
        return created;
      },
    },
    ledgerAccount: {
      upsert: async ({ where, create }: any) => {
        const found = accounts.find((a) => a.code === where.code);
        if (found) return { ...found };
        const created: FakeAccount = {
          id: `account_${++seq}`,
          code: create.code,
          type: create.type,
          boutiqueId: create.boutiqueId ?? null,
          balance: 0,
        };
        accounts.push(created);
        return { ...created };
      },
      update: async ({ where, data }: any) => {
        const found = accounts.find((a) => a.id === where.id)!;
        found.balance += Number(data.balance?.increment ?? 0);
        return { ...found };
      },
    },
    ledgerEntry: {
      create: async ({ data }: any) => {
        const created = { id: `entry_${++seq}`, ...data };
        entries.push(created);
        return created;
      },
    },
    boutique: {
      update: async ({ where, data }: any) => {
        const found = boutiques.find((b) => b.id === where.id)!;
        const delta = Number(data.balance?.increment ?? 0) - Number(data.balance?.decrement ?? 0);
        found.balance += delta;
        return { ...found };
      },
    },
  };

  return {
    tx,
    accounts,
    entries,
    payments,
    boutiques,
    __prisma: { payment: tx.payment, ledgerAccount: tx.ledgerAccount, ledgerEntry: tx.ledgerEntry },
  };
}

describe('LedgerService — partie double, append-only et idempotence métier (C3)', () => {
  let harness: ReturnType<typeof createInMemoryPrisma>;
  let service: LedgerService;

  beforeEach(() => {
    harness = createInMemoryPrisma();
    service = new LedgerService(harness.__prisma as any);
  });

  describe('1. Équilibre du journal', () => {
    it('refuse un journal déséquilibré et n\'écrit RIEN', async () => {
      await expect(
        service.postJournal(
          harness.tx,
          [
            {
              accountCode: LedgerAccounts.boutique('b1'),
              direction: LedgerDirection.CREDIT,
              amount: 1000,
            },
            {
              accountCode: LedgerAccounts.ESCROW,
              direction: LedgerDirection.DEBIT,
              amount: 900, // ← 900 ≠ 1000
            },
          ],
          { description: 'Journal déséquilibré' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(harness.entries).toHaveLength(0);
      expect(harness.accounts).toHaveLength(0);
      expect(harness.payments).toHaveLength(0);
    });

    it('refuse un montant négatif ou non fini', async () => {
      await expect(
        service.postJournal(
          harness.tx,
          [
            {
              accountCode: LedgerAccounts.boutique('b1'),
              direction: LedgerDirection.CREDIT,
              amount: -100,
            },
            { accountCode: LedgerAccounts.ESCROW, direction: LedgerDirection.DEBIT, amount: 100 },
          ],
          { description: 'Montant invalide' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(harness.entries).toHaveLength(0);
    });

    it('accepte un journal équilibré et écrit les lignes', async () => {
      const result = await service.postJournal(
        harness.tx,
        [
          {
            accountCode: LedgerAccounts.boutique('b1'),
            direction: LedgerDirection.CREDIT,
            amount: 950,
            boutiqueId: 'b1',
          },
          { accountCode: LedgerAccounts.REVENUE, direction: LedgerDirection.CREDIT, amount: 50 },
          { accountCode: LedgerAccounts.ESCROW, direction: LedgerDirection.DEBIT, amount: 1000 },
        ],
        { description: 'Encaissement', orderId: 'o1' },
      );

      expect(result.journalId).toMatch(/^JRN_/);
      expect(harness.entries).toHaveLength(3);
      // Toutes les lignes partagent le même journal.
      expect(new Set(harness.entries.map((e) => e.journalId)).size).toBe(1);
    });

    it('écarte les lignes à montant nul (commission de 0, absence de points)', async () => {
      await service.postJournal(
        harness.tx,
        [
          {
            accountCode: LedgerAccounts.boutique('b1'),
            direction: LedgerDirection.CREDIT,
            amount: 1000,
            boutiqueId: 'b1',
          },
          { accountCode: LedgerAccounts.ESCROW, direction: LedgerDirection.DEBIT, amount: 1000 },
          { accountCode: LedgerAccounts.LOYALTY, direction: LedgerDirection.DEBIT, amount: 0 },
        ],
        { description: 'Encaissement sans points' },
      );

      expect(harness.entries).toHaveLength(2);
    });
  });

  describe('2. Append-only et soldes', () => {
    it('le solde du compte boutique est le cumul de ses lignes', async () => {
      await service.postJournal(
        harness.tx,
        [
          {
            accountCode: LedgerAccounts.boutique('b1'),
            direction: LedgerDirection.CREDIT,
            amount: 1000,
            boutiqueId: 'b1',
          },
          { accountCode: LedgerAccounts.ESCROW, direction: LedgerDirection.DEBIT, amount: 1000 },
        ],
        { description: 'Crédit' },
      );

      const account = harness.accounts.find((a) => a.code === 'BOUTIQUE:b1')!;
      expect(account.balance).toBe(1000);

      await service.postJournal(
        harness.tx,
        [
          {
            accountCode: LedgerAccounts.boutique('b1'),
            direction: LedgerDirection.DEBIT,
            amount: 400,
            boutiqueId: 'b1',
          },
          { accountCode: LedgerAccounts.CUSTOMER, direction: LedgerDirection.CREDIT, amount: 400 },
        ],
        { description: 'Remboursement' },
      );

      // Les lignes d'origine sont INTACTES (append-only) et le solde cumule.
      expect(harness.entries).toHaveLength(4);
      expect(harness.entries[0].amount).toBe(1000);
      expect(account.balance).toBe(600);
    });

    it('creditBoutique porte le solde de la boutique ET du compte comptable', async () => {
      harness.boutiques.push({ id: 'b1', balance: 0 });

      await service.creditBoutique(harness.tx, 'b1', 4750, {
        counterpart: [
          { accountCode: LedgerAccounts.ESCROW, direction: LedgerDirection.DEBIT, amount: 5000 },
          { accountCode: LedgerAccounts.LOYALTY, direction: LedgerDirection.DEBIT, amount: 250 },
          { accountCode: LedgerAccounts.REVENUE, direction: LedgerDirection.CREDIT, amount: 500 },
        ],
        description: 'Encaissement',
      });

      expect(harness.boutiques[0].balance).toBe(4750);
      const account = harness.accounts.find((a) => a.code === 'BOUTIQUE:b1')!;
      expect(account.balance).toBe(4750);
      // Le compte séquestre est débité du montant encaissé.
      const escrow = harness.accounts.find((a) => a.code === LedgerAccounts.ESCROW)!;
      expect(escrow.balance).toBe(5000);
    });

    it('debitBoutique débite la boutique et le compte comptable à l\'identique', async () => {
      harness.boutiques.push({ id: 'b1', balance: 4750 });

      await service.debitBoutique(harness.tx, 'b1', 1000, {
        counterpart: [
          { accountCode: LedgerAccounts.PAYOUT, direction: LedgerDirection.CREDIT, amount: 1000 },
        ],
        description: 'Retrait',
      });

      expect(harness.boutiques[0].balance).toBe(3750);
      const account = harness.accounts.find((a) => a.code === 'BOUTIQUE:b1')!;
      expect(account.balance).toBe(-1000);
    });

    it('refuse un crédit ou un débit de montant nul ou négatif', async () => {
      await expect(
        service.creditBoutique(harness.tx, 'b1', 0, {
          counterpart: [
            { accountCode: LedgerAccounts.ESCROW, direction: LedgerDirection.DEBIT, amount: 0 },
          ],
          description: 'Crédit nul',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        service.debitBoutique(harness.tx, 'b1', -5, {
          counterpart: [
            { accountCode: LedgerAccounts.PAYOUT, direction: LedgerDirection.CREDIT, amount: -5 },
          ],
          description: 'Débit négatif',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('3. Idempotence métier (Payment append-only)', () => {
    const payment = {
      provider: 'PAYDUNYA',
      providerRef: 'test_token_1',
      kind: PaymentKind.CAPTURE,
      direction: PaymentDirection.IN,
      grossAmount: 5000,
      netAmount: 4750,
      orderId: 'o1',
      boutiqueId: 'b1',
    };

    it('enregistre le paiement et le rattache à son journal', async () => {
      const result = await service.postJournal(
        harness.tx,
        [
          {
            accountCode: LedgerAccounts.boutique('b1'),
            direction: LedgerDirection.CREDIT,
            amount: 4750,
            boutiqueId: 'b1',
          },
          { accountCode: LedgerAccounts.ESCROW, direction: LedgerDirection.DEBIT, amount: 5000 },
          { accountCode: LedgerAccounts.LOYALTY, direction: LedgerDirection.DEBIT, amount: 250 },
          { accountCode: LedgerAccounts.REVENUE, direction: LedgerDirection.CREDIT, amount: 500 },
        ],
        { description: 'Encaissement', payment, orderId: 'o1' },
      );

      expect(harness.payments).toHaveLength(1);
      expect(result.paymentId).toBe('payment_1');
      // Chaque ligne du journal porte la référence du paiement.
      expect(harness.entries.every((e) => e.paymentId === 'payment_1')).toBe(true);
    });

    it('REFUSE un second paiement identique (même PSP, même référence, même nature)', async () => {
      const lines = [
        {
          accountCode: LedgerAccounts.boutique('b1'),
          direction: LedgerDirection.CREDIT,
          amount: 4750,
          boutiqueId: 'b1',
        },
        { accountCode: LedgerAccounts.ESCROW, direction: LedgerDirection.DEBIT, amount: 5000 },
        { accountCode: LedgerAccounts.LOYALTY, direction: LedgerDirection.DEBIT, amount: 250 },
        { accountCode: LedgerAccounts.REVENUE, direction: LedgerDirection.CREDIT, amount: 500 },
      ];

      await service.postJournal(harness.tx, lines, { description: 'Encaissement', payment });
      expect(harness.payments).toHaveLength(1);

      await expect(
        service.postJournal(harness.tx, lines, { description: 'Encaissement (rejeu)', payment }),
      ).rejects.toBeInstanceOf(ConflictException);

      // Le rejeu n'a rien écrit de plus : c'est bien le rôle de la contrainte.
      expect(harness.payments).toHaveLength(1);
      expect(harness.entries).toHaveLength(4);
    });

    it('accepte deux paiements de NATURE différente pour la même référence', async () => {
      const lines = [
        {
          accountCode: LedgerAccounts.boutique('b1'),
          direction: LedgerDirection.CREDIT,
          amount: 100,
          boutiqueId: 'b1',
        },
        { accountCode: LedgerAccounts.ESCROW, direction: LedgerDirection.DEBIT, amount: 100 },
      ];

      await service.postJournal(harness.tx, lines, { description: 'Capture', payment });
      await service.postJournal(harness.tx, lines, {
        description: 'Remboursement',
        payment: { ...payment, kind: PaymentKind.REFUND, direction: PaymentDirection.OUT },
      });

      expect(harness.payments).toHaveLength(2);
    });
  });

  describe('4. Création des comptes', () => {
    it('crée le compte plateforme attendu pour chaque code utilisé', async () => {
      await service.postJournal(
        harness.tx,
        [
          {
            accountCode: LedgerAccounts.boutique('b1'),
            direction: LedgerDirection.CREDIT,
            amount: 100,
            boutiqueId: 'b1',
          },
          { accountCode: LedgerAccounts.REVENUE, direction: LedgerDirection.CREDIT, amount: 100 },
          { accountCode: LedgerAccounts.ESCROW, direction: LedgerDirection.DEBIT, amount: 200 },
        ],
        { description: 'Test comptes' },
      );

      const codes = harness.accounts.map((a) => a.code).sort();
      expect(codes).toEqual([
        'BOUTIQUE:b1',
        'PLATFORM_ESCROW',
        'PLATFORM_REVENUE',
      ]);
      expect(harness.accounts.find((a) => a.code === 'BOUTIQUE:b1')!.type).toBe(
        LedgerAccountType.BOUTIQUE,
      );
      expect(harness.accounts.find((a) => a.code === 'BOUTIQUE:b1')!.boutiqueId).toBe('b1');
    });

    it('réutilise un compte existant (aucun doublon)', async () => {
      const lines = [
        {
          accountCode: LedgerAccounts.boutique('b1'),
          direction: LedgerDirection.CREDIT,
          amount: 100,
          boutiqueId: 'b1',
        },
        { accountCode: LedgerAccounts.ESCROW, direction: LedgerDirection.DEBIT, amount: 100 },
      ];

      await service.postJournal(harness.tx, lines, { description: '1' });
      await service.postJournal(harness.tx, lines, { description: '2' });

      expect(harness.accounts).toHaveLength(2);
      expect(harness.entries).toHaveLength(4);
    });
  });
});
