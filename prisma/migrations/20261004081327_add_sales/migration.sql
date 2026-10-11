/*
  Warnings:

  - You are about to drop the column `invoiceNo` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `SaleItem` table. All the data in the column will be lost.
  - Added the required column `total` to the `SaleItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "invoiceNo",
DROP COLUMN "paidAmount",
DROP COLUMN "paymentMethod",
DROP COLUMN "tax";

-- AlterTable
ALTER TABLE "SaleItem" DROP COLUMN "discount",
ADD COLUMN     "total" DOUBLE PRECISION NOT NULL;
