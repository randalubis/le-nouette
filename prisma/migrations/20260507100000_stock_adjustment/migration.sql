CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockAdjustment_roundId_idx" ON "StockAdjustment"("roundId");
CREATE INDEX "StockAdjustment_productId_idx" ON "StockAdjustment"("productId");
