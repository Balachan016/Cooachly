-- Rename to match the "day before" reminder now firing 12h out instead of 24h.
ALTER TABLE "Booking" RENAME COLUMN "reminder24hSentAt" TO "reminder12hSentAt";
