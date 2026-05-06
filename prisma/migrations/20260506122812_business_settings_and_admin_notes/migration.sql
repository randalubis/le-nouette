-- AlterTable
ALTER TABLE "Order" ADD COLUMN "adminNotes" TEXT;

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'Le Nouette',
    "whatsappNumber" TEXT,
    "deliveryLocation" TEXT,
    "aboutBlurb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);
