"use client";

import { useState, useTransition } from "react";
import type { InboundEmail } from "@prisma/client";
import { markInboundEmailRead } from "@/actions/mail";

/**
 * Inbound email content is attacker-controlled (anyone can email
 * admin@cooachly.com) — rendering its HTML directly in the admin's own
 * authenticated page would let a sender run arbitrary script in the
 * admin's session just by sending a message. An empty `sandbox` attribute
 * (present, not omitted) isolates the iframe completely: no script
 * execution, no same-origin access to this page's cookies/DOM, no forms,
 * no popups. Plain text has no such risk and renders directly.
 */
function InboundEmailBody({ html, text }: { html: string | null; text: string | null }) {
  if (html) {
    return (
      <iframe
        srcDoc={html}
        sandbox=""
        title="Email content"
        className="h-96 w-full rounded-lg border border-black/10 bg-white dark:border-white/10"
      />
    );
  }
  return <p className="whitespace-pre-wrap text-sm text-black/80 dark:text-white/80">{text || "(empty message)"}</p>;
}

export function InboxRow({
  email,
  viewerTimezone,
  mailPath,
}: {
  email: InboundEmail;
  viewerTimezone: string;
  mailPath: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const isUnread = !email.readAt;

  function toggle() {
    setExpanded((v) => !v);
    if (isUnread) {
      startTransition(() => {
        void markInboundEmailRead(email.id);
      });
    }
  }

  const replySubject = /^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`;
  const replyHref = `${mailPath}?view=sent&to=${encodeURIComponent(email.from)}&subject=${encodeURIComponent(replySubject)}`;

  return (
    <div className="p-4">
      <button type="button" onClick={toggle} className="flex w-full flex-wrap items-baseline justify-between gap-2 text-left">
        <span className="flex items-center gap-2">
          {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />}
          <span className={isUnread ? "font-semibold" : "font-medium"}>{email.subject || "(no subject)"}</span>
        </span>
        <span className="whitespace-nowrap text-xs text-black/50 dark:text-white/50">
          {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: viewerTimezone }).format(
            email.createdAt
          )}
        </span>
      </button>
      <div className="mt-1 text-sm text-black/60 dark:text-white/60">
        From: {email.from} · To: {email.to}
      </div>
      {expanded && (
        <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
          <InboundEmailBody html={email.html} text={email.text} />
          <a
            href={replyHref}
            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            Reply →
          </a>
        </div>
      )}
    </div>
  );
}
