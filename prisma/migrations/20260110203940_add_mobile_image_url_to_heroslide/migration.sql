/*
  Warnings:

  - You are about to drop the column `order` on the `HeroSlide` table. All the data in the column will be lost.
  - Made the column `title` on table `HeroSlide` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."HeroSlide" DROP COLUMN "order",
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "mobileImageUrl" TEXT,
ADD COLUMN     "startsAt" TIMESTAMP(3),
ALTER COLUMN "title" SET NOT NULL;
