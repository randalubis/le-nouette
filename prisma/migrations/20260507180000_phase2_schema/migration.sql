-- X-04, X-05, X-06: schema changes for Phase 2 Week 2.

-- X-04: soft-hold expiry on Order. NULL = no hold (COD or already paid).
ALTER TABLE "Order" ADD COLUMN "stockHoldExpiresAt" TIMESTAMP(3);
CREATE INDEX "Order_stockHoldExpiresAt_idx" ON "Order"("stockHoldExpiresAt");

-- X-05: canonical normalized form of customerWhatsApp. Backfilled below in
-- a single UPDATE so the column exists before code starts writing it.
ALTER TABLE "Order" ADD COLUMN "normalizedWhatsApp" TEXT;
UPDATE "Order"
   SET "normalizedWhatsApp" =
     CASE
       WHEN regexp_replace("customerWhatsApp", '[^0-9]', '', 'g') LIKE '0%'
         THEN '62' || substring(regexp_replace("customerWhatsApp", '[^0-9]', '', 'g') from 2)
       ELSE regexp_replace("customerWhatsApp", '[^0-9]', '', 'g')
     END;
CREATE INDEX "Order_normalizedWhatsApp_idx" ON "Order"("normalizedWhatsApp");

-- X-04 + X-06: new OrderStatus enum values.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_CONFIRMATION';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'HOLD_EXPIRED';
