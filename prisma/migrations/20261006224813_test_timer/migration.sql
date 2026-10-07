-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "TestAssignment" ADD COLUMN     "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0;
