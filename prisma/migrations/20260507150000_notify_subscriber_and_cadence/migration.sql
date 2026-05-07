CREATE TABLE "NotifySubscriber" (
    "id" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "optedOutAt" TIMESTAMP(3),
    CONSTRAINT "NotifySubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotifySubscriber_whatsapp_key" ON "NotifySubscriber"("whatsapp");
CREATE INDEX "NotifySubscriber_optedOutAt_idx" ON "NotifySubscriber"("optedOutAt");

ALTER TABLE "BusinessSettings" ADD COLUMN "typicalCadence" TEXT;
