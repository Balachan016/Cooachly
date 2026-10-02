import "server-only";
import { prisma } from "@/lib/prisma";
import type { NotificationChannel } from "@prisma/client";

type SendResult = { skipped: boolean; error?: string; from?: string; to?: string; cc?: string[]; sid?: string };

export async function logNotification(opts: {
  bookingId?: string | null;
  userId?: string | null;
  channel: NotificationChannel;
  kind: string;
  result: SendResult;
}) {
  const status = opts.result.skipped ? "SKIPPED" : opts.result.error ? "FAILED" : "SENT";

  await prisma.notificationLog.create({
    data: {
      bookingId: opts.bookingId ?? null,
      userId: opts.userId ?? null,
      channel: opts.channel,
      kind: opts.kind,
      status,
      error: opts.result.error ?? null,
      sender: opts.result.from ?? null,
      recipient: opts.result.to ?? null,
      cc: opts.result.cc?.length ? opts.result.cc.join(", ") : null,
      providerMessageSid: opts.result.sid ?? null,
    },
  });
}
