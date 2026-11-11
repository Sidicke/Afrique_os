# Audit du Processus de Paiement — Afrique OS / PayDunya

**Date :** 2026-11-09
**Périmètre audité :** `origin/main` @ `f7d6cf2` — `backend/src/paydunya/`, `backend/src/refunds/`, `backend/src/orders/`, `backend/src/boutiques/`, `backend/src/common/services/idempotency.service.ts`, `backend/src/main.ts`, `backend/src/app.module.ts`, `frontend/src/components/store/CartDrawer.tsx`
**Référence :** Documentation officielle PayDunya (HTTP/JSON) + SDKs PHP/NodeJS/Python officiels

> **Note de périmètre importante.** Le dépôt local était en retard (`HEAD` = `3dd61ae`) sur `origin/main` (`f7d6cf2`). L'audit a été réalisé sur l'arbre `origin/main` extrait séparément. Par ailleurs, le module `fedapay` visible dans le checkout local est **obsolète** : `origin/main` a remplacé FedaPay par **PayDunya**. La branche `origin/feature/fedapay-marketplace-backend` (non fusionnée, 4 commits) contient une **deuxième** implémentation de paiement concurrente (`payment-crypto.service.ts`, payouts, sous-comptes) — voir §7.

---

## 1. Synthèse exécutive

Les quatre piliers sont **déclarés dans le code** (commentaires « 1er pilier », « 2e pilier », etc.) mais **un seul est réellement conforme**. Le système repose sur un modèle de confiance implicite plutôt que sur des invariants vérifiables.

| Pilier | Statut | Verdict |
|---|---|---|
| 1. Idempotence des transactions | ❌ **Rompu** | La clé d'idempotence est partagée entre deux endpoints distincts → **aucune facture PayDunya n'est créée** et l'UI affiche « Paiement confirmé ». Reproductible. |
| 2. Chiffrement / authenticité (E2EE) | ⚠️ **Partiel** | Le hash SHA-512 de la Master Key est implémenté correctement, mais **la clé du webhook est la Master Key** (clé d'API, pas de secret webhook dédié), et le fallback HMAC accepte une charge utile arbitraire. |
| 3. Rate limiting | ⚠️ **Partiel** | Les routes paiement ont des seuils dédiés, mais le throttler est **en mémoire**, keyed par IP, et **`trust proxy` n'est activé qu'en production** → contournable en staging/dev. |
| 4. Vérification côté serveur | ❌ **Rompu** | **Le montant payé n'est jamais comparé au montant attendu.** Une facture de 500 FCFA peut solder une commande de 50 000 FCFA. Aucun contrôle de la devise. |

**Découverte structurelle majeure :** le modèle de données ne contient **aucune entité `Payment` / `Transaction` / `Ledger`**. L'argent n'est représenté que par un `balance` mutable sur `Boutique` et un `paymentRef` texte libre sur `Order`. Il n'existe donc **aucune comptabilité en partie double** : impossible de prouver qu'un euro reçu等于 un euro sort, et impossible de rapprocher les soldes avec PayDunya.

**Verdict global : 🔴 NE PAS passer en production live avant correction des findings CRITICAL (C1, C3, C4) et HIGH (H1–H3).**

---

## 2. Cartographie du flux

```
CLIENT (CartDrawer.tsx)
  │
  ├─(1) POST /orders/boutique/:id          Idempotency-Key: K ──┐
  │       → orders.service.create()        saveRecord(K, '/orders/create', TTL 1h)
  │                                          │
  └─(2) POST /payments/paydunya/create-transaction  Idempotency-Key: K ──┐
          → paydunya.service.createCheckoutTransaction()                    │
             getRecord(K)  ← ⚠️ RETROUVE L'ENREGISTREMENT (1)               │
             ⚠️ AUCUNE FACTURE PAYDUNYA CRÉÉE                                │
                                                                          │
   ┌──────────────────────────────────────────────────────────────────────────┘
   ▼
PAYDUNYA  ──►  redirect checkout ──►  client paie
                                            │
              ┌─────────────────────────────┴──────────────────────────────┐
              ▼                                                            ▼
   (A) IPN  POST /payments/paydunya/webhook                     (B) return_url
       hash SHA-512(MasterKey)                                    GET /confirm/:token
       → settlePaidOrderViaPayDunya()                            → confirm API PayDunya
       → idempotence: paydunya_webhook_<eventId>                 → settlePaidOrderViaPayDunya()
                                                                  → idempotence: AUCUNE ⚠️
              └──────────────────┬──────────────────────────────────┘
                                 ▼
        $transaction:  order → PAID  |  commission  |  boutique.balance += net
                        SettlementAllocation (séquestre)  |  cashback 0,5 %
```

**Trois chemins d'entrée money-in** existent et sont tous publics (`@Public()`) :
`create-transaction`, `webhook`, `confirm/:token`.

---

## 3. Findings

### 🔴 C1 — CRITIQUE : Collision de clé d'idempotence entre deux endpoints → le paiement n'est jamais encaissé

**Fichiers :** `frontend/src/components/store/CartDrawer.tsx:267` et `:343` · `backend/src/common/services/idempotency.service.ts:19-39` · `backend/src/paydunya/paydunya.service.ts:48-54`

**Constat.** Le frontend génère **un seul UUID par session de checkout** (`checkoutKeyRef.current`, `CartDrawer.tsx:127`) et le réutilise pour **deux requêtes différentes** :

```ts
// CartDrawer.tsx:267  — création de commande
idempotencyKey: checkoutKeyRef.current || undefined,
// CartDrawer.tsx:343  — création de la facture PayDunya
], checkoutKeyRef.current || undefined);
```

Or `IdempotencyService.getRecord()` **ignore complètement le paramètre `path`** :

```ts
// idempotency.service.ts:22-26
const record = await this.prisma.idempotencyKey.findUnique({
  where: { key },          // ← seul critère ; `path` n'est jamais filtré
});
```

Le schéma confirme le problème : `key String @unique` — l'unicité est **globale**, pas composite `@@unique([key, path])` (`schema.prisma:496`).

**Conséquence (reproductible).** La requête (2) reçoit en cache la réponse de la requête (1) — un `OrderView` — au lieu d'une `PayDunyaCheckoutResponse` :

```
1) POST /orders/boutique/:id      → saveRecord(K, '/orders/create', {id:'order_123', reference:'AC-XYZ', total:5000})
2) POST /payments/paydunya/create-transaction
   → getRecord(K) → HIT
   → {id:'order_123', reference:'AC-XYZ', total:5000}
   → checkoutUrl present ? false
   → token present ? false
   → mode present ? false
```

Côté frontend (`CartDrawer.tsx:345-356`), `res.checkoutUrl` est `undefined` → le `window.location.href = res.checkoutUrl` n'est jamais exécuté. Le code tombe alors dans la branche `paymentMethod === "PAYDUNYA"` → `setStep("done")` → **l'écran « Paiement confirmé » s'affiche, la commande reste `PENDING`, et aucun franc n'est jamais encaissé.** Le client pense avoir payé ; la commande n'est jamais libérée ; le vendeur n'est jamais crédité.

**Second impact, plus grave :** ce chemin rend le webhook **inutilisable en pratique**. Même si le client paie réellement, l'IPN arrive et appelle `settlePaidOrderViaPayDunya()` avec un `orderId` correct — mais comme la commande n'a jamais été marquée payée côté front, le comportement dépend uniquement du webhook. Le système est dans un état incohérent où l'UI et la base de données divergent.

**Correctif :**
1. Rendre l'unicité composite : `@@unique([key, path])` + migration (`prisma migrate dev`), et filtrer par `path` dans `getRecord`/`saveRecord`.
2. Générer **deux clés distinctes** côté frontend : `checkoutKeyRef` pour la commande, `paymentKeyRef` pour la transaction.
3. **Défense en profondeur** : faire échouer explicitement `createCheckoutTransaction` si la réponse en cache ne contient pas `checkoutUrl` — ne jamais retourner une charge utile d'un autre type d'endpoint.

> Le même défaut existe sur la branche `feature/fedapay-marketplace-backend` (`common/services/idempotency.service.ts` y est identique).

---

### 🔴 C2 — CRITIQUE : Le montant payé n'est JAMAIS comparé au montant attendu

**Fichiers :** `backend/src/paydunya/paydunya.service.ts:609-783` (`settlePaidOrderViaPayDunya`) · `:425-538` (`confirmTransactionByToken`)

**Constat.** Le pilier « Zero-Trust » (recalcul du montant serveur) est **correctement implémenté à la création** de la facture :

```ts
// paydunya.service.ts:75
const serverCalculatedAmount = Number(order.total);   // ✅ source de vérité = DB
// :188
total_amount: serverCalculatedAmount,
```

Mais **au moment du règlement**, le montant effectivement payé par PayDunya n'est **jamais relu, ni comparé**. La réponse IPN contient bien `invoice.total_amount` (documenté officiellement), et la réponse `confirm` contient `invoice.total_amount` — **le champ est présent dans le payload et n'est jamais lu** :

```ts
// paydunya.service.ts:280-340  handleWebhook()
const event = typeof bodyPayload === 'object' ? bodyPayload : JSON.parse(rawBody.toString());
// → event.invoice.total_amount existe… et n'est JAMAIS consulté
const invoice = ipnData?.invoice ?? parsedBody?.entity ?? parsedBody?.transaction ?? {};
// → `invoice` n'est utilisé QUE pour extraire `token` / `custom_data`

// paydunya.service.ts:504-507  confirmTransactionByToken()
const invoiceStatus = String(data.status ?? 'pending');
const customData = data.custom_data ?? data.invoice?.custom_data ?? {};
// → data.invoice.total_amount n'est JAMAIS consulté
```

Le règlement crédite systématiquement `order.total` de la base :

```ts
// paydunya.service.ts:679-684
await tx.boutique.update({
  where: { id: order.boutiqueId },
  data: { balance: { increment: netAmount } },   // netAmount dérivé de order.total (DB)
});
```

**Scénarios d'exploitation concrets.**

1. **Sous-paiement.** PayDunya autorise les factures à montant fixe ; mais si un、未来 config (ou un Bug) crée une facture avec un `total_amount` inférieur à `order.total`, le règlement crédite quand même `order.total`. La commande est livrée, le vendeur est crédité du montant complet, et la différence n'est jamais constatée.

2. **Manipulation de la commande entre création et paiement.** La commande est créée à `t0`, la facture à `t0+ε`. Si entre les deux le total de la commande est modifié (politique de livraison recalculée, remise appliquée par un back-office, correction de stock), **la facture reste à l'ancien montant** mais le règlement crédite le **nouveau** `order.total`. L'écart est absorbé silencieusement par la boutique.

3. **Le cas le plus grave : la commande est deductible sans qu'aucune facture ne soit.payée.** `confirmTransactionByToken()` est un endpoint **public** (`@Public()`, `paydunya.controller.ts:75`) qui prend un `token` en paramètre d'URL. `handleWebhook` et `confirm` **partagent le même code de règlement** (`settlePaidOrderViaPayDunya`) mais avec des sources d'ID **différentes** :
   - webhook → `custom_data.orderId` (posé par le serveur à la création — fiable)
   - confirm → `customData.orderId ?? fallbackOrderId` où **`fallbackOrderId` vient du query string `?orderId=` fourni par l'appelant** (`paydunya.service.ts:506`, `paydunya.controller.ts:85`).

   Le `confirm` ne vérifie **que** `invoiceStatus === 'completed'` sur la réponse de l'API PayDunya. Or un `token` PayDunya est **devinable et non secret** : il est renvoyé au client dans l'URL de retour, il apparaît dans les logs, et il est **préfixé de manière prévisible** (`test_` en sandbox, alphanumérique court en live). Un attaquant qui possède un token de facture **complétée à 100 FCFA** peut l'utiliser sur n'importe quelle commande :

   ```
   GET /api/v1/payments/paydunya/confirm/test_XXXX?orderId=<commande_victime>
   → confirm API : status = "completed" ✔
   → orderId = fallbackOrderId (query string, contrôlelé par l'attaquant)
   → settlePaidOrderViaPayDunya(orderId_victime)
   → commande victime marquée PAID + boutique créditée du montant de la victime
   ```

   Il manque **trois** garde-fous sur ce chemin : (a) la comparaison du montant, (b) le contrôle que le `token` appartient bien à la commande visée, (c) la réconciliation du `custom_data` côté serveur.

**Correctif (prioritaire).** Introduire une **fonction unique de réconciliation** utilisée par *les deux* chemins :

```ts
// Vérifie que la facture PayDunya correspond bien à la commande attendue.
private assertInvoiceMatchesOrder(invoice: any, order: Order): void {
  const expected = Number(order.total);
  const paid = Number(invoice?.total_amount);
  if (!Number.isFinite(paid)) throw new BadRequestException('Montant de la facture introuvable.');
  if (paid !== expected) {
    throw new BadRequestException(
      `Montant incohérent : attendu ${expected}, encaissé ${paid}.`,
    );
  }
  if (invoice?.token && order.paymentRef && order.paymentRef !== `PAYDUNYA-${invoice.token}`) {
    throw new BadRequestException('Facture non rattachée à cette commande.');
  }
}
```

Puis, sur `confirm/:token` :
- **supprimer `fallbackOrderId`** (le `?orderId=` du query string) — l'ordre doit être déduit **du `custom_data` retourné par l'API PayDunya**, jamais du client ;
- **supprimer l'endpoint public `GET confirm/:token`** au profit d'un `POST` authentifié, ou au minimum exiger une session authentifiée + vérifier la propriété de la commande ;
- **enregistrer le token à la création** de la facture (champ `Order.paymentRef` ou table `Payment`) afin de pouvoir lier facture ↔ commande de façon fiable.

---

### 🔴 C3 — CRITIQUE : Aucun modèle de données de paiement → pas de comptabilité en partie double

**Fichiers :** `backend/prisma/schema.prisma` (modèles `Order`, `Boutique`, `SettlementAllocation`, `WithdrawalRequest`, `PointTransaction`)

**Constat.** Le schéma contient `PointTransaction` (fidélité) mais **aucun** `Payment`, `Transaction`, `Ledger` ni `LedgerEntry` — vérifié par recherche exhaustive sur le schéma. L'argent n'existe que comme :

- `Boutique.balance` (`Decimal`, muté par `increment` / `decrement` — un simple compteur) ;
- `Order.paymentRef` (`String?`, **texte libre, non unique, sans index**) ;
- `SettlementAllocation` (allocation de séquestre, alimentée au règlement).

**Conséquences sur les principes fondamentaux des transferts :**

1. **Pas de preuve d'auditabilité.** On ne peut pas répondre à « d'où viennent les 500 000 FCFA sur le solde de cette boutique ? ». `paymentRef` est un `String?` libre : deux commandes peuvent porter la même valeur, un opérateur peut en écrire une incohérente.

2. **Pas de rapprochement PSP.** Le solde `Boutique` est maintenu par les seules logique applicative. Aucune routine ne le compare au solde réel du compte PayDunya. **Écart de rapprochement indétecté** : c'est précisément le contrôle qui manque dans tout système de transfert.

3. **Double crédit impossible à prouver.** Le verrou `updateMany({ status: { not: PAID } })` (`paydunya.service.ts:632-644`) protège la course webhook ↔ confirmation manuelle. C'est **correct et bien conçu**. Mais l'audit ne peut pas *prouver* l'absence de double crédit, seulement la déduire du code.

4. **Le cycle de sortie de l'argent est incomplet — finding H3.**

**Correctif.** Introduire une table `Payment` en écriture seule (append-only), alimentée à chaque événement financier :

```prisma
model Payment {
  id            String   @id @default(cuid())
  orderId       String?
  boutiqueId    String
  provider      String   // "PAYDUNYA"
  providerRef   String   // token PayDunya
  kind          String   // "CAPTURE" | "REFUND" | "PAYOUT" | "COMMISSION" | "CASHBACK"
  grossAmount   Decimal  @db.Decimal(14, 2)
  netAmount     Decimal  @db.Decimal(14, 2)
  currency      String   @default("XOF")
  direction     String   // "IN" | "OUT"
  createdAt     DateTime @default(now())

  @@unique([provider, providerRef, kind])
  @@index([boutiqueId, createdAt])
}
```

`@@unique([provider, providerRef, kind])` devient **la** source de vérité d'idempotence au niveau métier — plus robuste qu'une clé d'idempotence HTTP, qui est de toute façon falsifiable par le client.

---

### 🟠 H1 — ÉLEVÉ : La clé de vérification du webhook est la Master Key d'API (pas de secret dédié)

**Fichiers :** `backend/src/paydunya/paydunya.service.ts:281-296` et `:791-886`

**Constat.** Le schéma officiel PayDunya est clair : le hash IPN est `SHA-512(YourMasterKey)`, et il sert à prouver que la requête vient de PayDunya. L'implémentation le respecte — mais avec une **faiblesse de design** :

```ts
// paydunya.service.ts:281-283
const masterKey =
  this.configService.get<string>('PAYDUNYA_MASTER_KEY') ||
  this.configService.get<string>('PAYDUNYA_WEBHOOK_SECRET');
```

La Master Key est **la clé d'API** : elle est envoyée en clair (header `PAYDUNYA-MASTER-KEY`) à PayDunya sur **chaque** appel sortant, et vit dans `.env`. Elle est donc exposée sur un canal beaucoup plus large que le webhook. Le `.env.example` (`:76-79`) ne définit **d'ailleurs pas** `PAYDUNYA_WEBHOOK_SECRET` — le fallback est donc inerte, et `PAYDUNYA_MASTER_KEY` est toujours utilisé.

**Aggravant — le fallback HMAC.** Si le hash SHA-512 ne correspond pas, le code tente un HMAC sur le corps brut. Le comportement est **fail-open sur le type de secret** : une valeur fournie dans l'en-tête `x-paydunya-signature` au format `t=...,s=...` est acceptée si elle correspond à un HMAC-SHA256/SHA512 du corps calculé avec la Master Key. Cela **élargit la surface d'acceptation** sans necessity impérieuse, et le corps peut être re-sérialisé différemment par un intermédiaire (ce qui explique probablement pourquoi le fallback existe).

**Point positif à conserver :** le fail-closed est correctement implémenté — sans clé configurée, le webhook est rejeté (`paydunya.service.ts:288-296`), et les comparaisons utilisent `crypto.timingSafeEqual` (`:389-391`, `:397-399`, `:852-854`, `:866-868`, `:877-879`). C'est du bon travail.

**Correctif.**
1. Exiger un secret webhook **dédié** (`PAYDUNYA_IPN_SECRET`), indépendant de la Master Key, et **refuser de démarrer en production** s'il est absent.
2. Supprimer le fallback HMAC (non supporté par PayDunya) ou le restreindre à une comparaison stricte `t=` + `v1=` avec vérification de la fraîcheur du timestamp (anti-rejeu).
3. Vérifier le **fraîcheur** du timestamp : rien n'empêche actuellement le rejeu d'un webhook valide capturé.

---

### 🟠 H2 — ÉLEVÉ : Rate limiting en mémoire, keyed par IP, contournable en staging/dev

**Fichiers :** `backend/src/app.module.ts:31-41` et `:65` · `backend/src/main.ts:83-91` · `backend/src/paydunya/paydunya.controller.ts:33, 53, 77`

**Constat.** Les seuils dédiés aux routes paiement sont bien posés :

| Route | Limite | Fenêtre |
|---|---|---|
| `POST /payments/paydunya/create-transaction` | 5 | 60 s |
| `POST /payments/paydunya/webhook` | 20 | 60 s |
| `GET /payments/paydunya/confirm/:token` | 15 | 60 s |

Limite globale : `THROTTLE_LIMIT=120` / `THROTTLE_TTL=60000`. La suite `rate-limiting-stress.e2e-spec.ts:35-51` valide le 429 sur `create-transaction`. **C'est un bon point de départ.**

**Mais trois faiblesses structurelles :**

1. **Stockage en mémoire.** `@nestjs/throttler` v6 utilise un `ThrottlerStorage` en mémoire par défaut. Aucune configuration `ThrottlerStorage`/`storage:` n'est présente dans le codebase (recherche exhaustive : aucune occurrence). Conséquences :
   - **Non distribué** : en cas de scaling horizontal (PM2 cluster, k8s, multi-instance), chaque instance compte séparément → la limite réelle est **multipliée par le nombre d'instances**. Un attaquant contourne le rate limiting en.dispatchant sur plusieurs instances.
   - **Non durable** : un redémarrage réinitialise tous les compteurs.

2. **`trust proxy` activé uniquement en production.** `main.ts:88-91` ne pose `trust proxy` que si `isProd`. Le commentaire est explicite et le raisonnement est correct pour éviter le spoofing `X-Forwarded-For` **en dev**. Mais cela crée une **asymétrie** : le rate limiting en staging/dev repose sur l'IP socket (correcte mais non représentative de la prod), et en production la config dépend d'un proxy correctement configuré **en amont**. Sans vérification que le reverse proxy **réécrit** (et n'ajoute pas) `X-Forwarded-For`, la limite prod est contournable par spoofing d'en-tête. *À vérifier sur l'infrastructure réelle.*

3. **Keying par IP seule.** `ThrottlerGuard` key par défaut sur l'IP de la requête. Sur un réseau mobile (Bénin, opérateurs MTN/Moov/Celtiis), **des milliers d'utilisateurs partagent une même IP CGNAT** → un attaquant depuis un seul IP peut bloquer des payeurs légitimes, ou l'inverse : le seuil de 5/min sur `create-transaction` peut être atteint collectivement par des clients légitimes d'un même opérateur.

**Correctif.**
1. Implémenter un `ThrottlerStorage` **Redis** (ou un store partagé) → limite correcte en multi-instance.
2. Introduire un **keying composite** : `IP + userId` (ou `IP + orderId`) via `getTracker()` personnalisé, pour que le partage d'IP mobile n' penalise pas les utilisateurs légitimes.
3. Sur le webhook : ne pas limiter par IP mais **dédupliquer** (l'idempotence le fait déjà) — un webhook légitime ne doit jamais être rejeté par un limiteur.
4. **Ajouter une limite sur la route `create-transaction` qui dépende du *montant* ou du *nombre de factures actives* par commande** — une même commande ne doit pas pouvoir générer 50 factures.

---

### 🟠 H3 — ÉLEVÉ : Le cycle de sortie de l'argent (remboursement / retrait) est incomplet

**Fichiers :** `backend/src/refunds/refunds.service.ts:110-167` · `backend/src/boutiques/boutiques.service.ts:89-155` · `backend/src/delivery/delivery.service.ts:2496-2551`

**Constat.** La règle d'or d'un transfert numérique est **symétrique** : ce qui entre doit pouvoir sortir. Sur ce projet, **seule la moitié « entrée » existe**.

**a) Le remboursement ne déclenche aucun appel PSP.** `adminDecide()` approuve le remboursement et **modifie uniquement les tables locales** :

```ts
// refunds.service.ts:129-162
await tx.settlementAllocation.updateMany({ ..., data: { status: 'REFUNDED' } });
for (const alloc of sellerAllocs) {
  await tx.boutique.update({
    where: { id: alloc.beneficiaryId },
    data: { balance: { decrement: deduction } },   // ← débit du vendeur
  });
}
// ⚠️ AUCUN appel à l'API PayDunya pour rembourser l'acheteur
```

Recherche exhaustive : **aucune** occurrence de `direct-pay`, `transfer-express`, `disburse`, `opr/` dans `backend/src/`. Le solde du vendeur est débité, mais **l'acheteur n'est jamais remboursé** — l'argent reste captif chez le marchand. Pour le client, le « remboursement » est une **annulation comptable**, pas un remboursement. C'est un risque juridique et de réputation majeur.

**b) Le retrait vendeur n'a aucun chemin de sortie.** `requestWithdrawal()` débite le solde et crée un `WithdrawalRequest` au statut `PENDING`. Or :
- l'enum `WithdrawalStatus { PENDING, APPROVED, REJECTED }` (`schema.prisma:630-634`) existe ;
- **aucune** occurrence de `withdrawalRequest.update` dans tout `backend/src/` (recherche exhaustive) → **le statut ne passe jamais à `APPROVED`** ;
- **aucun** endpoint admin de traitement des retraits (recherche dans `src/admin/` : aucun résultat) ;
- **aucun** appel PSP de virement.

Conséquence : le vendeur voit son solde décrémenté, sa demande reste `PENDING` indéfiniment, et **rien ne bouge**. Le champ `paymentInfo` (numéro de mobile money du vendeur) est collecté mais jamais utilisé.

**c) Le séquestre est conceptuellement justifié mais operationnellement non appliqué.** `Delivery Service` a bien une logique de gel/release (`adminApproveSettlementPayout`, `delivery.service.ts:2501-2551`) avec la décision documentée « D1 : aucun payout automatique PSP sans validation Admin ». **C'est une décision de gouvernance saine.** Mais comme aucun payout PSP n'existe, la décision D1 protège une fonction qui n'existe pas — le contrôle de sécurité est au-dessus d'un vide.

**Correctif.**
1. Implémenter l'appel PSP de remboursement (PayDunya expose une API de *disbursement* : `https://app.paydunya.com/api/v1/direct-pay/credit-account` pour les virements sortants). Pour le remboursement acheteur, vérifier si l'API Checkout supporte le remboursement — sinon, traiter le remboursement comme une **sortie de fonds via l'API disbursement**, avec le numéro de mobile money de l'acheteur (donnée déjà collectée dans `Order.customerPhone`).
2. Ajouter un endpoint admin `PATCH /admin/withdrawals/:id` qui approuve/rejette **et** déclenche le virement PSP, avec clé d'idempotence.
3. Refuser un `adminDecide('APPROVE')` tant que le débit acheteur côté PSP n'a pas abouti (ou le tracer comme `PENDING_PSP`).

---

### 🟡 M1 — MOYEN : La validation `callbackUrl` compare des origines, pas des chemins

**Fichiers :** `backend/src/paydunya/paydunya.service.ts:94-124`

**Constat.** La logique est correcte dans l'intention (allowlist d'origines, rejet par défaut avec fallback sûr) :

```ts
const isAllowed =
  allowedOrigins.some((origin) => new URL(origin).origin === parsed.origin) ||
  parsed.origin === new URL(defaultCallbackUrl).origin;
if (isAllowed) { returnUrl = dto.callbackUrl; }
```

Mais `parsed.origin` ne valide que le **schéma + hôte + port**. Un attaquant peut injecter un **chemin arbitraire** sur une origine autorisée : `https://api.zennshop.com/evil/redirect?x=` — qui accumule le `?token=` de PayDunya. L'impact réel est faible (l'origine est de confiance), mais la redirection de l'utilisateur peut être détournée vers un écran de phishing au sein d'un domaine de confiance.

**Correctif.** Valider le **chemin** attendu en plus de l'origine (allowlist de préfixes de chemin), p. ex. n'accepter que les chemins sous `/checkout/`.

---

### 🟡 M2 — MOYEN : `sandbox_mock` ne déclenche pas de règlement → commandes payées « en faux »

**Fichiers :** `backend/src/paydunya/paydunya.service.ts:143-163` · `frontend/src/components/store/CartDrawer.tsx:345-356`

**Constat.** Quand les 4 clés PayDunya ne sont pas configurées, le service retourne une facture **simulée** avec `mode: 'sandbox_mock'`. En local, le frontend court-circuite (`res.mode !== "sandbox_mock"`) et affiche « Paiement confirmé » — **sans jamais créer de facture ni déclencher de règlement**. L'ordre reste `PENDING`.

C'est un comportement acceptable en développement, mais **le mode fail-open est silencieux** : en production, si une seule des 4 clés est manquante ou contient un placeholder `YOUR_`, l'application bascule silencieusement en mode simulation — **les clients voient « Paiement confirmé » sans payer**, et l'équipe ne reçoit aucune alerte. Le log est un `warn` applicatif.

À noter : la route d'abonnement (`boutiques.service.ts:649-653`) fait correctement **`throw`** quand les clés manquent — le comportement est donc **incohérent entre les deux points d'entrée**.

**Correctif.** En production, une configuration incomplète doit être **fatale au démarrage** (comme `MESSAGING_ENCRYPTION_KEY` dans `main.ts:71-79`), pas un `warn` par requête. Le `sandbox_mock` doit être conditionné à `NODE_ENV !== 'production'`.

---

### 🟡 M3 — MOYEN : Le webhook rejette au lieu de traiter, et les échecs de persistance sont silencieux

**Fichiers :** `backend/src/paydunya/paydunya.service.ts:73-75` (`idempotency.service.ts`) · `backend/src/paydunya/paydunya.service.ts:264-267, 355-358`

**Constat.** Deux silent-failures sur le chemin financier le plus critique :

**(a) `saveRecord` avale ses erreurs :**
```ts
// idempotency.service.ts:73-75
} catch (error: any) {
  this.logger.warn(`[Idempotency] Échec de sauvegarde de la clé "${key}": ${error.message}`);
}
```
Si l'écriture idempotente échoue (contention DB, timeout), **l'opération est traitée comme un succès** et le résultat n'est pas mémorisé → un retry rejoue l'opération. Pour une création de facture, cela crée une **facture PayDunya orpheline de plus** (double encaissement possible côté PSP).

**(b) Un webhook sans identifiant unique lève une exception :**
```ts
// paydunya.service.ts:355-358
if (!eventId) {
  throw new BadRequestException("Identifiant d'événement / token PayDunya requis");
}
```
Un `400` renvoie une erreur à PayDunya, qui **réessaie** — boucle de retry sur un événement que le serveur ne traitera jamais. Le fail-closed est ici mal placé : il faut **acquitter** (`200`) un événement non traitable mais identifiable, et **rejeter** seulement un événement dont l'authentification a échoué.

**Correctif.**
1. `saveRecord` doit **propager** l'erreur (ou au minimum retourner un booléen et faire échouer l'appelant sur le chemin financier).
2. Distinguer « payload non traitable » (`200` + log `warn` + métrique) de « signature invalide » (`400`/`403`).

---

### 🟡 M4 — MOYEN : Absence de tests sur le chemin de paiement

**Fichiers :** `backend/test/`

**Constat.** Sur 17 fichiers de test, **aucun ne teste le flux PayDunya de bout en bout**. Les seules références à PayDunya sont :
- `security-resilience.e2e-spec.ts:287-305` — vérifie qu'une **fausse signature** est rejetée (bon test, mais négatif uniquement) ;
- `rate-limiting-stress.e2e-spec.ts:35-51` — vérifie le 429 (bon test).

**Aucun test ne couvre :** la création d'une facture, le règlement via webhook, l'idempotence, la **comparaison de montant**, la double livraison (webhook + confirm), le remboursement, ni le retrait. Sur la branche `feature/fedapay-marketplace-backend`, un `test/fedapay-marketplace.spec.ts` de 621 lignes existe — **rien d'équivalent n'a été porté pour PayDunya**.

**Correctif.** Ajouter une suite `paydunya.e2e-spec.ts` couvrant au minimum : idempotence (même clé → une seule facture), double règlement (webhook + confirm → un seul crédit), rejet d'un montant incohérent, rejet d'un `confirm` avec `orderId` falsifié, et non-régression sur le `mode` / `checkoutUrl`.

---

## 4. Grille d'évaluation des 4 piliers

### Pilier 1 — Idempotence des transactions 🔴

| Critère | Statut | Détail |
|---|---|---|
| Clé d'idempotence présente sur le checkout | ✅ | `Idempotency-Key` header, UUID client |
| Clé scopée par endpoint | ❌ | `path` ignoré → **C1** |
| Unicité en base composite | ❌ | `key @unique` global |
| Verrou atomique à la création | ⚠️ | Upsert tardif, non atomique avec l'appel PSP |
| Idempotence du webhook | ✅ | `paydunya_webhook_<eventId>`, TTL 24 h |
| Idempotence du `confirm` | ❌ | **Aucune** — deux appels = deux règlements (piloté par `updateMany`, mais non garanti) |
| Erreurs de persistance non silencieuses | ❌ | **M3** |

**Note :** le design *d'ensemble* est bon — l'idée d'une clé d'idempotence persistée avec TTL, l'idempotence webhook par token d'événement, le verrou `updateMany` sur le statut. Le problème est une **erreur d'implémentation sur un seul paramètre** (`path`), dont l'impact est catastrophique. C'est encourageant : la correction est petite et localisée.

### Pilier 2 — Chiffrement de bout en bout / Authenticité ⚠️

| Critère | Statut | Détail |
|---|---|---|
| Fail-closed sans secret | ✅ | Webhook rejeté si clé absente |
| Comparaison à temps constant | ✅ | `crypto.timingSafeEqual` partout |
| Hash conforme à la doc PayDunya | ✅ | SHA-512 Master Key |
| Secret webhook dédié | ❌ | **H1** — Master Key d'API réutilisée |
| Anti-rejeu (timestamp/fraîcheur) | ❌ | **H1** — payload rejouable |
| Chiffrement des données sensibles au repos | ⚠️ | `MESSAGING_ENCRYPTION_KEY` (AES-256-GCM) existe pour la **messagerie** ; **rien pour les données de paiement** (numéros de téléphone, `paymentInfo` des retraits en clair en base) |
| TLS vers le PSP | ✅ | `https://app.paydunya.com` |
| Protection de l'API key en transit | ✅ | Headers TLS, jamais loggé |

**Point d'honnêteté à porter au dossier :** le terme « E2EE » utilisé dans les commentaires du code (`paydunya.service.ts:276`) est **inexact** pour le webhook. Un webhook n'est pas chiffré de bout en bout : c'est un **scellement par hash partagé** unilateral. Le vrai E2EE existe dans le module messagerie (`common/crypto/message-crypto.ts`, AES-256-GCM) — il serait cohérent de l'appliquer aussi aux données de paiement persistées (`paymentInfo`, tokens de session).

### Pilier 3 — Rate limiting ⚠️

| Critère | Statut | Détail |
|---|---|---|
| Limites dédiées sur les routes paiement | ✅ | 5/min, 20/min, 15/min |
| Limite globale | ✅ | 120/min |
| Throttler global appliqué | ✅ | `APP_GUARD` → `ThrottlerGuard` |
| Test de non-régression | ✅ | `rate-limiting-stress.e2e-spec.ts` |
| Stockage distribué (Redis) | ❌ | **H2** — en mémoire, contournable en multi-instance |
| Keying par IP seule | ❌ | **H2** — CGNAT mobile, faux positifs |
| `trust proxy` correct en prod | ⚠️ | Configuré, mais dépend du reverse proxy amont |
| Limitation sur le débit de factures par commande | ❌ | **H2** |

### Pilier 4 — Vérification côté serveur 🔴

| Critère | Statut | Détail |
|---|---|---|
| Montant recalculé côté serveur (création) | ✅ | `order.total` — Zero-Trust correct |
| **Montant encaissé comparé au montant attendu** | ❌ | **C2** — jamais comparé |
| **Facture rattachée à la commande vérifiée** | ❌ | **C2** — `?orderId=` du client accepté |
| Devise vérifiée | ❌ | `XOF` en dur, jamais comparé à la réponse PSP |
| Identifiant d'événement unique requis | ⚠️ | Présent mais fail-open mal conçu (M3) |
| Signature vérifiée avant tout effet | ✅ | Avant le traitement |
| Rapprochement avec le solde PSP | ❌ | **C3** — aucun |
| Journalisation immuable des flux | ❌ | **C3** — aucun modèle `Payment`/`Ledger` |

---

## 5. Points forts à préserver

L'audit serait incomplet sans relever ce qui est bien conçu — ces décisions montrent une compréhension réelle des principes :

1. **Recalcul serveur du montant (Zero-Trust).** `order.total` est recalculé en base à partir des prix en base, jamais accepté du client (`orders.service.ts:121-139`). Le plafond de remise par points est appliqué (`Math.min(requestedPoints, maxApplicable)`). **C'est le bon modèle** — c'est lui qui empêche la classique manipulation de montant.
2. **Verrou atomique du règlement.** `updateMany({ where: { id, status: { not: PAID } } })` dans la même transaction que le crédit (`paydunya.service.ts:632-644`). La course webhook ↔ confirmation manuelle ↔ validation vendeur est **correctement gérée**. Le comment du modèle (`orders.service.ts:334-338`) montre que c'est un choix délibéré.
3. **Règle du « jamais en fire-and-forget » pour l'argent.** Le crédit, le cashback et la notification sont **dans** la transaction (`creditSellerForPaidOrder`, `orders.service.ts:1147-1293`). Beaucoup d'implémentations échouent ici.
4. **Débit conditionnel anti-overselling.** `updateMany({ where: { stock: { gte: quantity } } })` pour les stocks et les points (`orders.service.ts:167-173`, `:186-190`) — pas de lecture-modification-écriture non atomique.
5. **Séquençage du séquestre.** `SettlementAllocation` + statuts `AWAITING_DELIVERY_VERIFICATION` → `AWAITING_BUYER_CONFORMITY` → `ELIGIBLE_FOR_RELEASE`, avec blocage des retraits sur fonds gelés (`boutiques.service.ts:104-131`). La **logique de séquestre est la plus aboutie** du système.
6. **Fail-closed sur le webhook sans clé.** Le refus est correct (`paydunya.service.ts:288-296`).
7. **`timingSafeEqual` sur toutes les comparaisons de secrets.**
8. **Le filtre d'exceptions global** (`all-exceptions.filter.ts`) évite la fuite de stack traces et de détails Prisma — une vraie protection CWE-209, avec le mode dev séparé.
9. **Contrôle d'accès du retrait.** `updateMany({ where: { id, status: ACTIVE, balance: { gte: amount + heldAmount } } })` (`boutiques.service.ts:135-146`) — débit conditionnel atomique, funds-hold inclus dans la condition.
10. **Contrôle d'accès du retrait.** Le `BoutiqueOwnerGuard` protège `POST /boutiques/:id/withdraw`.

---

## 6. Plan de remédiation priorisé

### Sprint 0 — Bloquer la mise en production (≈ 3-5 j)

| # | Action | Fichiers |
|---|---|---|
| 1 | **`@@unique([key, path])`** + filtrage par `path` dans `getRecord`/`saveRecord` + migration | `schema.prisma`, `idempotency.service.ts` |
| 2 | **Deux clés distinctes** côté frontend (`checkoutKeyRef` / `paymentKeyRef`) | `CartDrawer.tsx:127, 267, 343` |
| 3 | **Valider le type de la réponse en cache** dans `createCheckoutTransaction` (rejeter si pas de `checkoutUrl`) | `paydunya.service.ts:49-54` |
| 4 | **Supprimer `fallbackOrderId`** de `confirm/:token` ; déduire l'ordre du `custom_data` serveur | `paydunya.service.ts:425-538`, `paydunya.controller.ts:83-88` |
| 5 | **Comparer `invoice.total_amount` à `order.total`** avant tout règlement (webhook **et** confirm) | `paydunya.service.ts:504-527, 609-620` |
| 6 | **Fail-fast au démarrage** si les clés PayDunya manquent en production ; `sandbox_mock` interdit en prod | `main.ts`, `paydunya.service.ts:128-163` |

### Sprint 1 — Solidité financière (≈ 1-2 semaines)

| # | Action | Fichiers |
|---|---|---|
| 7 | Table `Payment` append-only + `@@unique([provider, providerRef, kind])` ; alimenter à chaque capture | `schema.prisma`, `paydunya.service.ts` |
| 8 | **Appel PSP de remboursement** (sortie de fonds) + idempotence sur le disbursement | `refunds.service.ts:110-167` |
| 9 | **Endpoint admin de traitement des retraits** + virement PSP | `boutiques.service.ts`, nouveau `admin` |
| 10 | `PAYDUNYA_IPN_SECRET` dédié, obligatoire en prod ; suppression du fallback HMAC ; vérification de fraîcheur du timestamp | `paydunya.service.ts:281-296, 791-886` |
| 11 | `saveRecord` propage les erreurs ; acquitter (`200`) les webhooks non traitable mais identifiables | `idempotency.service.ts:73-75`, `paydunya.service.ts:355-358` |

### Sprint 2 — Exploitation (≈ 1 semaine)

| # | Action | Fichiers |
|---|---|---|
| 12 | `ThrottlerStorage` Redis + keying composite IP+user | `app.module.ts:31-41` |
| 13 | Limiter le débit de factures **par commande** | `paydunya.controller.ts` |
| 14 | Endpoint `confirm` authentifié (POST) au lieu de GET public | `paydunya.controller.ts:75-88` |
| 15 | Valider le **chemin** de `callbackUrl`, pas seulement l'origine | `paydunya.service.ts:94-124` |
| 16 | Rapprochement périodique solde `Boutique` ↔ solde PayDunya (cron) | nouveau module `reconciliation` |

### Sprint 3 — Qualité (≈ 1 semaine)

| # | Action | Fichiers |
|---|---|---|
| 17 | Suite `paydunya.e2e-spec.ts` : idempotence, double règlement, montant incohérent, `orderId` falsifié, remboursement, retrait | `backend/test/` |
| 18 | Chiffrer au repos les données de paiement (réutiliser le pattern `message-crypto.ts`) | `common/crypto/` |
| 19 | Statut `WithdrawalRequest` réellement piloté + métriques/alertes sur `sandbox_mock` et `saveRecord` échoué | — |
| 20 | Décider du sort de `origin/feature/fedapay-marketplace-backend` (⚠️ voir §7) | — |

---

## 7. ⚠️ Point d'attention : deux implémentations de paiement concurrentes

Le dépôt contient **deux implémentations de paiement parallèles** :

| Branche | Module | Contenu |
|---|---|---|
| `origin/main` (`f7d6cf2`) | `src/paydunya/` | Checkout Invoice, webhook IPN, confirm, refunds, abonnements |
| `origin/feature/fedapay-marketplace-backend` | `src/fedapay/` | + `payment-crypto.service.ts` (chiffrement des flux), payouts, sous-comptes marketplace, `transfer-fee.util.ts`, 621 lignes de tests |

La branche feature **n'est pas fusionnée** mais le commit `6b65726` est un message de merge « into main ». Cette divergence est un **risque opérationnel majeur** : du code de paiement existe dans deux versions incompatibles, et la branche feature contient des éléments de sécurité absents de `main` (notamment `payment-crypto.service.ts`).

**Recommandation :** trancher explicitement — soit fusionner la branche feature en réconciliant PayDunya/FedaPay, soit l'abandonner explicitement. Ne pas laisser deux implémentations de paiement coexister sur un projet qui manipule de l'argent réel.

---

## 8. Méthodologie et limites

**Méthode.** Extraction de `origin/main` via `git archive` (le checkout local était en retard de 4 commits), lecture intégrale des modules `paydunya`, `refunds`, `orders`, `boutiques`, `common`, `delivery`, `main.ts`, `app.module.ts`, `schema.prisma` ; analyse du frontend (`CartDrawer.tsx`, `lib/api/orders.ts`, `lib/customerStore.ts`) ; **exécution d'un script de reproduction** du finding C1 ; confrontation avec la [documentation officielle PayDunya HTTP/JSON](https://developers.paydunya.com/doc/EN/http_json) et les SDKs officiels (PHP, NodeJS, Python, .NET) pour valider les formats de payload IPN et confirm.

**Limites explicites.**
- **Aucun test contre l'API PayDunya réelle** n'a été exécuté : les clés ne sont pas configurées (`.env` : `PAYDUNYA_*` absent) et le dépôt n'est pas un dépôt de production. Les constats sur les payloads reposent sur la **documentation officielle**.
- Les **constats C1 et C2 sont démontrés par lecture de code** (C1 par exécution d'un script de reproduction isolé) ; ils n'ont pas été rejoués contre une base de données réelle. Un test d'intégration sur l'environnement de staging le confirmerait.
- L'audit **ne couvre pas** la conformité PCI-DSS, le processus KYC/AML de la passerelle, ni le cadre fiscal béninois — hors périmètre du code.
- L'analyse de l'infrastructure (reverse proxy, Redis, TLS termination) repose sur la configuration déclarative dans le code ; elle doit être **confrontée à l'infrastructure réelle**.

---

*Audit réalisé sur `origin/main` @ `f7d6cf2`. Script de reproduction C1 : `backend/test/_audit_idempotency_repro.js`.*
