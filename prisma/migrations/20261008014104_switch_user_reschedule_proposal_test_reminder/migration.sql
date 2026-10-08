-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_VIEWED_USER';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_SWITCHED_TO_USER';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_RETURNED_TO_OWN_ACCOUNT';
ALTER TYPE "AuditAction" ADD VALUE 'TEST_ASSIGNED_BY_ADMIN';
ALTER TYPE "AuditAction" ADD VALUE 'BOOKING_RESCHEDULE_PROPOSED';
ALTER TYPE "AuditAction" ADD VALUE 'BOOKING_RESCHEDULE_DECLINED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "rescheduleProposedAt" TIMESTAMP(3),
ADD COLUMN     "rescheduleProposedBy" "Role",
ADD COLUMN     "rescheduleProposedReason" TEXT,
ADD COLUMN     "rescheduleProposedStartAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TestAssignment" ADD COLUMN     "dueReminderSentAt" TIMESTAMP(3);
