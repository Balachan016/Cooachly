"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptMonthlyConsent } from "@/actions/consent";
import { logout } from "@/actions/auth";
import { Button, Card, FormMessage } from "@/components/ui";
import { Logo } from "@/components/logo";
import { parseConsentContent, splitBoldSegments } from "@/lib/consent-format";

function Inline({ text }: { text: string }) {
  return (
    <>
      {splitBoldSegments(text).map((seg, i) =>
        seg.bold ? <strong key={i}>{seg.text}</strong> : <span key={i}>{seg.text}</span>
      )}
    </>
  );
}

export function ConsentGate({
  content,
  monthLabel,
  logo = <Logo withTagline />,
}: {
  content: string;
  monthLabel: string;
  logo?: ReactNode;
}) {
  const blocks = useMemo(() => parseConsentContent(content), [content]);
  const clauseCount = useMemo(() => blocks.filter((b) => b.type === "clause").length, [blocks]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [state, formAction, pending] = useActionState(acceptMonthlyConsent, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  const allChecked = checked.size === clauseCount;
  let clauseIndex = -1;

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:px-6">
      <div className="mb-8">{logo}</div>
      <Card className="w-full max-w-2xl">
        <h1 className="text-xl font-semibold">Please review and accept this month&apos;s agreement</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          This needs to be accepted once for {monthLabel} before you can continue.
        </p>

        <div className="mt-6 max-h-[28rem] overflow-y-auto rounded-lg border border-black/10 p-4 text-sm dark:border-white/10">
          {blocks.map((block, i) => {
            if (block.type === "heading") {
              const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
              return (
                <Tag key={i} className={block.level === 1 ? "mt-0 text-base font-semibold" : "mt-5 font-semibold"}>
                  <Inline text={block.text} />
                </Tag>
              );
            }
            if (block.type === "paragraph") {
              return (
                <p key={i} className="mt-3 text-black/70 dark:text-white/70">
                  <Inline text={block.text} />
                </p>
              );
            }
            clauseIndex++;
            const idx = clauseIndex;
            const isChecked = checked.has(idx);
            return (
              <label key={i} className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-md p-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700"
                  checked={isChecked}
                  onChange={() =>
                    setChecked((prev) => {
                      const next = new Set(prev);
                      if (next.has(idx)) next.delete(idx);
                      else next.add(idx);
                      return next;
                    })
                  }
                />
                <span>
                  <span className="font-medium">
                    <Inline text={block.title} />
                  </span>
                  {block.body && <span className="block text-black/70 dark:text-white/70"><Inline text={block.body} /></span>}
                </span>
              </label>
            );
          })}
        </div>

        {state?.message && <FormMessage>{state.message}</FormMessage>}

        <div className="mt-4 flex items-center justify-between gap-3">
          <form action={logout}>
            <Button type="submit" variant="secondary">
              Log out
            </Button>
          </form>

          <form action={formAction}>
            {Array.from(checked).map((idx) => (
              <input key={idx} type="hidden" name="acceptedClause" value={idx} />
            ))}
            <Button type="submit" disabled={!allChecked || pending}>
              {pending ? "Submitting…" : allChecked ? "I agree — continue" : `Check all ${clauseCount} items to continue`}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
