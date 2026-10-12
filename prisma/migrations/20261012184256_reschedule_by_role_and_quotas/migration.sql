-- AlterTable: permanent record of who proposed a reschedule that actually
-- took effect, so the monthly reschedule quota can be charged correctly
-- even after the pending-proposal fields are cleared on acceptance.
ALTER TABLE "Booking" ADD COLUMN "rescheduledByRole" "Role";

-- Backfill: every booking that was already rescheduled under the old
-- (student-only) quota was necessarily proposed by the student.
UPDATE "Booking" SET "rescheduledByRole" = 'STUDENT' WHERE "rescheduledAt" IS NOT NULL;
