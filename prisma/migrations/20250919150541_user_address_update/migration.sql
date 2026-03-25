-- DropForeignKey
ALTER TABLE "public"."Address" DROP CONSTRAINT "Address_userId_fkey";

-- DropIndex
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_defaultAddressId_key";

-- CreateIndex
CREATE INDEX "User_defaultAddressId_idx" ON "public"."User"("defaultAddressId");

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
