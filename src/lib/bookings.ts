import type { Prisma } from "@prisma/client";

export type BookingListView = "upcoming" | "completed" | "cancelled";

/**
 * Status half of the Prisma `where` clause for a bookings list. A cancelled
 * session scheduled for today stays in "upcoming" too (still relevant — e.g.
 * may get rebooked same-day), but every cancelled session — today's
 * included — has its own "cancelled" tab, and "completed" is purely sessions
 * that actually happened.
 */
export function bookingStatusFilter(view: BookingListView): Prisma.BookingWhereInput {
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
  if (view === "cancelled") {
    return { status: "CANCELLED" };
  }
  return { status: "COMPLETED" };
}
