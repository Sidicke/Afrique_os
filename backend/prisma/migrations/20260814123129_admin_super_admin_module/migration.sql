-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ModerationTargetType" AS ENUM ('BOUTIQUE', 'PRODUCT', 'USER', 'ORDER', 'REVIEW');

-- CreateEnum
CREATE TYPE "VerificationDocumentType" AS ENUM ('IDENTITY', 'REGISTRE', 'LICENCE', 'PHOTO_BOUTIQUE', 'ADDRESS');

-- DropIndex
DROP INDEX "Product_brandId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "interval" TEXT NOT NULL DEFAULT 'month',
    "features" JSONB,
    "limits" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationReport" (
    "id" TEXT NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" "ModerationStatus" NOT NULL DEFAULT 'NEW',
    "reporterId" TEXT,
    "resolutionNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNote" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "id" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "type" "VerificationDocumentType" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "data" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_boutiqueId_key" ON "Subscription"("boutiqueId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "ModerationReport_status_idx" ON "ModerationReport"("status");

-- CreateIndex
CREATE INDEX "ModerationReport_targetType_targetId_idx" ON "ModerationReport"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ModerationReport_createdAt_idx" ON "ModerationReport"("createdAt");

-- CreateIndex
CREATE INDEX "AdminLog_adminId_idx" ON "AdminLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminNote_targetType_targetId_idx" ON "AdminNote"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "VerificationDocument_boutiqueId_idx" ON "VerificationDocument"("boutiqueId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSettings" ADD CONSTRAINT "PlatformSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
