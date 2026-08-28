-- Vérification du compte vendeur : badge « vérifié » affiché sur la vitrine
-- et sur les produits de la boutique une fois la demande validée.

CREATE TYPE "VerificationStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

ALTER TABLE "Boutique"
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NONE';
