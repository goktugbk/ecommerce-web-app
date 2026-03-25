/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `Cart` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cartId,productId]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Address` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- AlterTable
ALTER TABLE "public"."Address" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Cart" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "billCity" TEXT,
ADD COLUMN     "billCountry" TEXT,
ADD COLUMN     "billDistrict" TEXT,
ADD COLUMN     "billEmail" TEXT,
ADD COLUMN     "billFirstName" TEXT,
ADD COLUMN     "billLastName" TEXT,
ADD COLUMN     "billLine1" TEXT,
ADD COLUMN     "billLine2" TEXT,
ADD COLUMN     "billPhone" TEXT,
ADD COLUMN     "billPostal" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "shipCity" TEXT,
ADD COLUMN     "shipCountry" TEXT,
ADD COLUMN     "shipDistrict" TEXT,
ADD COLUMN     "shipEmail" TEXT,
ADD COLUMN     "shipFirstName" TEXT,
ADD COLUMN     "shipLastName" TEXT,
ADD COLUMN     "shipLine1" TEXT,
ADD COLUMN     "shipLine2" TEXT,
ADD COLUMN     "shipPhone" TEXT,
ADD COLUMN     "shipPostal" TEXT;

-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "public"."Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_sessionId_key" ON "public"."Cart"("sessionId");

-- CreateIndex
CREATE INDEX "Cart_createdAt_idx" ON "public"."Cart"("createdAt");

-- CreateIndex
CREATE INDEX "CartItem_createdAt_idx" ON "public"."CartItem"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "public"."CartItem"("cartId", "productId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "public"."Order"("userId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "public"."OrderItem"("productId");

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
