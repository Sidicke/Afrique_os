-- Snapshot de la description et de l'image du produit sur la conversation :
-- la carte produit affichée dans la discussion (image, nom, prix, description)
-- est servie sans jointure supplémentaire.
ALTER TABLE "Conversation" ADD COLUMN "productDescription" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "productImage" TEXT;
