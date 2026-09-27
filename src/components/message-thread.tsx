"use client";

import { useActionState, useRef } from "react";
import type { Message } from "@prisma/client";
import { sendMessage } from "@/actions/messages";
import { Button, Textarea } from "@/components/ui";

export function MessageThread({
  messages,
  currentUserId,
  peerId,
  peerName,
}: {
  messages: Message[];
  currentUserId: string;
  peerId: string;
  peerName: string;
}) {
  const [, action, pending] = useActionState(sendMessage, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex h-[32rem] flex-col rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900">
      <div className="border-b border-black/10 px-4 py-3 font-medium dark:border-white/10">{peerName}</div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const isMe = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                  isMe
                    ? "bg-brand-700 text-white"
                    : "bg-black/5 text-black dark:bg-white/10 dark:text-white"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-center text-sm text-black/50 dark:text-white/50">Say hello to start the conversation.</p>
        )}
      </div>
      <form
        ref={formRef}
        action={async (formData) => {
          await action(formData);
          formRef.current?.reset();
        }}
        className="flex gap-2 border-t border-black/10 p-3 dark:border-white/10"
      >
        <input type="hidden" name="receiverId" value={peerId} />
        <Textarea name="body" rows={1} placeholder="Type a message…" required className="resize-none" />
        <Button type="submit" disabled={pending}>
          Send
        </Button>
      </form>
    </div>
  );
}
