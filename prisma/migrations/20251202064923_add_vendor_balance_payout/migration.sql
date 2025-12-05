-- CreateTable
CREATE TABLE "VendorBalance" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "available_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_paid_out" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_payout_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBalanceTransaction" (
    "id" SERIAL NOT NULL,
    "balance_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" INTEGER,
    "balance_before" DOUBLE PRECISION NOT NULL,
    "balance_after" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayout" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "balance_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(50) NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "account_details" JSONB,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayoutItem" (
    "id" SERIAL NOT NULL,
    "payout_id" INTEGER NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorPayoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorBalance_organization_id_key" ON "VendorBalance"("organization_id");

-- CreateIndex
CREATE INDEX "VendorBalance_organization_id_idx" ON "VendorBalance"("organization_id");

-- CreateIndex
CREATE INDEX "VendorBalanceTransaction_balance_id_idx" ON "VendorBalanceTransaction"("balance_id");

-- CreateIndex
CREATE INDEX "VendorBalanceTransaction_reference_type_reference_id_idx" ON "VendorBalanceTransaction"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "VendorBalanceTransaction_created_at_idx" ON "VendorBalanceTransaction"("created_at");

-- CreateIndex
CREATE INDEX "VendorPayout_organization_id_idx" ON "VendorPayout"("organization_id");

-- CreateIndex
CREATE INDEX "VendorPayout_balance_id_idx" ON "VendorPayout"("balance_id");

-- CreateIndex
CREATE INDEX "VendorPayout_status_idx" ON "VendorPayout"("status");

-- CreateIndex
CREATE INDEX "VendorPayout_scheduled_date_idx" ON "VendorPayout"("scheduled_date");

-- CreateIndex
CREATE INDEX "VendorPayoutItem_payout_id_idx" ON "VendorPayoutItem"("payout_id");

-- CreateIndex
CREATE INDEX "VendorPayoutItem_order_item_id_idx" ON "VendorPayoutItem"("order_item_id");

-- AddForeignKey
ALTER TABLE "VendorBalance" ADD CONSTRAINT "VendorBalance_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBalanceTransaction" ADD CONSTRAINT "VendorBalanceTransaction_balance_id_fkey" FOREIGN KEY ("balance_id") REFERENCES "VendorBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_balance_id_fkey" FOREIGN KEY ("balance_id") REFERENCES "VendorBalance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayoutItem" ADD CONSTRAINT "VendorPayoutItem_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "VendorPayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayoutItem" ADD CONSTRAINT "VendorPayoutItem_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
