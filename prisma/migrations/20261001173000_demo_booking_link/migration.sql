-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "demoRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_demoRequestId_key" ON "Booking"("demoRequestId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_demoRequestId_fkey" FOREIGN KEY ("demoRequestId") REFERENCES "DemoRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
