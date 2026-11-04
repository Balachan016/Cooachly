"use client";

import { useState, useTransition } from "react";
import { sendSupportBotMessage } from "@/actions/support-bot";
import type { SupportBotMessage } from "@/lib/support-bot";
import { Button, Textarea } from "@/components/ui";

export function ChatPanel() {
  const [messages, setMessages] = useState<SupportBotMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    setMessages([]);
    setDraft("");
    setError(null);
  }

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    const next: SupportBotMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setDraft("");
    setError(null);

    startTransition(async () => {
      const result = await sendSupportBotMessage(next);
      if (result.error || !result.reply) {
        setError(result.error ?? "No reply.");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply as string }]);
    });
  }

  return (
    <div>
      <div className="min-h-[200px] space-y-3 rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
        {messages.length === 0 && (
          <p className="text-sm text-black/50 dark:text-white/50">
            Try a question a student or parent might ask — e.g. &quot;How do I book a session?&quot; or &quot;Can I
            get a refund?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-brand-700 text-white"
                : "bg-white text-black/80 dark:bg-neutral-800 dark:text-white/80"
            }`}
          >
            {m.content}
          </div>
        ))}
        {isPending && <p className="text-sm text-black/50 dark:text-white/50">Thinking…</p>}
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-3 flex items-end gap-3">
        <Textarea
          rows={2}
          placeholder="Ask the bot something…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button variant="secondary" disabled={isPending || !draft.trim()} onClick={handleSend}>
          Send
        </Button>
        <Button type="button" variant="secondary" disabled={isPending || messages.length === 0} onClick={handleReset}>
          Clear
        </Button>
      </div>
    </div>
  );
}
