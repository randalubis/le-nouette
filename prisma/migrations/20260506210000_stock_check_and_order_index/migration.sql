-- DB-level guard against overselling and negative stock from concurrent
-- transactions or admin reconciliation bugs. Uses NOT VALID + VALIDATE so
-- that adding the constraint never blocks writes for the duration of a
-- full table scan; existing rows are validated as a separate, cheap step.
ALTER TABLE "RoundProduct"
  ADD CONSTRAINT "RoundProduct_stockSold_within_limit"
  CHECK ("stockSold" >= 0 AND "stockSold" <= "stockLimit") NOT VALID;

ALTER TABLE "RoundProduct"
  VALIDATE CONSTRAINT "RoundProduct_stockSold_within_limit";

-- Speeds up the all-orders admin page which filters/orders by createdAt.
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
