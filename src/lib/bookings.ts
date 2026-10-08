import type { Prisma } from "@prisma/client";

/**
 * Status half of the Prisma `where` clause for a bookings list. A cancelled
 * session scheduled for today stays in "upcoming" (still relevant — e.g. may
 * get rebooked same-day); every other cancelled session reads as history and
 * moves in with "completed", so the upcoming list isn't cluttered with old
 * cancellations.
 */
export function bookingStatusFilter(view: "upcoming" | "completed"): Prisma.BookingWhereInput {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const cancelledToday: Prisma.BookingWhereInput = {
    status: "CANCELLED",
    startAt: { gte: todayStart, lt: todayEnd },
  };

  if (view === "upcoming") {
    return { OR: [{ status: { in: ["PENDING", "CONFIRMED"] } }, cancelledToday] };
  }
  return {
    OR: [{ status: "COMPLETED" }, { status: "CANCELLED", NOT: { startAt: { gte: todayStart, lt: todayEnd } } }],
  };
}
