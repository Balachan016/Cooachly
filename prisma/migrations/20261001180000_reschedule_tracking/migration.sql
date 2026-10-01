-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'BOOKING_RESCHEDULED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "rescheduledAt" TIMESTAMP(3);
