-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'BANK_TRANSFER';

-- AlterTable
ALTER TABLE "PreorderRound"
  ADD COLUMN "bankAccountHolder" TEXT,
  ADD COLUMN "bankAccountNumber" TEXT,
  ADD COLUMN "bankName" TEXT;
