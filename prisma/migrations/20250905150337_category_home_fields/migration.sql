/*
  Warnings:

  - You are about to drop the `ExploreItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ExploreItem" DROP CONSTRAINT "ExploreItem_productId_fkey";

-- AlterTable
ALTER TABLE "public"."Category" ADD COLUMN     "homeFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "homeOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "imageUrl" TEXT;

-- DropTable
DROP TABLE "public"."ExploreItem";

-- CreateIndex
CREATE INDEX "Category_homeFeatured_homeOrder_idx" ON "public"."Category"("homeFeatured", "homeOrder");
