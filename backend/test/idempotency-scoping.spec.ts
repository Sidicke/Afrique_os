import { IdempotencyService } from '../src/common/services/idempotency.service';

/**
 * Correctif C1 — Non-collision des clés d'idempotence entre endpoints.
 *
 * CONTEXTE
 * ---------
 * Le client navigateur envoyait UNE SEULE clé UUID sur deux endpoints
 * distincts (création de commande puis création de facture PayDunya).
 *
 * Le service d'idempotence indexait ses enregistrements sur la seule `key`
 * (contrainte UNIQUE globale en base), en ignorant le paramètre `path`.
 * La requête de création de facture récupérait donc en cache la réponse de
 * la création de commande — un objet `OrderView` au lieu d'une
 * `PayDunyaCheckoutResponse`.
 *
 * Conséquence observée : `res.checkoutUrl` valait `undefined`, le frontend
 * n'était jamais redirigé vers PayDunya et affichait « Paiement confirmé »
 * alors qu'aucune facture n'avait été créée et qu'aucun centime n'était
 * encaissé.
 *
 * Ces tests verrouillent le comportement correct : le scoping par endpoint.
 */

describe('IdempotencyService — scoping par endpoint (correctif C1)', () => {
  /**
   * Faux Prisma reproduisant fidèlement le comportement de la contrainte
   * UNIQUE COMPOSITE (key, path) : deux enregistrements peuvent partager la
   * même `key` s'ils portent des `path` différents.
   */
  function createInMemoryPrisma() {
    const rows: any[] = [];

    const matches = (row: any, where: any) => {
      // Where unique composite : { key_path: { key, path } }
      if (where?.key_path) {
        return row.key === where.key_path.key && row.path === where.key_path.path;
      }
      // Where par id
      if (where?.id) return row.id === where.id;
      // Ancien comportement (unicité globale sur `key` seule) — conservé
      // uniquement pour prouver qu'il ne doit plus être utilisé.
      if (where?.key) return row.key === where.key;
      return false;
    };

    return {
      idempotencyKey: {
        findUnique: async ({ where }: any) => {
          const found = rows.find((r) => matches(r, where));
          return found ? { ...found } : null;
        },
        upsert: async ({ where, create, update }: any) => {
          const existing = rows.find((r) => matches(r, where));
          if (existing) {
            Object.assign(existing, update);
            return { ...existing };
          }
          const created = { id: `id_${rows.length + 1}`, ...create };
          rows.push(created);
          return { ...created };
        },
        delete: async ({ where }: any) => {
          const idx = rows.findIndex((r) => matches(r, where));
          if (idx >= 0) rows.splice(idx, 1);
          return {};
        },
      },
      // Accès au store pour les assertions
      __rows: rows,
    };
  }

  const ORDER_PATH = '/orders/create';
  const PAYDUNYA_PATH = '/api/v1/payments/paydunya/create-transaction';

  let prisma: any;
  let service: IdempotencyService;

  beforeEach(() => {
    prisma = createInMemoryPrisma();
    service = new IdempotencyService(prisma as any);
  });

  describe('1. Non-collision entre endpoints distincts', () => {
    it('ne renvoie PAS la réponse de la création de commande lors de la création de facture', async () => {
      const sharedKey = 'uuid-partage-entre-deux-endpoints';

      // 1) Création de commande — réponse de type "commande".
      await service.saveRecord(
        sharedKey,
        ORDER_PATH,
        201,
        { id: 'order_123', reference: 'AC-XYZ', total: 5000 },
        3600,
      );

      // 2) Création de la facture PayDunya — MÊME clé, endpoint DIFFÉRENT.
      const cached = await service.getRecord(sharedKey, PAYDUNYA_PATH);

      // ⚠️ C'est LA régression du bug C1 : avant le correctif, `cached` était
      // non-null et contenait la réponse de la commande.
      expect(cached).toBeNull();
    });

    it('crée deux enregistrements distincts pour la même clé sur deux endpoints', async () => {
      const sharedKey = 'uuid-partage-entre-deux-endpoints';

      await service.saveRecord(sharedKey, ORDER_PATH, 201, { id: 'order_123' }, 3600);
      await service.saveRecord(
        sharedKey,
        PAYDUNYA_PATH,
        201,
        { checkoutUrl: 'https://paydunya/checkout/x', token: 'tok_x', amount: 5000 },
        86400,
      );

      expect(prisma.__rows).toHaveLength(2);
      expect(prisma.__rows[0].path).toBe(ORDER_PATH);
      expect(prisma.__rows[1].path).toBe(PAYDUNYA_PATH);
      expect(prisma.__rows[0].key).toBe(prisma.__rows[1].key);
    });

    it('chaque endpoint récupère bien SA propre réponse', async () => {
      const sharedKey = 'uuid-partage-entre-deux-endpoints';

      await service.saveRecord(sharedKey, ORDER_PATH, 201, { id: 'order_123' }, 3600);
      await service.saveRecord(
        sharedKey,
        PAYDUNYA_PATH,
        201,
        { checkoutUrl: 'https://paydunya/checkout/x', token: 'tok_x', amount: 5000 },
        86400,
      );

      const fromOrder = await service.getRecord(sharedKey, ORDER_PATH);
      const fromPayDunya = await service.getRecord(sharedKey, PAYDUNYA_PATH);

      expect(fromOrder?.responseBody).toEqual({ id: 'order_123' });
      expect(fromPayDunya?.responseBody).toEqual({
        checkoutUrl: 'https://paydunya/checkout/x',
        token: 'tok_x',
        amount: 5000,
      });
    });
  });

  describe('2. Idempotence conservée à l\'intérieur d\'un même endpoint', () => {
    it('renvoie la réponse mémorisée pour la même clé sur le même endpoint', async () => {
      const key = 'uuid-identique';

      await service.saveRecord(key, PAYDUNYA_PATH, 201, { checkoutUrl: 'u1' }, 86400);
      const second = await service.getRecord(key, PAYDUNYA_PATH);

      expect(second).not.toBeNull();
      expect(second?.responseBody).toEqual({ checkoutUrl: 'u1' });
      expect(second?.statusCode).toBe(201);
    });

    it('met à jour la réponse mémorisée sans dupliquer d\'enregistrement', async () => {
      const key = 'uuid-identique';

      await service.saveRecord(key, PAYDUNYA_PATH, 201, { checkoutUrl: 'u1' }, 86400);
      await service.saveRecord(key, PAYDUNYA_PATH, 201, { checkoutUrl: 'u2' }, 86400);

      expect(prisma.__rows).toHaveLength(1);
      const cached = await service.getRecord(key, PAYDUNYA_PATH);
      expect(cached?.responseBody).toEqual({ checkoutUrl: 'u2' });
    });

    it('isole deux clés distinctes sur le même endpoint', async () => {
      await service.saveRecord('uuid-A', PAYDUNYA_PATH, 201, { checkoutUrl: 'uA' }, 86400);
      await service.saveRecord('uuid-B', PAYDUNYA_PATH, 201, { checkoutUrl: 'uB' }, 86400);

      expect(prisma.__rows).toHaveLength(2);
      expect((await service.getRecord('uuid-A', PAYDUNYA_PATH))?.responseBody).toEqual({
        checkoutUrl: 'uA',
      });
      expect((await service.getRecord('uuid-B', PAYDUNYA_PATH))?.responseBody).toEqual({
        checkoutUrl: 'uB',
      });
    });
  });

  describe('3. Expiration et cas limites', () => {
    it('considère la clé caduque une fois expirée et libère le couple (key, path)', async () => {
      const key = 'uuid-expire';
      await service.saveRecord(key, PAYDUNYA_PATH, 201, { checkoutUrl: 'u1' }, 3600);

      // Expire le couple (key, path) de ce endpoint uniquement.
      const row = prisma.__rows.find((r: any) => r.path === PAYDUNYA_PATH);
      row.expiresAt = new Date(Date.now() - 1000);

      const cached = await service.getRecord(key, PAYDUNYA_PATH);
      expect(cached).toBeNull();
      // L'enregistrement expiré a été purgé.
      expect(prisma.__rows.find((r: any) => r.path === PAYDUNYA_PATH)).toBeUndefined();
    });

    it('ne supprime pas l\'enregistrement d\'un autre endpoint lors de l\'expiration', async () => {
      const key = 'uuid-partage-expire';
      await service.saveRecord(key, ORDER_PATH, 201, { id: 'order_1' }, 3600);
      await service.saveRecord(key, PAYDUNYA_PATH, 201, { checkoutUrl: 'u1' }, 3600);

      const paydunyaRow = prisma.__rows.find((r: any) => r.path === PAYDUNYA_PATH);
      paydunyaRow.expiresAt = new Date(Date.now() - 1000);

      await service.getRecord(key, PAYDUNYA_PATH);

      // L'enregistrement de la commande doit survivre.
      expect(prisma.__rows.find((r: any) => r.path === ORDER_PATH)).toBeDefined();
    });

    it('ignore les clés ou paths vides', async () => {
      expect(await service.getRecord('', PAYDUNYA_PATH)).toBeNull();
      expect(await service.getRecord('uuid', '')).toBeNull();
      await service.saveRecord('', PAYDUNYA_PATH, 201, {}, 3600);
      await service.saveRecord('uuid', '', 201, {}, 3600);
      expect(prisma.__rows).toHaveLength(0);
    });
  });

  describe('4. Témoin de régression — l\'ancien comportement (unicité globale) collisionnait', () => {
    /**
     * Ce test rejoue l'ANCIEN comportement du service (recherche par la
     * seule `key`, sans `path`) contre le MÊME faux Prisma.
     *
     * Il sert de témoin permanent : il prouve que le test de non-collision
     * detects réellement le bug C1, et que le correctif (recherche par le
     * couple (key, path)) est bien ce qui empêche la collision.
     *
     * Ce témoin est volontairement不复ACTORÉ : il doit continuer à
     * refléter l'ancien code pour rester un témoin fidèle du bug.
     */
    it('l\'ancienne recherche par la seule `key` renvoie la réponse de l\'autre endpoint', async () => {
      const sharedKey = 'uuid-partage-entre-deux-endpoints';

      // Ancien `saveRecord` : upsert sur la seule `key`.
      await prisma.idempotencyKey.upsert({
        where: { key: sharedKey },
        create: {
          key: sharedKey,
          path: ORDER_PATH,
          statusCode: 201,
          responseBody: { id: 'order_123', reference: 'AC-XYZ', total: 5000 },
          expiresAt: new Date(Date.now() + 3600_000),
        },
        update: {},
      });

      // Ancien `getRecord` : recherche par la seule `key`, `path` ignoré.
      const legacyCached = await prisma.idempotencyKey.findUnique({
        where: { key: sharedKey },
      });

      // ⚠️ C'est EXACTEMENT le bug C1 : la réponse de la commande est
      // renvoyée auendpoint de création de facture.
      expect(legacyCached).not.toBeNull();
      expect((legacyCached?.responseBody as any).reference).toBe('AC-XYZ');
      expect((legacyCached?.responseBody as any).checkoutUrl).toBeUndefined();

      // Whereas the corrected service, on the same key and same fake Prisma,
      // returns nothing for the payment endpoint.
      const correctedCached = await service.getRecord(sharedKey, PAYDUNYA_PATH);
      expect(correctedCached).toBeNull();
    });
  });
});
