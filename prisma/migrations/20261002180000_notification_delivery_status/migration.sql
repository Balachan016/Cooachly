-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN "providerMessageSid" TEXT,
ADD COLUMN "deliveryStatus" TEXT,
ADD COLUMN "deliveryError" TEXT,
ADD COLUMN "deliveryUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "NotificationLog_providerMessageSid_idx" ON "NotificationLog"("providerMessageSid");
