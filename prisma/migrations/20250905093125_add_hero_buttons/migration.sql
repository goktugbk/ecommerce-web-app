/*
  Warnings:

  - You are about to drop the column `ctas` on the `HeroSlide` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."HeroSlide" DROP COLUMN "ctas",
ADD COLUMN     "buttons" JSONB;
