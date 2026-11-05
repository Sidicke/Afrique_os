-- Replace FEDAPAY with PAYDUNYA in PaymentMethod enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'PaymentMethod' AND e.enumlabel = 'FEDAPAY'
  ) THEN
    ALTER TYPE "PaymentMethod" RENAME VALUE 'FEDAPAY' TO 'PAYDUNYA';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'PaymentMethod' AND e.enumlabel = 'PAYDUNYA'
  ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'PAYDUNYA';
  END IF;
END
$$;
