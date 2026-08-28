-- Code OTP de vérification (inscription) + unicité du téléphone utilisateur
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'REGISTER',
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpCode_identifier_purpose_idx" ON "OtpCode"("identifier", "purpose");

-- Déduplique les téléphones existants (données de démo) : garde le premier
-- compte par numéro, les suivants passent à NULL (l'unicité ne porte que sur
-- les valeurs renseignées).
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY "createdAt" ASC) AS rn
  FROM "User"
  WHERE phone IS NOT NULL
)
UPDATE "User" SET phone = NULL
FROM ranked
WHERE "User".id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
