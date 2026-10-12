-- AlterTable: dayOfWeek becomes optional (a one-off window has a `date`
-- instead), and `date` is added for exactly that one-off case.
ALTER TABLE "Availability" ALTER COLUMN "dayOfWeek" DROP NOT NULL;
ALTER TABLE "Availability" ADD COLUMN "date" TIMESTAMP(3);
