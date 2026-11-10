# Correctif C1 — Clé d'idempotence unique par endpoint

**Branche :** `fix/c1-idempotency-key-scoping` (base : `origin/main` @ `f7d6cf2`)
**Finding corrigé :** C1 de `AUDIT_PAIEMENT_PAYDUNYA.md` — *Collision de clé d'idempotence entre deux endpoints*

---

## 1. Le bug en une phrase

Le frontend envoyait **une seule clé UUID sur deux endpoints différents**
(création de commande, puis création de facture PayDunya), et le backend
identifiait ses enregistrements d'idempotence par la **seule `key`** en
ignorant le paramètre `path` → la création de facture récupérait en cache la
réponse de la création de commande, **aucune facture PayDunya n'était créée**,
et l'écran « Paiement confirmé » s'affichait **sans aucun encaissement**.

---

## 2. Ce qui a changé

| # | Fichier | Changement |
|---|---|---|
| 1 | `backend/prisma/schema.prisma` | `key` perd son unicité globale ; ajout de `@@unique([key, path], name: "key_path")` |
| 2 | `backend/prisma/migrations/20261110094500_scope_idempotency_key_by_path/migration.sql` | Migration : `DROP INDEX "IdempotencyKey_key_key"` + `CREATE UNIQUE INDEX "IdempotencyKey_key_path_key" ON ("key","path")` |
| 3 | `backend/src/common/services/idempotency.service.ts` | `getRecord` / `saveRecord` recherchent et upsertent sur le couple `(key, path)` |
| 4 | `backend/src/paydunya/paydunya.service.ts` | Défense en profondeur : la réponse en cache n'est renvoyée que si elle a bien la forme d'une `PayDunyaCheckoutResponse` |
| 5 | `frontend/src/components/store/CartDrawer.tsx` | Deux clés distinctes : `checkoutKeyRef` (commande) et `paymentKeyRef` (transaction) |
| 6 | `backend/test/idempotency-scoping.spec.ts` | 10 tests unitaires de non-collision (+ témoin de régression) |
| 7 | `backend/test/idempotency-scoping.e2e-spec.ts` | 4 tests e2e HTTP contre un vrai PostgreSQL |

### Le point clé du design

L'unicité est **composée** `(key, path)` et non plus globale sur `key` :

- **Les caches de deux endpoints distincts sont indépendants** → la collision
  inter-endpoints est structurellement impossible.
- **L'idempotence reste garantie à l'intérieur d'un même endpoint** → une clé
  rejouée sur le même `path` renvoie toujours la même réponse.

Le `path` devient donc une **partie intégrante de l'identité** de
l'enregistrement, et non plus une simple métadonnée de log.

### Bonus de sécurité : le compilateur devient un garde-fou

Après la migration, l'ancien code **ne compile plus** :

```
src/common/services/idempotency.service.ts:23:7 - error TS2322:
  Type '{ key: string; }' is not assignable to type 'IdempotencyKeyWhereUniqueInput'.
```

Le type généré par Prisma n'expose plus `key` comme entrée de `findUnique`.
Une régression vers la recherche par `key` seule est désormais **impossible à
compiler silencieusement**.

---

## 3. Sûreté de la migration pour les données existantes

La migration supprime une contrainte UNIQUE et en ajoute une plus faible
(composite). C'est **toujours sûr** : `key` étant auparavant globalement unique,
il ne pouvait pas exister deux lignes partageant le même couple `(key, path)`.
La nouvelle contrainte est donc **toujours respectée** par les données
existantes — aucune déduplication n'est nécessaire.

**Vérifié empiriquement sur PostgreSQL réel** :

```
1. Insertion de 2 lignes avec la MÊME clé et 2 paths différents
   → ERREUR : duplicate key value violates unique constraint
              "IdempotencyKey_key_key"          ← le bug, rendu visible par la base
2. Application de la migration
   → DROP INDEX / CREATE UNIQUE INDEX            ✅
3. Nouvelle insertion de la même clé sur 2 paths
   → INSERT 0 2                                  ✅ plus bloqué
4. Index après migration :
   IdempotencyKey_key_path_key  UNIQUE btree (key, path)   ✅
   IdempotencyKey_key_idx            btree (key)          (conservé)
```

---

## 4. Les tests

### 4.1 Tests unitaires — `backend/test/idempotency-scoping.spec.ts` (10 tests)

Utilisent un faux Prisma reproduisant fidèlement la contrainte UNIQUE
COMPOSITE.

| Groupe | Couverture |
|---|---|
| 1. Non-collision entre endpoints distincts | La réponse de commande n'est **PAS** renvoyée à la création de facture ; 2 enregistrements distincts cohabitent ; chaque endpoint récupère **sa** réponse |
| 2. Idempotence sur un même endpoint | Clé rejouée → même réponse ; mise à jour sans doublon ; 2 clés distinctes isolées |
| 3. Expiration et cas limites | Expiration scoped au couple ; purge ciblée ; clés/paths vides ignorés |
| 4. **Témoin de régression** | Rejoue l'**ancien** comportement (recherche par `key` seule) sur le même faux Prisma : il **collisionne**, tandis que le service corrigé **non**. Prouve que le test détecte réellement le bug C1. |

```
Tests: 10 passed, 10 total
```

### 4.2 Tests e2e — `backend/test/idempotency-scoping.e2e-spec.ts` (4 tests)

Contre un **vrai PostgreSQL** (conteneur `platforme-postgres`, base
`platforme_c1_test`), via de vrais appels HTTP `supertest` :

| Test | Vérifie |
|---|---|
| La réponse de commande n'est pas réutilisée par la création de facture | Régression HTTP du bug C1 |
| Les deux endpoints peuvent cohabiter avec la même clé | 2 enregistrements distincts en base |
| Rejouer la même clé sur le même endpoint renvoie la réponse mémorisée | L'idempotence est préservée |
| La contrainte UNIQUE `(key, path)` interdit les doublons | Le garde-fou est bien en base |

```
Tests: 4 passed, 4 total
```

---

## 5. Vérifications effectuées

| Vérification | Résultat |
|---|---|
| `prisma validate` | ✅ schema valide |
| `prisma generate` | ✅ client généré, `key_path` exposé dans `IdempotencyKeyWhereUniqueInput` |
| Migration appliquée sur PostgreSQL réel | ✅ `DROP INDEX` + `CREATE UNIQUE INDEX` OK, données conservées |
| `tsc --noEmit` (backend) | ✅ exit 0 |
| `tsc --noEmit` (frontend) | ✅ exit 0 |
| Tests unitaires du correctif | ✅ 10/10 |
| Tests e2e du correctif (vraie base) | ✅ 4/4 |
| Suite unitaire complète backend | ✅ 62/62 (4 suites) |
| Tests frontend (vitest) | ✅ 76/77 — le 1 échec est **pré-existant** (timeout 5000 ms sur `CartDrawer.test.tsx`), reproduit à l'identique sur `origin/main` non modifié |
| Build frontend (`next build`) | ✅ exit 0, 30 routes générées |
| Contre-épreuve : ancien code contre les nouveaux tests | ✅ **ne compile plus** (TS2322) — le compilateur bloque la régression |
| Contre-épreuve : chaîne de migrations sur `origin/main` **pur** | ✅ échec **identique** à `20260916` → le défaut de la chaîne est bien pré-existant et non imputable à C1 (voir §6) |

---

## 6. Mise en œuvre

### Appliquer la migration

```bash
cd backend
npx prisma migrate deploy      # production
npx prisma migrate dev         # développement (avec reset si nécessaire)
```

> ⚠️ **Point d'attention, indépendant de ce correctif.** La chaîne de
> migrations du dépôt est **cassée sur une base vierge** : la migration
> `20260916_fix_float_to_decimal_financial` fait un
> `ALTER TABLE "Boutique" ALTER COLUMN "balance"` alors que la migration
> `20260804183148_init` ne crée **pas** la colonne `balance`
> (`ERROR: column "balance" does not exist`).
> Ce défaut est **antérieur et sans rapport** avec le correctif C1 (il
> précède la migration `20261110` et ne touche pas `IdempotencyKey`), mais il
> empêchera une installation depuis zéro. **À corriger dans un ticket
> dédié.**
>
> *Contrôle d'imputabilité : `prisma migrate deploy` a été rejoué sur
> `origin/main` **pur** (aucune modification C1) et échoue exactement au même
> endroit (`20260916`, `SQLSTATE 42703`, `column "balance" does not exist`).
> La migration C1 est donc bien atteinte — et appliquée avec succès — sur une
> base déjà migrée, mais reste **inatteignable** sur une installation
> from scratch tant que `20260916` n'est pas corrigée.*

### Vérifier que le correctif est bien en place

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'IdempotencyKey';
-- Attendu :
--   IdempotencyKey_key_path_key | CREATE UNIQUE INDEX ... USING btree (key, path)
--   IdempotencyKey_key_key       | (doit avoir DISPARU)
```

---

## 7. Ce que ce correctif ne règle pas

Le finding C1 est clos, mais les findings **C2**, **C3**, **H1**, **H2** et
**H3** de l'audit restent ouverts. En particulier :

- **C2** — le montant payé n'est toujours pas comparé au montant attendu, et
  `confirm/:token` accepte toujours un `?orderId=` fourni par le client.
  *C'est le finding le plus grave restant.*
- **C3** — toujours aucun modèle `Payment`/`Ledger`.
- **H3** — le cycle de sortie de l'argent (remboursement, retrait) reste
  sans appel PSP.

La garde défensive ajoutée dans `paydunya.service.ts` (validation de la forme
de la réponse en cache) limite le périmètre du problème, mais **ne remplace
pas** la comparaison de montant : elle empêche une réponse de type « commande »
de fuiter vers le paiement, pas une facture de 100 FCFA de solder une commande
de 50 000 FCFA.

---

## 8. Fichiers du correctif

```
backend/prisma/schema.prisma                                            (modifié)
backend/prisma/migrations/20261110094500_scope_idempotency_key_by_path/ (nouveau)
backend/src/common/services/idempotency.service.ts                       (modifié)
backend/src/paydunya/paydunya.service.ts                                (modifié)
backend/test/idempotency-scoping.spec.ts                                (nouveau)
backend/test/idempotency-scoping.e2e-spec.ts                            (nouveau)
frontend/src/components/store/CartDrawer.tsx                            (modifié)
```
