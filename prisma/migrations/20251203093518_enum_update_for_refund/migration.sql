/*
  Warnings:

  - The values [processed] on the enum `RefundStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RefundStatus_new" AS ENUM ('requested', 'approved', 'rejected', 'completed', 'cancelled', 'failed');
ALTER TABLE "public"."Refund" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Refund" ALTER COLUMN "status" TYPE "RefundStatus_new" USING ("status"::text::"RefundStatus_new");
ALTER TYPE "RefundStatus" RENAME TO "RefundStatus_old";
ALTER TYPE "RefundStatus_new" RENAME TO "RefundStatus";
DROP TYPE "public"."RefundStatus_old";
ALTER TABLE "Refund" ALTER COLUMN "status" SET DEFAULT 'requested';
COMMIT;
