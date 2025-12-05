-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "fee_amount" DOUBLE PRECISION,
ADD COLUMN     "fee_type" VARCHAR(50);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "fee_amount" DOUBLE PRECISION,
ADD COLUMN     "fee_type" VARCHAR(50);
