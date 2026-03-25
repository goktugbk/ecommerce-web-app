/*
  Warnings:

  - You are about to drop the column `userId` on the `CheckoutSession` table. All the data in the column will be lost.
  - The `status` column on the `CheckoutSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."CheckoutStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED', 'EXPIRED');

-- DropIndex
DROP INDEX "public"."CheckoutSession_cartId_idx";

-- DropIndex
DROP INDEX "public"."CheckoutSession_userId_status_idx";

-- AlterTable
ALTER TABLE "public"."CheckoutSession" DROP COLUMN "userId",
ADD COLUMN     "clientIp" TEXT,
ADD COLUMN     "userAgent" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."CheckoutStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "CheckoutSession_cartId_status_idx" ON "public"."CheckoutSession"("cartId", "status");

-- AddForeignKey
ALTER TABLE "public"."CheckoutSession" ADD CONSTRAINT "CheckoutSession_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
