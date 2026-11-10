# Correctif C3 — Modèle de données de paiement (`Payment`) et comptabilité en partie double (`Ledger`)

**Branche :** `fix/c3-payment-ledger-model` (base : `fix/c2-payment-amount-verification` @ `053834b`, elle-même sur `fix/c1-idempotency-key-scoping` @ `4d48712`, sur `origin/main` @ `f7d6cf2`)
**Finding corrigé :** C3 de `AUDIT_PAIEMENT_PAYDUNYA.md` — *Aucun modèle de données de paiement → pas de comptabilité en partie double*

---

## 1. Le bug en une phrase

L'argent de la plateforme n'existait que comme `Boutique.balance` — un simple compteur muté par `increment` / `decrement` — plus un `Order.paymentRef` (texte libre, non unique, sans index) : impossible de répondre à « d'où viennent ces 500 000 FCFA sur le solde de cette boutique ? », impossible de rapprocher, et le double crédit ne pouvait être que **déduit** du code, jamais **prouvé**.

---

## 2. Ce qui a changé

| # | Fichier | Changement |
|---|---|---|
| 1 | `backend/prisma/schema.prisma` | Modèles `Payment`, `LedgerAccount`, `LedgerEntry` + énumérations `PaymentKind`, `PaymentDirection`, `PaymentStatus`, `LedgerAccountType`, `LedgerDirection` |
| 2 | `backend/prisma/migrations/20261110153000_create_payment_and_ledger/migration.sql` | Création des tables + **report des soldes existants** (écritures d'ouverture) |
| 3 | `backend/src/common/services/ledger.service.ts` | **Nouveau** : journal en partie double, `Payment` append-only, réconciliation |
| 4 | `backend/src/common/common.module.ts` | `LedgerService` fourni globalement |
| 5 | `backend/src/paydunya/paydunya.service.ts` | Encaissement PayDunya : `Payment` CAPTURE + journal + **garde d'idempotence métier** |
| 6 | `backend/src/orders/orders.service.ts` | Encaissement mobile money + annulation client |
| 7 | `backend/src/admin/admin.service.ts` | Annulation administrative |
| 8 | `backend/src/refunds/refunds.service.ts` | Approbation d'un remboursement |
| 9 | `backend/src/delivery/delivery.service.ts` | Remboursement acheteur sur litige |
| 10 | `backend/src/boutiques/boutiques.service.ts` | Demande de retrait (sortie d'argent) |
| 11 | `backend/src/admin/admin.controller.ts` | `GET /admin/reconciliation` et `GET /admin/reconciliation/boutique/:id` |
| 12 | `backend/test/ledger.service.spec.ts` | **Nouveau** : 13 tests unitaires du grand livre |
| 13 | `backend/test/ledger-reconciliation.e2e-spec.ts` | **Nouveau** : 8 tests e2e contre un vrai PostgreSQL |

---

## 3. Le modèle de données

### 3.1 `Payment` — append-only, source de vérité d'idempotence métier

```prisma
model Payment {
  id          String           @id @default(cuid())
  provider    String           @default("PAYDUNYA")
  providerRef String
  kind        PaymentKind      // CAPTURE | REFUND | PAYOUT | COMMISSION | CASHBACK
  direction   PaymentDirection // IN | OUT
  orderId     String?
  boutiqueId  String?
  grossAmount Decimal          @db.Decimal(14, 2)  // montant encaissé
  netAmount   Decimal          @db.Decimal(14, 2)  // montant crédité au bénéficiaire
  currency    String           @default("XOF")
  status      PaymentStatus    @default(RECORDED)
  createdAt   DateTime         @default(now())

  @@unique([provider, providerRef, kind], name: "provider_ref_kind")
}
```

La contrainte `@@unique([provider, providerRef, kind])` est **la** source de vérité d'idempotence au niveau métier — bien plus robuste qu'une clé d'idempotence HTTP, qui est falsifiable par le client. Deux règlements de la même facture **violent la contrainte en base** : le double crédit devient impossible, et pas seulement improbable.

### 3.2 `LedgerAccount` / `LedgerEntry` — partie double

```
LedgerAccount : un compte (PLATFORM_ESCROW, PLATFORM_REVENUE, PLATFORM_LOYALTY,
                 PLATFORM_CUSTOMER, PLATFORM_PAYOUT, BOUTIQUE:<id>)
LedgerEntry   : une ligne d'écriture APPEND-ONLY, groupée par `journalId`
```

Toutes les lignes d'un même `journalId` forment une écriture **équilibrée** (total débit = total crédit). L'équilibre est **vérifié par le service avant écriture**, pas seulement par convention : un journal déséquilibré est refusé et **rien** n'est écrit.

Le compte `BOUTIQUE:<id>` porte la dette de la plateforme envers le vendeur : son solde est tenu **identique** à `Boutique.balance`, ce qui rend la réconciliation exacte par construction.

### 3.3 Le report des soldes existants

La migration crée les trois tables **et** reporte les soldes déjà constitués :

```sql
INSERT INTO "LedgerAccount" ... SELECT md5('acct:BOUTIQUE:' || b.id), 'BOUTIQUE:' || b.id, ...
FROM "Boutique" b WHERE b.balance <> 0;

INSERT INTO "LedgerEntry" ... 'Solde d''ouverture — report du solde antérieur à la migration C3'
```

Le grand livre démarre ainsi **exactement** sur `Boutique.balance` : la réconciliation est juste dès la première seconde, sans rupture de l'historique ni « trou » inexpliqué sur les boutiques historiques.

---

## 4. Le LedgerService

### 4.1 Un point de passage unique

Tous les mouvements de `Boutique.balance` passent désormais par `creditBoutique()` / `debitBoutique()`, qui effectuent **dans la même transaction** :

1. le mouvement du solde (`Boutique.balance`) ;
2. l'écriture comptable (`LedgerEntry`) ;
3. l'enregistrement du paiement (`Payment`).

Les deux ne peuvent pas diverger : ils sont écrits ensemble, ou pas du tout.

```ts
await this.ledgerService.creditBoutique(tx, order.boutiqueId, netAmount, {
  counterpart: [
    { accountCode: LedgerAccounts.ESCROW,  direction: LedgerDirection.DEBIT,  amount: cashCollected },
    { accountCode: LedgerAccounts.LOYALTY, direction: LedgerDirection.DEBIT,  amount: pointsUsed },
    { accountCode: LedgerAccounts.REVENUE, direction: LedgerDirection.CREDIT, amount: commissionAmount },
  ],
  description: `Encaissement PayDunya — commande #${order.reference}`,
  orderId: order.id,
  payment: { provider: 'PAYDUNYA', providerRef: transactionId, kind: PaymentKind.CAPTURE, ... },
});
```

### 4.2 Le journal de l'encaissement

| Compte | Sens | Montant | Sens du solde |
|---|---|---|---|
| `PLATFORM_ESCROW` | Débit | `order.total` (fonds collectés) | + |
| `PLATFORM_LOYALTY` | Débit | `pointsUsed` (coût des points, absorbé par la plateforme) | + |
| `BOUTIQUE:<id>` | Crédit | `netAmount` (dette envers le vendeur) | + |
| `PLATFORM_REVENUE` | Crédit | `commissionAmount` (commission plateforme) | + |

Débit total = `total + points` ; crédit total = `net + commission` = `total + points`. **Équilibré par construction.**

### 4.3 Les mouvements sortants

| Flux | Écriture |
|---|---|
| Annulation client / admin | `DÉBIT BOUTIQUE` / `CRÉDIT PLATFORM_CUSTOMER` (dette de la plateforme envers le client, jusqu'au remboursement effectif par le PSP — hors périmètre, finding H3) |
| Remboursement accepté | idem |
| Remboursement sur litige | idem |
| Retrait vendeur | `DÉBIT BOUTIQUE` / `CRÉDIT PLATFORM_PAYOUT` (retrait dû, en cours de traitement) |

### 4.4 L'idempotence métier, appliquée

```ts
// AVANT tout crédit : un règlement déjà enregistré pour cette facture ?
const alreadyCaptured = await tx.payment.findUnique({
  where: { provider_ref_kind: { provider: 'PAYDUNYA', providerRef: transactionId, kind: PaymentKind.CAPTURE } },
});
if (alreadyCaptured) return;   // aucun nouveau crédit
```

La lecture évite le rejeu ; la **contrainte UNIQUE** en base est le filet de sécurité qui prouve qu'aucun double crédit ne peut se produire.

---

## 5. La réconciliation

### 5.1 Ce qui est réconcilié

| Contrôle | Ce qu'il détecte |
|---|---|
| `reconcileBoutique(id)` / `reconcileAll()` | Un `Boutique.balance` qui diverge du solde porté par le grand livre (écriture directe en base, flux non instrumenté, erreur de développement) |
| `reconcilePayments()` | Une commande marquée `PAID` **sans** `Payment` de nature `CAPTURE`, ou un `Payment` dont le montant encaissé diffère du total de la commande |

Seules les commandes réglées **après l'ouverture du grand livre** sont contrôlées : les commandes historiques n'ont pas de capture enregistrée, ce qui n'est pas une anomalie mais l'état antérieur à la migration.

### 5.2 L'endpoint d'administration

```http
GET /api/v1/admin/reconciliation                 → rapport global (ADMIN)
GET /api/v1/admin/reconciliation/boutique/:id    → réconciliation d'une boutique
```

```json
{
  "balances": { "checked": 3, "anomalies": [], "ok": true },
  "payments": {
    "openingDate": "2026-11-10T15:30:00.000Z",
    "checkedOrders": 1,
    "missingCaptures": [],
    "amountMismatches": [],
    "ok": true
  }
}
```

---

## 6. Les tests

### 6.1 Tests unitaires — `backend/test/ledger.service.spec.ts` (13 tests)

| Groupe | Couverture |
|---|---|
| 1. Équilibre du journal | Journal déséquilibré → refus **et rien n'est écrit** · montant négatif → refus · journal équilibré → 3 lignes · lignes à montant nul écartées |
| 2. Append-only et soldes | Le solde du compte est le cumul de ses lignes, les lignes d'origine sont intactes · `creditBoutique`/`debitBoutique` portent le solde de la boutique **et** le compte comptable à l'identique · crédit/débit de montant nul ou négatif → refus |
| 3. Idempotence métier | Le paiement est enregistré et rattaché à son journal · un second paiement identique (même PSP, même référence, même nature) est **refusé** et n'écrit rien · deux natures différentes pour la même référence sont acceptées |
| 4. Création des comptes | Un compte par code utilisé, avec le bon type et la bonne boutique · aucun doublon de compte |

```
Tests: 13 passed, 13 total
```

### 6.2 Tests e2e — `backend/test/ledger-reconciliation.e2e-spec.ts` (8 tests)

Contre un **vrai PostgreSQL** et de vrais appels HTTP :

| Test | Vérifie |
|---|---|
| Encaissement → `Payment` append-only | Un `Payment` CAPTURE est créé, rattaché à la commande, au bon montant |
| Journal équilibré | Total débit = total crédit, un seul `journalId` pour toutes les lignes, le compte boutique porte exactement le net crédité |
| Réconciliation sans anomalie | Le solde du grand livre = `Boutique.balance` |
| Second règlement de la même facture | `order_already_paid`, **solde inchangé**, toujours **un seul** `Payment` |
| Contrainte UNIQUE | L'insertion d'un doublon est refusée **par la base** |
| Divergence détectée | Un solde modifié hors grand livre est signalé (`ok: false`, `delta: 1234`) |
| Endpoint admin | Le rapport global est renvoyé |
| Endpoint admin protégé | Un client non administrateur reçoit un **403** |

```
Tests: 8 passed, 8 total
```

---

## 7. Vérifications effectuées

| Vérification | Résultat |
|---|---|
| `prisma validate` | ✅ schema valide |
| `prisma generate` | ✅ client régénéré (`Payment`, `LedgerAccount`, `LedgerEntry`) |
| Migration appliquée sur PostgreSQL réel | ✅ tables, index, clés étrangères + report des soldes |
| Soldes d'ouverture en base | ✅ 3 boutiques reportées (4 950 FCFA chacune) avec leur écriture d'ouverture |
| `tsc --noEmit` (backend) | ✅ exit 0 |
| Suite unitaire backend complète | ✅ **88/88** (6 suites) — 75/75 avant + 13 nouveaux |
| Tests e2e du correctif | ✅ 8/8 |
| Suite e2e backend complète | ✅ **aucune régression** (voir §7.1) |
| Typecheck frontend (`tsc --noEmit`) | ✅ exit 0 |
| Tests frontend | ⚠️ 76/77 — 1 échec pré-existant (`CartDrawer.test.tsx`, timeout 5 s), **aucun fichier frontend modifié par C3** |

### 7.1 Comparaison de la suite e2e — avant / après

La suite e2e du dépôt présente **11 suites en échec** sur la base de test
(`platforme_c1_test`, créée par `prisma db push` **sans seed**). Ces échecs sont
**antérieurs et sans rapport** avec C1, C2 et C3 : la mesure a été faite sur
le commit C1, puis sur C2, puis sur C3, sur la **même base**.

| Mesure | Baseline C1 | Branche C2 | Branche C3 |
|---|---|---|---|
| Suites e2e | 11 échecs / 3 réussies / 14 | 11 échecs / 4 réussies / 15 | 11 échecs / **5** réussies / 16 |
| Tests e2e | 98 échecs / 28 réussis / 126 | 98 échecs / 36 réussis / 134 | 98 échecs / **44** réussis / 142 |

**Écart sur C3 : zéro test perdu, +8 tests réussis** (la nouvelle suite
`ledger-reconciliation.e2e-spec.ts`).

Deux causes expliquent les 98 échecs pré-existants, sans rapport avec le
paiement : **données de seed absentes** (`GET /boutiques/public/aziz-tech` → 404)
et **politique de mot de passe non respectée** dans les specs `notifications`,
`admin`, `security-resilience`, `order-*-mail` et `rate-limiting-stress`
(`password123` → inscription refusée en 400).

---

## 8. Mise en œuvre

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
> (`ERROR: column "balance" does not exist`). Ce défaut est antérieur à C1, C2
> et C3. **À corriger dans un ticket dédié.**

> ⚠️ **Second point d'attention, propre à C3.** La migration C3 report les
> soldes existants dans le grand livre. Si elle est rejouée sur une base déjà
> migrée (ou appliquée deux fois), le report serait doublé. La migration est
> donc à appliquer **une seule fois**, via `prisma migrate deploy`, qui
> s'appuie sur la table `_prisma_migrations`.

---

## 9. Ce que ce correctif ne règle pas

- **Le rapprochement PSP n'est pas automatisé.** La réconciliation compare le
  grand livre au solde `Boutique.balance` (interne). Le rapprocher du relevé
  réel du compte PayDunya suppose un appel à l'API PSP dont le point d'entrée
  n'est pas documenté de façon fiable : c'est du ressort du finding **H3**.
- **Les soldes des livreurs et des agences** (`CourierProfile.balance`,
  `DeliveryAgency.balance`) ne sont pas encore journalisés : ils relèvent d'une
  chaîne de bénéficiaires distincte, à instrumenter avec le modèle `Payment`
  étendu.
- **`GET confirm/:token` reste un `GET`** qui déclenche un règlement. Le
  passage en `POST` est recommandé (déjà mentionné dans `CORRECTIF_C2.md`).
- **La limitation « une seule facture active par commande »** (introduite par le
  correctif C2, `Order.paydunyaToken` étant écrasé à chaque nouvelle facture)
  subsiste : la table `Payment` en donne le point d'appui (une table de factures
  1↔N par commande), mais la migration du modèle `Order` n'est pas faite.
- **Le cycle de sortie de l'argent reste incomplet** : le retrait est enregistré
  et journalisé (`PLATFORM_PAYOUT`), mais l'appel effectif au PSP pour virer
  l'argent au vendeur n'existe pas — c'est le finding **H3**.

Restent ouverts dans l'audit : **H1**, **H2**, **H3**.

---

## 10. Fichiers du correctif

```
backend/prisma/schema.prisma                                          (modifié)
backend/prisma/migrations/20261110153000_create_payment_and_ledger/   (nouveau)
backend/src/common/services/ledger.service.ts                         (nouveau)
backend/src/common/common.module.ts                                   (modifié)
backend/src/paydunya/paydunya.service.ts                              (modifié)
backend/src/orders/orders.service.ts                                  (modifié)
backend/src/admin/admin.service.ts                                    (modifié)
backend/src/admin/admin.controller.ts                                 (modifié)
backend/src/refunds/refunds.service.ts                                (modifié)
backend/src/delivery/delivery.service.ts                              (modifié)
backend/src/boutiques/boutiques.service.ts                            (modifié)
backend/test/ledger.service.spec.ts                                   (nouveau)
backend/test/ledger-reconciliation.e2e-spec.ts                        (nouveau)
backend/test/paydunya-reconciliation.spec.ts                          (modifié)
backend/test/paydunya-reconciliation.e2e-spec.ts                      (modifié)
backend/test/delivery.service.spec.ts                                 (modifié)
```
