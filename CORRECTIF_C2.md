# Correctif C2 — Montant payé vs montant attendu, et sécurisation de `confirm/:token`

**Branche :** `fix/c2-payment-amount-verification` (base : `fix/c1-idempotency-key-scoping` @ `4d48712`, elle-même sur `origin/main` @ `f7d6cf2`)
**Finding corrigé :** C2 de `AUDIT_PAIEMENT_PAYDUNYA.md` — *Le montant payé n'est JAMAIS comparé au montant attendu*

---

## 1. Le bug en une phrase

Au moment du règlement, **le montant réellement encaissé par PayDunya n'était jamais relu ni comparé** au montant attendu : le crédit du vendeur se calculait systématiquement sur `Order.total`, et l'endpoint public `GET /payments/paydunya/confirm/:token` acceptait un `?orderId=` fourni par l'appelant comme source de commande — un token de facture « complétée à 100 FCFA » suffisait donc à solder une commande de 50 000 FCFA.

---

## 2. Ce qui a changé

| # | Fichier | Changement |
|---|---|---|
| 1 | `backend/prisma/schema.prisma` | `Order.paydunyaToken` (token de la facture émise) et `Order.paydunyaAmount` (montant facturé figé), + index sur `paydunyaToken` |
| 2 | `backend/prisma/migrations/20261110120000_bind_paydunya_invoice_to_order/migration.sql` | Ajout des deux colonnes nullables + index |
| 3 | `backend/src/paydunya/paydunya.service.ts` | `extractTotalAmount()`, `assertInvoiceMatchesOrder()`, `isOrderOwnedBy()`, `settlePaidOrderViaPayDunya()` réécrite, `confirmTransactionByToken()` sécurisée |
| 4 | `backend/src/paydunya/paydunya.controller.ts` | `confirm/:token` : `@Public()` retiré (session obligatoire), `?orderId=` supprimé, `@CurrentUser()` ajouté |
| 5 | `frontend/src/lib/api/orders.ts` | `confirmPayDunyaTransaction(token)` — plus de paramètre `orderId` |
| 6 | `frontend/src/app/checkout/success/page.tsx` | Appel sans `orderId` ; 401 (visiteur invité) → état « en attente » au lieu d'une erreur |
| 7 | `frontend/src/app/espace-client/commandes/page.tsx` | Appel sans `orderId` |
| 8 | `frontend/src/components/store/CartDrawer.tsx` | Appel sans `orderId` |
| 9 | `backend/test/paydunya-reconciliation.spec.ts` | 13 tests unitaires (dont un témoin de régression) |
| 10 | `backend/test/paydunya-reconciliation.e2e-spec.ts` | 8 tests e2e HTTP contre un vrai PostgreSQL |

### 2.1 La trace serveur de la facture

À l'émission de la facture, le token et le montant facturé sont **figés sur la commande** :

```ts
await this.prisma.order.update({
  where: { id: order.id },
  data: { paydunyaToken: result.token, paydunyaAmount: result.amount },
});
```

`paydunyaAmount` est le montant **attendu** : il est figé au moment où la facture part vers PayDunya, il ne bouge plus. C'est cette valeur qui sera confrontée au montant réellement encaissé.

### 2.2 La réconciliation (point unique de règlement)

`settlePaidOrderViaPayDunya()` est le **seul** chemin de règlement (webhook IPN *et* confirmation directe). Avant tout crédit, il applique quatre contrôles :

```
1. PROPRIÉTÉ      → l'appelant est-il le client de la commande ou le propriétaire de la boutique ?
2. MONTANT        → le montant encaissé est-il EXACTEMENT le montant facturé ?
3. COHÉRENCE      → le total de la commande a-t-il bougé depuis l'émission de la facture ?
4. LIAISON        → le token encaissé est-il celui que NOUS avons émis pour CETTE commande ?
```

Tous sont **fail-closed** : dès qu'un contrôle ne peut pas être satisfait, une exception est levée et **aucun crédit n'a lieu**.

```
[PayDunya] MONTANT INCOHÉRENT — commande #AC-C2-0001 : 5000 FCFA facturés, 100 FCFA encaissés. Règlement refusé.
[PayDunya] Règlement refusé pour la commande #AC-C2-0001 : la facture test_token_autre n'est pas celle émise pour cette commande (facture enregistrée : test_token_1).
```

### 2.3 La commande ne vient plus du client

Dans `confirmTransactionByToken()`, le `fallbackOrderId` (le `?orderId=`) a **disparu** :

```ts
// AVANT
const orderId = customData.orderId ?? fallbackOrderId;   // ← source contrôlable par l'appelant

// APRÈS
const orderId = customData.orderId ? String(customData.orderId) : undefined;
```

La commande provient désormais **exclusivement des `custom_data` de la facture** — des données que *nous* posons à l'émission. Les alternatives `invoice.reference_id` et `invoice.reference` ont également été retirées du chemin webhook : elles sont alimentées par la facture et auraient permis de viser une commande par simple collision de référence.

### 2.4 Le montant encaissé est enfin lu

`invoice.total_amount` était présent dans le payload IPN **et** dans la réponse `confirm`, et n'était jamais consulté. Il est maintenant extrait, en acceptant les deux formes rencontrées (nombre JSON ou chaîne) :

```ts
private extractTotalAmount(payload: any): number | null {
  const candidates = [
    payload?.invoice?.total_amount,
    payload?.total_amount,
    payload?.invoice?.invoice?.total_amount,
    payload?.invoice?.amount,
    payload?.amount,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'number' && typeof candidate !== 'string') continue;
    const raw = typeof candidate === 'string' ? candidate.trim() : candidate;
    if (raw === '') continue;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;   // → le règlement est REFUSÉ (fail-closed)
}
```

### 2.5 `confirm/:token` : session obligatoire + propriété de la commande

```ts
// AVANT
@Public()
@UseGuards(OptionalJwtAuthGuard)
@Get('confirm/:token')
confirmTransaction(@Param('token') token: string, @Query('orderId') orderId?: string)

// APRÈS
@Throttle({ default: { limit: 15, ttl: 60000 } })
@Get('confirm/:token')
@ApiBearerAuth()
confirmTransaction(@Param('token') token: string, @CurrentUser() user: AuthenticatedUser)
```

Le contrôle de propriété est appliqué **avant** la réconciliation : un appelant non propriétaire ne doit pas pouvoir apprendre quoi que ce soit sur la commande (montant, état) en provoquant un message d'erreur détaillé.

---

## 3. L'impact sur le checkout invité (choix assumé)

`confirm/:token` exige désormais une session authentifiée : **le checkout invité (visiteur non connecté) ne peut plus déclencher la confirmation automatique** au retour de PayDunya.

Ce n'est pas une perte de encaissement : le règlement de la commande reste assuré par le **webhook IPN** de PayDunya, qui est signé et authentifié par la Master Key. Seule la **confirmation côté navigateur** est indisponible pour un visiteur non connecté.

Côté interface, le retour de PayDunya affiche désormais l'état « Paiement en attente de validation » (au lieu d'une erreur) lorsque la session est absente, et la commande bascule en « Payée » dès que l'IPN arrive.

---

## 4. Les tests

### 4.1 Tests unitaires — `backend/test/paydunya-reconciliation.spec.ts` (13 tests)

| Groupe | Couverture |
|---|---|
| 1. Règlement conforme | Montant identique → commande payée + boutique créditée ; montant en chaîne accepté ; le propriétaire de la boutique peut confirmer |
| 2. **Montant ≠ attendu** | Sous-paiement → refus, aucun crédit · sur-paiement → refus · montant absent du payload → refus · total de commande modifié après émission → refus |
| 3. **Liaison facture ↔ commande** | Facture émise pour une autre commande → refus · aucune facture enregistrée → refus |
| 4. **Contrôle de propriété** | Appelant ni client ni propriétaire → 403 · le contrôle passe AVANT la réconciliation (aucune fuite d'information) |
| 5. **Données serveur** | La commande est résolue depuis les `custom_data` de la facture · **témoin de régression** : sans `custom_data`, l'ancien code prenait le `?orderId=` de l'appelant — le service corrigé, lui, ne règle rien |

```
Tests: 13 passed, 13 total
```

### 4.2 Tests e2e — `backend/test/paydunya-reconciliation.e2e-spec.ts` (8 tests)

Contre un **vrai PostgreSQL** (base `platforme_c1_test`) et de vrais appels HTTP `supertest` :

| Test | Vérifie |
|---|---|
| Sans session authentifiée | **401**, commande inchangée |
| Appelant qui ne possède pas la commande | **403**, commande inchangée |
| `?orderId=<commande victime>` avec un token devinable | La commande **victime reste PENDING** (aucun `paidAt`, aucun `paymentRef`) |
| Montant encaissé = montant facturé | **200**, commande `PAID`, `paymentRef = PAYDUNYA-<token>` |
| Montant encaissé < montant facturé | **400**, commande toujours `PENDING` |
| Montant absent de la réponse PayDunya | **400**, commande toujours `PENDING` |
| Facture non rattachée à la commande | **400**, commande toujours `PENDING` |
| Le propriétaire de la boutique confirme | **200**, commande `PAID` |

```
Tests: 8 passed, 8 total
```

---

## 5. Vérifications effectuées

| Vérification | Résultat |
|---|---|
| `prisma validate` | ✅ schema valide |
| `prisma generate` | ✅ client régénéré (`paydunyaToken` / `paydunyaAmount` exposés) |
| Migration appliquée sur PostgreSQL réel | ✅ `ALTER TABLE "Order" ADD COLUMN …` + `CREATE INDEX` |
| Colonnes en base | ✅ `paydunyaAmount numeric(12,2) NULL`, `paydunyaToken text NULL`, index `Order_paydunyaToken_idx` |
| `tsc --noEmit` (backend) | ✅ exit 0 |
| `tsc --noEmit` (frontend) | ✅ exit 0 |
| Tests unitaires du correctif | ✅ 13/13 |
| Tests e2e du correctif (vraie base) | ✅ 8/8 |
| Suite unitaire backend complète | ✅ **75/75** (5 suites) — 62/62 avant + 13 nouveaux |
| Suite e2e backend complète | ✅ **aucune régression** — voir tableau comparatif ci-dessous |
| Tests frontend (vitest) | ✅ 76/77 — le 1 échec est **pré-existant** (timeout 5000 ms sur `CartDrawer.test.tsx`) |
| Build frontend (`next build`) | ✅ exit 0 |

### 5.1 Comparaison de la suite e2e — avant / après le correctif

La suite e2e du dépôt présente **11 suites en échec** sur la base de test
(`platforme_c1_test`, créée par `prisma db push` **sans seed**). Ces échecs sont
**antérieurs et sans rapport** avec C2 : la mesure a été faite sur le commit
C1 (`4d48712`, sans le correctif), puis sur la branche C2, sur la **même base**.

| Mesure | Baseline C1 (`4d48712`) | Branche C2 |
|---|---|---|
| Suites e2e | 11 échecs / 3 réussies / 14 total | 11 échecs / **4** réussies / 15 total |
| Tests e2e | 98 échecs / 28 réussis / 126 total | 98 échecs / **36** réussis / 134 total |

**Écart : zéro test perdu, +8 tests réussis** (exactement la nouvelle suite
`paydunya-reconciliation.e2e-spec.ts`).

Deux causes expliquent les 98 échecs pré-existants, toutes deux sans rapport
avec le paiement :

1. **Données de seed absentes.** Les specs attendent une boutique seedée
   (`GET /api/v1/boutiques/public/aziz-tech` → 404), absente de la base de test.
2. **Politique de mot de passe non respectée dans les specs.** Le DTO
   d'inscription exige une majuscule, une minuscule, un chiffre et un caractère
   spécial ; les specs `notifications`, `admin`, `security-resilience`,
   `order-*-mail` et `rate-limiting-stress` utilisent `password123` → leur
   inscription échoue (400) et tous leurs tests en cascade.

---

## 6. Mise en œuvre

```bash
cd backend
npx prisma migrate deploy      # production
npx prisma migrate dev         # développement
```

> ⚠️ **Point d'attention, indépendant de ce correctif.** La chaîne de
> migrations du dépôt reste **cassée sur une base vierge** : la migration
> `20260916_fix_float_to_decimal_financial` fait un
> `ALTER TABLE "Boutique" ALTER COLUMN "balance"` alors que la migration
> `20260804183148_init` ne crée **pas** la colonne `balance`
> (`ERROR: column "balance" does not exist`). Ce défaut est antérieur à C1 et
> C2, et sans rapport avec eux. **À corriger dans un ticket dédié.**

---

## 7. Ce que ce correctif ne règle pas

Le finding **C2 est clos pour le flux de paiement des commandes**, mais plusieurs limites restent ouvertes et sont assumées :

- **Le flux d'abonnement (formule vendeur) n'est PAS couvert par le contrôle de montant.** Les factures d'abonnement sont créées dans `boutiques.service.ts` et ne portent pas de commande : le montant facturé n'y est pas stocké, il n'existe donc rien à comparer. Le contrôle de **propriété** est appliqué (le demandeur doit être l'abonné). Comparer le montant de l'abonnement au prix du plan exigerait de figer le montant facturé au même endroit — à traiter avec le modèle `Payment` du finding **C3**.
- **Une seule facture active par commande.** `Order.paydunyaToken` est écrasé à chaque nouvelle facture : si une commande reçoit deux factures, seule la dernière est honorée. Le cas est rare (la clé d'idempotence rend le double-clic inoffensif) mais il existe. Une table de factures 1↔N le supprimerait — également du ressort de **C3**.
- **Les commandes en vol au moment du déploiement** (facture émise avant la migration) n'ont pas de `paydunyaToken` : leur règlement sera **refusé** par le contrôle de liaison. Un repli explicite (accepter ces factures sous condition de montant et de `custom_data`) est possible si un déploiement en production est envisagé avec des paiements en cours.
- **`GET` pour une opération qui change l'état.** `confirm/:token` déclenche un règlement depuis une URL. Le passage en `POST` est recommandé, mais n'a pas été fait ici pour ne pas casser les redirections de retour en cours de tests.

Restent ouverts dans l'audit : **C3** (aucun modèle `Payment`/`Ledger`), **H1**, **H2**, **H3**.

---

## 8. Fichiers du correctif

```
backend/prisma/schema.prisma                                            (modifié)
backend/prisma/migrations/20261110120000_bind_paydunya_invoice_to_order/ (nouveau)
backend/src/paydunya/paydunya.service.ts                                (modifié)
backend/src/paydunya/paydunya.controller.ts                              (modifié)
backend/test/paydunya-reconciliation.spec.ts                            (nouveau)
backend/test/paydunya-reconciliation.e2e-spec.ts                        (nouveau)
frontend/src/lib/api/orders.ts                                           (modifié)
frontend/src/app/checkout/success/page.tsx                              (modifié)
frontend/src/app/espace-client/commandes/page.tsx                       (modifié)
frontend/src/components/store/CartDrawer.tsx                            (modifié)
```
