-- AlterTable
ALTER TABLE "public"."ProductImage" ADD COLUMN     "isHover" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;
