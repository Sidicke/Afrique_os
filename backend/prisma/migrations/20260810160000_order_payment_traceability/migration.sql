-- Ajout de la traçabilité du paiement client (référence fournisseur + date de confirmation)
ALTER TABLE "Order" ADD COLUMN "paymentRef" TEXT;
ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);
