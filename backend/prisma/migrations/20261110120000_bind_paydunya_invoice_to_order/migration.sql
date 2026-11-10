-- Correctif C2 — Liaison facture ↔ commande et montant facturé attendu.
--
-- PROBLÈME : au moment du règlement, le montant effectivement encaissé par
-- PayDunya n'était JAMAIS relu ni comparé au montant attendu par la commande.
-- Le crédit du vendeur se calculait systématiquement sur `Order.total`, quel
-- que soit le montant réellement payé. Pire, l'endpoint public
-- `GET /payments/paydunya/confirm/:token` acceptait un `?orderId=` fourni par
-- l'appelant comme source de commande : un token de facture « devinable »
-- suffisait à solder une commande arbitraire, donc à créditer une boutique
-- sans encaissement.
--
-- CORRECTIF : la commande porte désormais la trace serveur de sa facture
-- PayDunya — le token émis et le montant facturé, figés à l'émission.
-- Au règlement, le token encaissé doit correspondre à `paydunyaToken` et le
-- montant payé doit être exactement `paydunyaAmount` (fail-closed).
--
-- Sûr pour les données existantes : les deux colonnes sont NULLABLES et
-- n'ont aucune contrainte. Les commandes déjà réglées conservent leur
-- `paymentRef` (trace du paiement) et ne sont pas modifiées.

-- Trace de la facture PayDunya émise pour la commande + montant facturé.
ALTER TABLE "Order" ADD COLUMN     "paydunyaAmount" DECIMAL(12,2),
ADD COLUMN     "paydunyaToken" TEXT;

-- Index de recherche de la commande par token de facture.
CREATE INDEX "Order_paydunyaToken_idx" ON "Order"("paydunyaToken");
