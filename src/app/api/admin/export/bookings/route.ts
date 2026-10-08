import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { bookingStatusFilter } from "@/lib/bookings";
import { toCsv, csvResponseHeaders } from "@/lib/csv";

// Respects the same `student`, `date`, and `view` filters as the Admin →
// Bookings page, so "Export CSV" there downloads exactly what's on screen.
export async function GET(request: Request) {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const url = new URL(request.url);
  const studentId = url.searchParams.get("student") || "";
  const date = url.searchParams.get("date") || "";
  const view = url.searchParams.get("view") === "completed" ? "completed" : "upcoming";

  const where: Prisma.BookingWhereInput = {
    professor: { site: session.site },
    ...bookingStatusFilter(view),
    ...(studentId ? { studentId } : {}),
    ...(date ? { startAt: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) } } : {}),
  };

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { startAt: view === "completed" ? "desc" : "asc" },
    take: 5000,
    include: { student: true, professor: true },
  });

  const rows = [
    ["When (UTC)", "Student", "Student email", "Professor", "Status", "Payment status", "Price", "Currency", "Free demo"],
    ...bookings.map((b) => [
      b.startAt.toISOString(),
      b.student.name,
      b.student.email,
      b.professor.name,
      b.status,
      b.paymentStatus,
      (b.priceCents / 100).toFixed(2),
      b.currency,
      b.isDemo ? "Yes" : "No",
    ]),
  ];

  return new NextResponse(toCsv(rows), { headers: csvResponseHeaders(`bookings-${view}.csv`) });
}
