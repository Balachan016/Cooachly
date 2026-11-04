"use client";

import { useState, useTransition } from "react";
import { sendAdminEmail } from "@/actions/mail";
import { Button, Input, Label, Textarea } from "@/components/ui";

export function ComposeMailForm() {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleClear() {
    setTo("");
    setCc("");
    setSubject("");
    setBody("");
    setResult(null);
  }

  function handleSend() {
    startTransition(async () => {
      const res = await sendAdminEmail({ to, cc: cc || undefined, subject, body });
      setResult(res);
      if (res.ok) handleClear();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="mail-to">To</Label>
        <Input
          id="mail-to"
          type="text"
          placeholder="student@example.com, parent@example.com"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="mail-cc">CC (optional)</Label>
        <Input id="mail-cc" type="text" placeholder="" value={cc} onChange={(e) => setCc(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="mail-subject">Subject</Label>
        <Input id="mail-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="mail-body">Message</Label>
        <Textarea id="mail-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          disabled={isPending || !to.trim() || !subject.trim() || !body.trim()}
          onClick={handleSend}
        >
          {isPending ? "Sending…" : "Send"}
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={handleClear}>
          Clear
        </Button>
      </div>
      {result && (
        <p className={`text-sm ${result.ok ? "text-black/70 dark:text-white/70" : "text-red-600 dark:text-red-400"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
