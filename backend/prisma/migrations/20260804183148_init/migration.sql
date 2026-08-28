-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VENDEUR', 'CLIENT');

-- CreateEnum
CREATE TYPE "BoutiqueStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'WHATSAPP_CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOBILE_MONEY', 'CASH_ON_DELIVERY', 'CARD', 'WHATSAPP_DIRECT');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('CLIENT', 'VENDEUR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "refreshTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boutique" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "status" "BoutiqueStatus" NOT NULL DEFAULT 'PENDING',
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "country" TEXT,
    "whatsappNumber" TEXT,
    "coverImage" TEXT,
    "logoImage" TEXT,
    "deliveryShortLabel" TEXT,
    "deliveryNote" TEXT,
    "warrantyNote" TEXT,
    "paymentNote" TEXT,
    "socialLinks" JSONB,
    "deliveryPacks" JSONB,
    "promotions" JSONB,
    "notifications" JSONB,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Boutique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "oldPrice" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "images" TEXT[],
    "boutiqueId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "priceDelta" DECIMAL(12,2),
    "stock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "city" TEXT,
    "country" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'MOBILE_MONEY',
    "deliveryName" TEXT,
    "deliveryPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantLabel" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "userId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderRole" "MessageSender" NOT NULL,
    "senderId" TEXT,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Boutique_slug_key" ON "Boutique"("slug");

-- CreateIndex
CREATE INDEX "Boutique_ownerId_idx" ON "Boutique"("ownerId");

-- CreateIndex
CREATE INDEX "Boutique_status_idx" ON "Boutique"("status");

-- CreateIndex
CREATE INDEX "Category_boutiqueId_idx" ON "Category"("boutiqueId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_boutiqueId_slug_key" ON "Category"("boutiqueId", "slug");

-- CreateIndex
CREATE INDEX "Product_boutiqueId_isActive_idx" ON "Product"("boutiqueId", "isActive");

-- CreateIndex
CREATE INDEX "Product_boutiqueId_categoryId_idx" ON "Product"("boutiqueId", "categoryId");

-- CreateIndex
CREATE INDEX "Product_boutiqueId_price_idx" ON "Product"("boutiqueId", "price");

-- CreateIndex
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "Product_boutiqueId_slug_key" ON "Product"("boutiqueId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Variant_productId_name_value_key" ON "Variant"("productId", "name", "value");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "Review"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE INDEX "Order_boutiqueId_status_idx" ON "Order"("boutiqueId", "status");

-- CreateIndex
CREATE INDEX "Order_boutiqueId_createdAt_idx" ON "Order"("boutiqueId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "Conversation_boutiqueId_idx" ON "Conversation"("boutiqueId");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Subscriber_boutiqueId_idx" ON "Subscriber"("boutiqueId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_boutiqueId_email_key" ON "Subscriber"("boutiqueId", "email");

-- AddForeignKey
ALTER TABLE "Boutique" ADD CONSTRAINT "Boutique_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE CASCADE ON UPDATE CASCADE;
