/*
  Warnings:

  - You are about to drop the column `orderCode` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropIndex
DROP INDEX "public"."Order_orderCode_key";

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "orderCode",
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
