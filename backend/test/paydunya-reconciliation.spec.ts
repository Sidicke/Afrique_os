import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PayDunyaService } from '../src/paydunya/paydunya.service';

/**
 * Correctif C2 — Réconciliation de la facture PayDunya avec la commande attendue.
 *
 * CONTEXTE
 * ---------
 * Avant le correctif, deux contrôles ABSENTS permettaient de solder une
 * commande sans encaissement réel :
 *
 *  1. Le montant effectivement payé par PayDunya n'était JAMAIS relu. La
 *     réponse IPN (`data.invoice.total_amount`) et la réponse `confirm`
 *     (`invoice.total_amount`) contiennent ce montant — il n'était jamais
 *     consulté. Le crédit du vendeur se calculait systématiquement sur
 *     `Order.total`, quel que soit le montant réellement encaissé.
 *
 *  2. `confirm/:token` acceptait un `?orderId=` fourni par l'appelant comme
 *     source de commande (`customData.orderId ?? fallbackOrderId`). Le token
 *     d'une facture PayDunya n'est PAS secret : il est renvoyé au client dans
 *     l'URL de retour, il apparaît dans les logs, et il est devinable. Un
 *     token de facture « complétée à 100 FCFA » suffisait donc à solder une
 *     commande arbitraire — et à créditer la boutique du montant de cette
 *     commande, sans aucun encaissement correspondant.
 *
 * Ces tests verrouillent le comportement correct : la commande provient des
 * DONNÉES SERVEUR de la facture, le token doit être celui émis pour cette
 * commande, et le montant encaissé doit être exactement le montant facturé.
 */

const CLIENT_ID = 'user_client_c2';
const SELLER_ID = 'user_seller_c2';

const CONFIG: Record<string, string> = {
  PAYDUNYA_MASTER_KEY: 'master-key-test',
  PAYDUNYA_PUBLIC_KEY: 'public-key-test',
  PAYDUNYA_PRIVATE_KEY: 'private-key-test',
  PAYDUNYA_TOKEN: 'token-test',
  PAYDUNYA_ENVIRONMENT: 'sandbox',
};

function buildOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'order_1',
    reference: 'AC-C2-0001',
    boutiqueId: 'boutique_1',
    userId: CLIENT_ID,
    customerName: 'Client C2',
    customerPhone: '+2250700000001',
    status: 'PENDING',
    pointsUsed: 0,
    total: 5000,
    // Trace serveur de la facture émise (correctif C2)
    paydunyaToken: 'test_token_1',
    paydunyaAmount: 5000,
    boutique: { id: 'boutique_1', ownerId: SELLER_ID, name: 'Boutique C2' },
    ...overrides,
  };
}

/** Réponse « confirm » de l'API PayDunya (structure documentée officiellement). */
function paydunyaConfirmResponse(overrides: Record<string, any> = {}) {
  return {
    response_code: '00',
    response_text: 'Transaction Found',
    status: 'completed',
    invoice: { token: 'test_token_1', total_amount: '5000' },
    custom_data: {
      orderId: 'order_1',
      orderReference: 'AC-C2-0001',
      boutiqueId: 'boutique_1',
    },
    receipt_url: 'https://app.paydunya.com/sandbox-checkout/receipt/pdf/test_token_1.pdf',
    ...overrides,
  };
}

function createHarness(orders: any[]) {
  /**
   * Correctif C3 — Stub du grand livre. Le test porte sur la réconciliation
   * facture ↔ commande (C2) : le grand livre est ici réduit à son effet sur le
   * solde de la boutique. La vérification complète du grand livre (partie
   * double, Payment, idempotence métier) est couverte par
   * `backend/test/ledger-reconciliation.e2e-spec.ts`.
   */
  const ledgerStub = {
    creditBoutique: async (tx: any, boutiqueId: string, amount: number) => {
      await tx.boutique.update({
        where: { id: boutiqueId },
        data: { balance: { increment: amount } },
      });
    },
    debitBoutique: async () => undefined,
    postJournal: async () => ({ journalId: 'JRN_test', paymentId: null }),
  };

  const prisma: any = {
    order: {
      findFirst: jest.fn(async ({ where }: any) => {
        const found = orders.find((o) =>
          where?.id ? o.id === where.id : o?.reference === where?.reference,
        );
        return found ?? null;
      }),
      updateMany: jest.fn(async () => ({ count: 1 })),
      update: jest.fn(async () => ({})),
    },
    // Correctif C3 — garde d'idempotence métier : aucun règlement déjà
    // enregistré dans ce test.
    payment: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => ({ id: 'payment_test' })),
    },
    boutique: {
      update: jest.fn(async () => ({})),
      findMany: jest.fn(async () => []),
    },
    settlementAllocation: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
    },
    shipment: {
      findFirst: jest.fn(async () => null),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    user: {
      findUnique: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
    },
    pointTransaction: { create: jest.fn(async () => ({})) },
    notification: { create: jest.fn(async () => ({})) },
  };
  prisma.$transaction = async (fn: any) => fn(prisma);

  const configService: any = { get: (key: string) => CONFIG[key] };
  const idempotencyService: any = {
    getRecord: async () => null,
    saveRecord: async () => undefined,
  };

  const service = new PayDunyaService(
    prisma as any,
    configService as any,
    idempotencyService as any,
    ledgerStub as any,
  );

  return { service, prisma };
}

describe('PayDunya — Réconciliation facture ↔ commande (correctif C2)', () => {
  const originalFetch = (global as any).fetch;

  const client = { id: CLIENT_ID, email: 'client@test.com', role: 'CLIENT' as any };
  const seller = { id: SELLER_ID, email: 'seller@test.com', role: 'VENDEUR' as any };
  const intruder = { id: 'user_intruder', email: 'x@test.com', role: 'CLIENT' as any };

  afterEach(() => {
    (global as any).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  /** Simule la réponse HTTP de l'API PayDunya « confirm ». */
  const mockConfirmApi = (payload: any) => {
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    }));
  };

  describe('1. Règlement conforme', () => {
    it('règle la commande quand le montant encaissé est exactement le montant facturé', async () => {
      const order = buildOrder();
      const { service, prisma } = createHarness([order]);
      mockConfirmApi(paydunyaConfirmResponse());

      const res = await service.confirmTransactionByToken('test_token_1', client);

      expect(res.success).toBe(true);
      expect(res.settlementStatus).toBe('order_paid_success');
      expect(res.orderId).toBe('order_1');

      // La commande passe bien en PAID…
      expect(prisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order_1', status: { not: 'PAID' } },
          data: expect.objectContaining({ status: 'PAID', paymentMethod: 'PAYDUNYA' }),
        }),
      );
      // …et la boutique est créditée.
      expect(prisma.boutique.update).toHaveBeenCalled();
    });

    it('accepte un montant transporté en chaîne (sérialisation de certains SDK PayDunya)', async () => {
      const order = buildOrder();
      const { service, prisma } = createHarness([order]);
      mockConfirmApi(
        paydunyaConfirmResponse({ invoice: { token: 'test_token_1', total_amount: 5000 } }),
      );

      const res = await service.confirmTransactionByToken('test_token_1', client);

      expect(res.settlementStatus).toBe('order_paid_success');
      expect(prisma.order.updateMany).toHaveBeenCalled();
    });

    it('le propriétaire de la boutique peut aussi déclencher la confirmation', async () => {
      const order = buildOrder();
      const { service, prisma } = createHarness([order]);
      mockConfirmApi(paydunyaConfirmResponse());

      const res = await service.confirmTransactionByToken('test_token_1', seller);

      expect(res.settlementStatus).toBe('order_paid_success');
      expect(prisma.order.updateMany).toHaveBeenCalled();
    });
  });

  describe('2. Montant encaissé ≠ montant facturé (le cœur du finding C2)', () => {
    it('refuse un SOUS-paiement et ne crédite rien', async () => {
      const order = buildOrder();
      const { service, prisma } = createHarness([order]);
      mockConfirmApi(
        paydunyaConfirmResponse({ invoice: { token: 'test_token_1', total_amount: '100' } }),
      );

      await expect(
        service.confirmTransactionByToken('test_token_1', client),
      ).rejects.toBeInstanceOf(BadRequestException);

      // Aucun crédit, aucun changement de statut.
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
      expect(prisma.boutique.update).not.toHaveBeenCalled();
    });

    it('refuse un SUR-paiement et ne crédite rien', async () => {
      const order = buildOrder();
      const { service, prisma } = createHarness([order]);
      mockConfirmApi(
        paydunyaConfirmResponse({ invoice: { token: 'test_token_1', total_amount: '50000' } }),
      );

      await expect(
        service.confirmTransactionByToken('test_token_1', client),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('refuse le règlement si le montant de la facture est absent du payload', async () => {
      const order = buildOrder();
      const { service, prisma } = createHarness([order]);
      const payload = paydunyaConfirmResponse();
      delete (payload as any).invoice.total_amount;
      mockConfirmApi(payload);

      await expect(
        service.confirmTransactionByToken('test_token_1', client),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('refuse le règlement si le total de la commande a été modifié après l\'émission de la facture', async () => {
      // Scénario d'exploitation de l'audit : le total bouge entre la création
      // de la facture et le paiement. La facture reste à l'ancien montant.
      const order = buildOrder({ total: 6000, paydunyaAmount: 5000 });
      const { service, prisma } = createHarness([order]);
      mockConfirmApi(paydunyaConfirmResponse());

      await expect(
        service.confirmTransactionByToken('test_token_1', client),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('3. Liaison facture ↔ commande', () => {
    it('refuse une facture qui n\'est pas celle émise pour la commande', async () => {
      // La commande a été facturée avec `test_token_1`, mais le token encaissé
      // est `test_token_autre` (facture d'une AUTRE commande, ou créée depuis
      // le dashboard PayDunya).
      const order = buildOrder();
      const { service, prisma } = createHarness([order]);
      mockConfirmApi(
        paydunyaConfirmResponse({
          invoice: { token: 'test_token_autre', total_amount: '5000' },
        }),
      );

      await expect(
        service.confirmTransactionByToken('test_token_autre', client),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('refuse le règlement si aucune facture n\'est enregistrée pour la commande', async () => {
      const order = buildOrder({ paydunyaToken: null });
      const { service, prisma } = createHarness([order]);
      mockConfirmApi(paydunyaConfirmResponse());

      await expect(
        service.confirmTransactionByToken('test_token_1', client),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('4. Contrôle de propriété', () => {
    it('refuse un appelant qui n\'est ni le client ni le propriétaire de la boutique', async () => {
      const order = buildOrder();
      const { service, prisma } = createHarness([order]);
      mockConfirmApi(paydunyaConfirmResponse());

      await expect(
        service.confirmTransactionByToken('test_token_1', intruder),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('le contrôle de propriété passe AVANT la réconciliation (aucune fuite d\'information)', async () => {
      const order = buildOrder();
      const { service, prisma } = createHarness([order]);
      // Montant volontairement incohérent : un intrus ne doit pas apprendre
      // « montant incohérent » sur une commande qui n'est pas la sienne.
      mockConfirmApi(
        paydunyaConfirmResponse({ invoice: { token: 'test_token_1', total_amount: '1' } }),
      );

      await expect(
        service.confirmTransactionByToken('test_token_1', intruder),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('5. La commande provient des DONNÉES SERVEUR, jamais du client', () => {
    it('la commande est résolue depuis les custom_data de la facture', async () => {
      const order = buildOrder();
      const { service, prisma } = createHarness([order]);
      mockConfirmApi(paydunyaConfirmResponse());

      await service.confirmTransactionByToken('test_token_1', client);

      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order_1' } }),
      );
    });

    it('TÉMOIN DE RÉGRESSION : sans custom_data, l\'ancien code prenait le ?orderId= de l\'appelant', async () => {
      // Replica EXACT de l'ancienne règle de résolution de commande.
      const legacyResolve = (customData: any, fallbackOrderId?: string) =>
        customData.orderId ?? fallbackOrderId;

      // Facture créée hors de notre API (dashboard PayDunya) : pas de custom_data.
      expect(legacyResolve({}, 'order_victim')).toBe('order_victim');

      // Le service CORRIGÉ, lui, n'identifie aucune commande et ne règle rien.
      const { service, prisma } = createHarness([buildOrder()]);
      mockConfirmApi(
        paydunyaConfirmResponse({ custom_data: {}, invoice: { token: 'test_token_dashboard' } }),
      );

      await expect(
        service.confirmTransactionByToken('test_token_dashboard', client),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
      expect(prisma.order.findFirst).not.toHaveBeenCalled();
    });
  });
});
