-- Allow unpaid vault deletion to remove assets, and track checkout grace.
ALTER TABLE "DeliveryProject" ADD COLUMN IF NOT EXISTS "checkoutStartedAt" TIMESTAMP(3);

ALTER TABLE "Asset" DROP CONSTRAINT IF EXISTS "Asset_projectId_fkey";
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DeliveryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
