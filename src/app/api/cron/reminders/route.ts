import { NextResponse } from "next/server";
import { addHours, addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendBookingReminder } from "@/lib/notifications/reminders";
import { sendDemoRequestReminder } from "@/lib/notifications/demo-requests";
import { sendTestDueSoonEmail } from "@/lib/notifications/tests";

// Run this endpoint every 5 minutes via an external scheduler such as
// cron-job.org. Each run looks for confirmed bookings starting ~24h, ~1h,
// or ~5m from now that haven't had that reminder sent yet, and sends it
// (email always; WhatsApp if the user has a phone number and Twilio is
// configured). Also sends a one-time "due soon" nudge for unsubmitted
// tests whose due date is ~24h away.

const WINDOW_MINUTES = 5;
const DEMO_REQUEST_REMINDER_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000; // every other day

const REMINDER_WINDOWS = [
  { kind: "24h" as const, field: "reminder24hSentAt" as const, target: () => addHours(new Date(), 24) },
  { kind: "1h" as const, field: "reminder1hSentAt" as const, target: () => addHours(new Date(), 1) },
  { kind: "5m" as const, field: "reminder5mSentAt" as const, target: () => addMinutes(new Date(), 5) },
];

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");
    const authorized = authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let sentCount = 0;

  for (const window of REMINDER_WINDOWS) {
    const target = window.target();
    const rangeStart = addMinutes(target, -WINDOW_MINUTES);
    const rangeEnd = addMinutes(target, WINDOW_MINUTES);

    const bookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        startAt: { gte: rangeStart, lte: rangeEnd },
        [window.field]: null,
      },
      include: { student: true, professor: true },
    });

    for (const booking of bookings) {
      await sendBookingReminder(booking, window.kind);
      await prisma.booking.update({
        where: { id: booking.id },
        data: { [window.field]: new Date() },
      });
      sentCount += 1;
    }
  }

  const dueSince = new Date(Date.now() - DEMO_REQUEST_REMINDER_INTERVAL_MS);
  const dueDemoRequests = await prisma.demoRequest.findMany({
    where: {
      status: { in: ["PENDING", "SCHEDULED"] },
      OR: [{ lastReminderSentAt: null, createdAt: { lte: dueSince } }, { lastReminderSentAt: { lte: dueSince } }],
    },
  });

  for (const demoRequest of dueDemoRequests) {
    await sendDemoRequestReminder(demoRequest);
    await prisma.demoRequest.update({
      where: { id: demoRequest.id },
      data: { lastReminderSentAt: new Date() },
    });
    sentCount += 1;
  }

  const testDueTarget = addHours(new Date(), 24);
  const testDueRangeStart = addMinutes(testDueTarget, -WINDOW_MINUTES);
  const testDueRangeEnd = addMinutes(testDueTarget, WINDOW_MINUTES);
  const dueSoonAssignments = await prisma.testAssignment.findMany({
    where: {
      status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      dueReminderSentAt: null,
      test: { dueAt: { gte: testDueRangeStart, lte: testDueRangeEnd } },
    },
    include: { test: true, student: true },
  });

  for (const assignment of dueSoonAssignments) {
    await sendTestDueSoonEmail(assignment.test, assignment, assignment.student);
    await prisma.testAssignment.update({
      where: { id: assignment.id },
      data: { dueReminderSentAt: new Date() },
    });
    sentCount += 1;
  }

  return NextResponse.json({ ok: true, remindersSent: sentCount });
}
