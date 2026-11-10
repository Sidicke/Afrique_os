-- Correctif C3 — Modèle de données de paiement et comptabilité en partie double.
--
-- PROBLÈME : l'argent de la plateforme n'existait QUE comme `Boutique.balance`
-- (un compteur muté par increment/decrement), `Order.paymentRef` (texte libre)
-- et `SettlementAllocation`. Aucune trace d'événement financier, aucun grand
-- livre : impossible de répondre à « d'où viennent ces 500 000 FCFA sur le
-- solde de cette boutique ? », impossible de rapprocher, et le double crédit
-- ne pouvait être que DÉDUIT du code, jamais PROUVÉ.
--
-- CORRECTIF :
--   - `Payment` : table APPEND-ONLY alimentée à chaque événement financier.
--     La contrainte UNIQUE (provider, providerRef, kind) en fait la source de
--     vérité d'idempotence MÉTIER : un second règlement de la même facture
--     viole la contrainte en base — le double crédit devient impossible.
--   - `LedgerAccount` / `LedgerEntry` : comptabilité en partie double. Toutes
--     les lignes d'un même journal forment une écriture équilibrée (total
--     débit = total crédit), vérifiée par le LedgerService avant écriture.
--
-- SÛRETÉ POUR LES DONNÉES EXISTANTES : les trois tables sont nouvelles et
-- n'affectent aucun comportement métier. Les soldes de boutiques déjà constitués
-- sont REPORTS comme écriture d'ouverture, afin que le grand livre démarre
-- exactement sur `Boutique.balance` : la réconciliation est ainsi exacte dès
-- la première seconde, sans rupture de l'historique.

-- ---------------------------------------------------------------- Enums
CREATE TYPE "PaymentKind" AS ENUM ('CAPTURE', 'REFUND', 'PAYOUT', 'COMMISSION', 'CASHBACK');
CREATE TYPE "PaymentDirection" AS ENUM ('IN', 'OUT');
CREATE TYPE "PaymentStatus" AS ENUM ('RECORDED', 'RECONCILED', 'DISPUTED');
CREATE TYPE "LedgerAccountType" AS ENUM ('ESCROW', 'BOUTIQUE', 'REVENUE', 'LOYALTY', 'CUSTOMER', 'PAYOUT');
CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');

-- ---------------------------------------------------------------- Tables
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYDUNYA',
    "providerRef" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "orderId" TEXT,
    "boutiqueId" TEXT,
    "grossAmount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" "PaymentStatus" NOT NULL DEFAULT 'RECORDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LedgerAccountType" NOT NULL,
    "boutiqueId" TEXT,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "description" TEXT NOT NULL,
    "paymentId" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------- Index
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Payment_boutiqueId_createdAt_idx" ON "Payment"("boutiqueId", "createdAt");
CREATE INDEX "Payment_kind_createdAt_idx" ON "Payment"("kind", "createdAt");

-- ⭐ Source de vérité d'idempotence métier : un règlement par (PSP, référence, nature).
CREATE UNIQUE INDEX "Payment_provider_providerRef_kind_key" ON "Payment"("provider", "providerRef", "kind");

CREATE UNIQUE INDEX "LedgerAccount_code_key" ON "LedgerAccount"("code");
CREATE INDEX "LedgerAccount_boutiqueId_idx" ON "LedgerAccount"("boutiqueId");
CREATE INDEX "LedgerAccount_type_idx" ON "LedgerAccount"("type");

CREATE INDEX "LedgerEntry_accountId_createdAt_idx" ON "LedgerEntry"("accountId", "createdAt");
CREATE INDEX "LedgerEntry_journalId_idx" ON "LedgerEntry"("journalId");
CREATE INDEX "LedgerEntry_paymentId_idx" ON "LedgerEntry"("paymentId");
CREATE INDEX "LedgerEntry_orderId_idx" ON "LedgerEntry"("orderId");

-- ---------------------------------------------------------------- Clés étrangères
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------- Report des soldes existants
-- Comptes de la plateforme (fonds collectés, produits, fidélité, dettes clients,
-- retraits en cours). Solde initial nul : ils ne sont alimentés qu'à partir de
-- la migration.
INSERT INTO "LedgerAccount" ("id", "code", "type", "balance", "createdAt", "updatedAt") VALUES
  (md5('acct:PLATFORM_ESCROW'),  'PLATFORM_ESCROW',  'ESCROW',  0, NOW(), NOW()),
  (md5('acct:PLATFORM_REVENUE'), 'PLATFORM_REVENUE', 'REVENUE', 0, NOW(), NOW()),
  (md5('acct:PLATFORM_LOYALTY'), 'PLATFORM_LOYALTY', 'LOYALTY', 0, NOW(), NOW()),
  (md5('acct:PLATFORM_CUSTOMER'), 'PLATFORM_CUSTOMER', 'CUSTOMER', 0, NOW(), NOW()),
  (md5('acct:PLATFORM_PAYOUT'),  'PLATFORM_PAYOUT',  'PAYOUT',  0, NOW(), NOW());

-- Un compte par boutique porteuse d'un solde, plus l'écriture d'ouverture
-- correspondante : le grand livre démarre exactement sur `Boutique.balance`.
INSERT INTO "LedgerAccount" ("id", "code", "type", "boutiqueId", "balance", "createdAt", "updatedAt")
SELECT md5('acct:BOUTIQUE:' || b.id), 'BOUTIQUE:' || b.id, 'BOUTIQUE', b.id, b.balance, NOW(), NOW()
FROM "Boutique" b
WHERE b.balance <> 0;

INSERT INTO "LedgerEntry" ("id", "journalId", "accountId", "direction", "amount", "currency", "description", "createdAt")
SELECT
  md5('entry:OPENING:' || b.id),
  'OPENING:' || b.id,
  md5('acct:BOUTIQUE:' || b.id),
  CASE WHEN b.balance > 0 THEN 'CREDIT'::"LedgerDirection" ELSE 'DEBIT'::"LedgerDirection" END,
  ABS(b.balance),
  'XOF',
  'Solde d''ouverture — report du solde antérieur à la migration C3',
  NOW()
FROM "Boutique" b
WHERE b.balance <> 0;
