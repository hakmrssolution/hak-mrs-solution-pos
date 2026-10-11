-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'Rs.',
ADD COLUMN     "receiptFooter" TEXT NOT NULL DEFAULT 'Thank You!',
ADD COLUMN     "showAddress" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showLogo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showPhone" BOOLEAN NOT NULL DEFAULT true;
