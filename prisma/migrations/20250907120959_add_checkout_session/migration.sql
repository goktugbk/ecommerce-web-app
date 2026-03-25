-- CreateTable
CREATE TABLE "public"."CheckoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckoutSession_userId_status_idx" ON "public"."CheckoutSession"("userId", "status");

-- CreateIndex
CREATE INDEX "CheckoutSession_cartId_idx" ON "public"."CheckoutSession"("cartId");
