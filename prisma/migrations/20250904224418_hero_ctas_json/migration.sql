/*
  Warnings:

  - You are about to drop the column `ctaHref` on the `HeroSlide` table. All the data in the column will be lost.
  - You are about to drop the column `ctaText` on the `HeroSlide` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."HeroSlide" DROP COLUMN "ctaHref",
DROP COLUMN "ctaText",
ADD COLUMN     "ctas" JSONB;
