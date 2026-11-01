-- bookSlots (and, in principle, bulk-booking/schedule-import) checked
-- whether a slot was available and then created the booking as two
-- separate steps with nothing enforcing atomicity between them. A
-- double-submitted request (a double-click, or retrying after a slow
-- response) could read the slot as available twice before either insert
-- committed, creating two CONFIRMED bookings for the exact same
-- professor + start time. This is exactly what produced a batch of
-- duplicate bookings for one student/professor pair that had to be
-- cancelled by hand.
--
-- Dedupe any such live (PENDING/CONFIRMED) duplicates that already exist,
-- keeping the earliest-created one and cancelling the rest, before adding
-- the constraint that makes this impossible going forward — this way the
-- migration is self-healing and can't fail on existing dirty data.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "professorId", "startAt" ORDER BY "createdAt" ASC) AS rn
  FROM "Booking"
  WHERE status IN ('PENDING', 'CONFIRMED')
)
UPDATE "Booking" b
SET status = 'CANCELLED'
FROM ranked
WHERE b.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX "Booking_professorId_startAt_live_key"
  ON "Booking" ("professorId", "startAt")
  WHERE status IN ('PENDING', 'CONFIRMED');
