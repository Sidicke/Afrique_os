-- AlterEnum : WHATSAPP_CONFIRMED → PAID
-- Les données ont déjà été converties (UPDATE status='PAID' WHERE 'WHATSAPP_CONFIRMED').
-- On recrée le type sans WHATSAPP_CONFIRMED (PG ne permet pas de retirer une valeur).
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'SHIPPING', 'DELIVERED', 'CANCELLED');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::text::"OrderStatus");
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "OrderStatus_old";

-- Contexte commercial sur les conversations (produit / commande)
ALTER TABLE "Conversation" ADD COLUMN "productId" TEXT,
  ADD COLUMN "productName" TEXT,
  ADD COLUMN "productPrice" TEXT,
  ADD COLUMN "orderId" TEXT,
  ADD COLUMN "orderReference" TEXT;
