-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "orderReference" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_boutiqueId_readAt_idx" ON "Notification"("boutiqueId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_boutiqueId_createdAt_idx" ON "Notification"("boutiqueId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;
