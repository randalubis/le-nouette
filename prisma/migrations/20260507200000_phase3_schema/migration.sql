-- Phase 3 schema: L-04 (aspectRatio) + L-10 (story) + L-11 (faqAnswers)
-- + L-06 (Review model).

ALTER TABLE "Product" ADD COLUMN "aspectRatio" TEXT NOT NULL DEFAULT 'square';

ALTER TABLE "PreorderRound" ADD COLUMN "story" TEXT;

ALTER TABLE "BusinessSettings" ADD COLUMN "faqAnswers" JSONB;

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");
CREATE INDEX "Review_rating_idx" ON "Review"("rating");
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
