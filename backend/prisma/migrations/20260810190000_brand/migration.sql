-- Marques : le vendeur rattache ses produits à des marques (ex. catégorie
-- « Téléphone » avec les marques Samsung, Apple, Anker…).

CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Brand_boutiqueId_slug_key" ON "Brand"("boutiqueId", "slug");
CREATE INDEX "Brand_boutiqueId_idx" ON "Brand"("boutiqueId");

ALTER TABLE "Brand" ADD CONSTRAINT "Brand_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD COLUMN "brandId" TEXT;

ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");
