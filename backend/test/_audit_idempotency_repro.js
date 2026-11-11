// Reproduction du bug d'idempotence inter-endpoints (finding C1 de l'audit).
//
// Contexte : le frontend genere UN SEUL UUID par session de checkout
// (checkoutKeyRef.current) et le reutilise pour DEUX requetes differentes :
//   1) POST /orders/boutique/:id                  (Idempotency-Key: K)
//   2) POST /payments/paydunya/create-transaction  (Idempotency-Key: K)
//
// Or IdempotencyService.getRecord() filtre uniquement sur `key` et IGNORE
// le parametre `path` -> la 2e requete recupere le cache de la 1re.
//
// Resultat : aucune facture PayDunya n'est creee, `res.checkoutUrl` est
// undefined, et le frontend affiche "Paiement confirme" sans encaissement.
//
// Execution : node backend/test/_audit_idempotency_repro.js
//
// Ce script est un harnais de simulation (faux Prisma) : il ne touche pas
// la base de donnees reelle. Il reproduit la logique de lookup du service.

const store = new Map(); // key -> record

const prisma = {
  idempotencyKey: {
    findUnique: async ({ where }) => store.get(where.key) ?? null,
    upsert: async ({ where, create, update }) => {
      const rec = { ...create, ...update, key: where.key };
      store.set(where.key, rec);
      return rec;
    },
    delete: async () => null,
  },
};

// --- IdempotencyService (copie conforme a src/common/services/idempotency.service.ts)
const getRecord = async (key, path) => {
  if (!key) return null;
  const record = await prisma.idempotencyKey.findUnique({ where: { key } });
  if (!record) return null;
  if (record.expiresAt < new Date()) return null;
  console.log(
    `   [getRecord] key="${key}" path="${path}" -> HIT (le path n'est PAS utilise dans la requete)`,
  );
  return { statusCode: record.statusCode, responseBody: record.responseBody };
};

const saveRecord = async (key, path, statusCode, responseBody, ttlSeconds = 86400) => {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await prisma.idempotencyKey.upsert({
    where: { key },
    create: { key, path, statusCode, responseBody, expiresAt },
    update: { statusCode, responseBody, expiresAt },
  });
};

(async () => {
  // Le frontend envoie la MEME cle UUID pour les deux appels (checkoutKeyRef.current).
  const sharedKey = 'c1f0e4a2-UUID-partage-entre-2-endpoints';

  console.log('1) POST /orders/boutique/:id  (Idempotency-Key: shared)');
  await saveRecord(
    sharedKey,
    '/orders/create',
    201,
    { id: 'order_123', reference: 'AC-XYZ', total: 5000 },
    3600,
  );
  console.log('   -> commande creee, cle enregistree (path=/orders/create, TTL 1h)\n');

  console.log('2) POST /payments/paydunya/create-transaction  (Idempotency-Key: shared)');
  const cached = await getRecord(sharedKey, '/api/v1/payments/paydunya/create-transaction');
  console.log('   -> service PayDunya retourne CACHED (aucune facture PayDunya creee) :');
  console.log('   ', JSON.stringify(cached.responseBody));
  console.log('   -> checkoutUrl present ?', 'checkoutUrl' in cached.responseBody);
  console.log('   -> token present ?', 'token' in cached.responseBody);
  console.log('   -> mode present ?', 'mode' in cached.responseBody);
  console.log(
    '\n   Le frontend voit res.checkoutUrl === undefined -> affiche "Paiement confirme" SANS paiement.',
  );
})();
