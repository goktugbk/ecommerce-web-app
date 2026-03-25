-- 1) Sütunu NULL olarak ekle (geçici)
ALTER TABLE "Order" ADD COLUMN "orderCode" TEXT;

-- 2) Varolan kayıtları doldur (benzersiz ve insan-okur bir kod)
-- Burada kesin benzersizlik için id'nin bir kısmını kullanıyoruz.
UPDATE "Order"
SET "orderCode" = 'ORD-' || substr("id", 1, 12)
WHERE "orderCode" IS NULL;

-- 3) UNIQUE + NOT NULL zorunluluğu getir
ALTER TABLE "Order" ADD CONSTRAINT "Order_orderCode_key" UNIQUE ("orderCode");
ALTER TABLE "Order" ALTER COLUMN "orderCode" SET NOT NULL;
