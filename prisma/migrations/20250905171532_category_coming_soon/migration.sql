-- AlterTable
ALTER TABLE "public"."Category" ADD COLUMN     "comingSoon" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "comingSoonOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Category_comingSoon_comingSoonOrder_idx" ON "public"."Category"("comingSoon", "comingSoonOrder");
