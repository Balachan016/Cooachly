import type { NotificationLog } from "@prisma/client";
import { Badge } from "@/components/ui";

/** "From → To · CC …" for a notification log row; renders nothing for rows logged before addresses were recorded. */
export function NotificationAddresses({ log }: { log: Pick<NotificationLog, "sender" | "recipient" | "cc"> }) {
  if (!log.sender && !log.recipient) return null;

  return (
    <span className="text-black/60 dark:text-white/60">
      <span className="text-black/40 dark:text-white/40">From</span> {log.sender ?? "—"}{" "}
      <span className="text-black/40 dark:text-white/40">→ To</span> {log.recipient ?? "—"}
      {log.cc && (
        <>
          {" "}
          <span className="text-black/40 dark:text-white/40">· CC</span> {log.cc}
        </>
      )}
    </span>
  );
}

/**
 * The async delivery outcome Twilio reports after accepting a WhatsApp/SMS
 * message or a Voice call (see /api/twilio/status) — "SENT" above only
 * means Twilio took it, not that it reached or was answered by the
 * recipient. Renders nothing until that callback has come back.
 */
export function DeliveryStatusBadge({ log }: { log: Pick<NotificationLog, "deliveryStatus" | "deliveryError"> }) {
  if (!log.deliveryStatus) return null;

  const tone =
    log.deliveryStatus === "delivered" || log.deliveryStatus === "read" || log.deliveryStatus === "completed"
      ? "success"
      : log.deliveryStatus === "undelivered" ||
          log.deliveryStatus === "failed" ||
          log.deliveryStatus === "busy" ||
          log.deliveryStatus === "no-answer"
        ? "danger"
        : "default";

  return (
    <>
      <Badge tone={tone}>{log.deliveryStatus}</Badge>
      {log.deliveryError && <span className="text-red-600 dark:text-red-400">— {log.deliveryError}</span>}
    </>
  );
}
