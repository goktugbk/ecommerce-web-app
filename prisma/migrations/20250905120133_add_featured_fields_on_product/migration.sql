-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "featuredOrder" INTEGER,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;
