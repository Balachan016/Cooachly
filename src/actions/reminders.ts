"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sendBookingReminder } from "@/lib/notifications/reminders";

export async function sendManualReminder(bookingId: string) {
  await requireRole("ADMIN");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
  if (!booking || booking.status === "CANCELLED") return;

  await sendBookingReminder(booking, "manual");
  revalidatePath("/admin/bookings");
}
