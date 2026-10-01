import type { NotificationLog } from "@prisma/client";

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
