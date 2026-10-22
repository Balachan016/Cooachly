-- AlterTable
ALTER TABLE "Availability" ADD COLUMN "periodYear" INTEGER;
ALTER TABLE "Availability" ADD COLUMN "periodMonth" INTEGER;

-- Backfill one-off (date-based) windows from their own date.
UPDATE "Availability"
SET "periodYear" = EXTRACT(YEAR FROM "date")::int,
    "periodMonth" = EXTRACT(MONTH FROM "date")::int
WHERE "date" IS NOT NULL;

-- Backfill existing recurring (dayOfWeek-based) windows to the current
-- calendar month (as of whenever this migration runs).
UPDATE "Availability"
SET "periodYear" = EXTRACT(YEAR FROM CURRENT_DATE)::int,
    "periodMonth" = EXTRACT(MONTH FROM CURRENT_DATE)::int
WHERE "dayOfWeek" IS NOT NULL;

-- Grandfather existing recurring windows: this app is switching from
-- "recurring forever" to "recurring within one selected month" — duplicate
-- every existing recurring window into next month too, so nobody's
-- bookable schedule silently disappears the moment the calendar flips;
-- professors/admin get a month's notice before they must start renewing
-- each month's availability themselves.
INSERT INTO "Availability"
  (id, "professorId", "dayOfWeek", "date", "startTime", "endTime", timezone, "sessionLengthMinutes", "isActive", "createdAt", "periodYear", "periodMonth")
SELECT
  gen_random_uuid()::text, "professorId", "dayOfWeek", NULL, "startTime", "endTime", timezone, "sessionLengthMinutes", "isActive", now(),
  EXTRACT(YEAR FROM (CURRENT_DATE + INTERVAL '1 month'))::int,
  EXTRACT(MONTH FROM (CURRENT_DATE + INTERVAL '1 month'))::int
FROM "Availability"
WHERE "dayOfWeek" IS NOT NULL
  AND "periodYear" = EXTRACT(YEAR FROM CURRENT_DATE)::int
  AND "periodMonth" = EXTRACT(MONTH FROM CURRENT_DATE)::int;

-- Every row now has a period — make it required.
ALTER TABLE "Availability" ALTER COLUMN "periodYear" SET NOT NULL;
ALTER TABLE "Availability" ALTER COLUMN "periodMonth" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Availability_professorId_periodYear_periodMonth_idx" ON "Availability"("professorId", "periodYear", "periodMonth");
