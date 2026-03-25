-- 1) Address'e yeni alanları NULL olarak ekle (geçici)
ALTER TABLE "Address"
  ADD COLUMN IF NOT EXISTS "fullName"   TEXT,
  ADD COLUMN IF NOT EXISTS "phone"      TEXT,
  ADD COLUMN IF NOT EXISTS "district"   TEXT,
  ADD COLUMN IF NOT EXISTS "postalCode" TEXT,
  ADD COLUMN IF NOT EXISTS "label"      TEXT;

-- 2) Eski kolonlardan ve User tablosundan geri doldurma (backfill)
-- fullName: User.firstName + ' ' + User.lastName
UPDATE "Address" a
SET "fullName" = COALESCE(u."firstName",'') || ' ' || COALESCE(u."lastName",'')
FROM "User" u
WHERE a."userId" = u."id" AND (a."fullName" IS NULL OR a."fullName" = '');

-- district: varsa state, yoksa city
UPDATE "Address"
SET "district" = COALESCE("state", "city", '')
WHERE "district" IS NULL OR "district" = '';

-- postalCode: varsa postal
UPDATE "Address"
SET "postalCode" = COALESCE("postal", '')
WHERE "postalCode" IS NULL OR "postalCode" = '';

-- phone: User.phone'dan
UPDATE "Address" a
SET "phone" = u."phone"
FROM "User" u
WHERE a."userId" = u."id" AND (a."phone" IS NULL OR a."phone" = '');

-- 3) Artık NOT NULL yap
ALTER TABLE "Address"
  ALTER COLUMN "fullName"   SET NOT NULL,
  ALTER COLUMN "phone"      SET NOT NULL,
  ALTER COLUMN "district"   SET NOT NULL,
  ALTER COLUMN "postalCode" SET NOT NULL;

-- 4) Kullanıcıya defaultAddressId ekle (benzersiz + FK)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "defaultAddressId" TEXT;

-- benzersizlik (1-1 ilişki için)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'User_defaultAddressId_key'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_defaultAddressId_key" UNIQUE ("defaultAddressId");
  END IF;
END$$;

-- yabancı anahtar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name='User' AND constraint_name='User_defaultAddressId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_defaultAddressId_fkey"
      FOREIGN KEY ("defaultAddressId")
      REFERENCES "Address"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END$$;

-- 5) Artık gereksiz kolonları temizleyebilirsin (varsa)
ALTER TABLE "Address" DROP COLUMN IF EXISTS "isDefault";
ALTER TABLE "Address" DROP COLUMN IF EXISTS "state";
ALTER TABLE "Address" DROP COLUMN IF EXISTS "postal";
