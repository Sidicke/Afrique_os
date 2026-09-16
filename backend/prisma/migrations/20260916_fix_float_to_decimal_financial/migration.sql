-- Migration: Fix Float → Decimal for financial fields
-- CWE-682: Incorrect Calculation — float types introduce rounding errors
-- on monetary amounts in XOF/FCFA (West African CFA franc, no sub-units)

-- Boutique.balance : Float → DECIMAL(14, 2)
ALTER TABLE "Boutique" ALTER COLUMN "balance" TYPE DECIMAL(14, 2)
  USING "balance"::DECIMAL(14, 2);

-- Conversation.agreedPrice : Float → DECIMAL(14, 2)
ALTER TABLE "Conversation" ALTER COLUMN "agreedPrice" TYPE DECIMAL(14, 2)
  USING "agreedPrice"::DECIMAL(14, 2);

-- WithdrawalRequest.amount : Float → DECIMAL(14, 2)
ALTER TABLE "WithdrawalRequest" ALTER COLUMN "amount" TYPE DECIMAL(14, 2)
  USING "amount"::DECIMAL(14, 2);
