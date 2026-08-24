-- AlterTable
ALTER TABLE "DeliveryProject" ADD COLUMN IF NOT EXISTS "paypalOrderId" TEXT;
ALTER TABLE "DeliveryProject" ADD COLUMN IF NOT EXISTS "paypalCaptureId" TEXT;
ALTER TABLE "DeliveryProject" ADD COLUMN IF NOT EXISTS "platformFeePercent" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "DeliveryProject" ADD COLUMN IF NOT EXISTS "platformFeeAmount" INTEGER;
ALTER TABLE "DeliveryProject" ADD COLUMN IF NOT EXISTS "freelancerPayoutAmount" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryProject_paypalCaptureId_key" ON "DeliveryProject"("paypalCaptureId");
