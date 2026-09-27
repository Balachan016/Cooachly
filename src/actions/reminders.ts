"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sendBookingReminder } from "@/lib/notifications/reminders";
import { sitePath } from "@/lib/site";

export async function sendManualReminder(bookingId: string) {
  const session = await requireRole("ADMIN");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
  if (!booking || booking.status === "CANCELLED" || booking.professor.site !== session.site) return;

  await sendBookingReminder(booking, "manual");
  revalidatePath(sitePath(session.site, "/admin/bookings"));
}
