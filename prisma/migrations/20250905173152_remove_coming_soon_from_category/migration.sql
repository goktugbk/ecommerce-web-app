/*
  Warnings:

  - You are about to drop the column `comingSoon` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `comingSoonOrder` on the `Category` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Category_comingSoon_comingSoonOrder_idx";

-- AlterTable
ALTER TABLE "public"."Category" DROP COLUMN "comingSoon",
DROP COLUMN "comingSoonOrder";
