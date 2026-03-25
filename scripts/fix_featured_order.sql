UPDATE "public"."Product"
SET "featuredOrder" = 0
WHERE "featuredOrder" IS NULL;

ALTER TABLE "public"."Product"
ALTER COLUMN "featuredOrder" SET DEFAULT 0;

ALTER TABLE "public"."Product"
ALTER COLUMN "featuredOrder" SET NOT NULL;
