"use client";

import { useActionState, useRef } from "react";
import type { Attachment, AttachmentKind } from "@prisma/client";
import { uploadAttachment } from "@/actions/attachments";
import { Button } from "@/components/ui";

export function AttachmentPanel({
  bookingId,
  attachments,
  canUploadTest,
  canUploadAnswer,
}: {
  bookingId: string;
  attachments: Attachment[];
  canUploadTest: boolean;
  canUploadAnswer: boolean;
}) {
  const testFiles = attachments.filter((a) => a.kind === "TEST");
  const answerFiles = attachments.filter((a) => a.kind === "ANSWER");

  if (!canUploadTest && !canUploadAnswer && testFiles.length === 0 && answerFiles.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2 text-sm">
      <FileList label="Test files" files={testFiles} />
      <FileList label="Answers" files={answerFiles} />
      {canUploadTest && <UploadForm bookingId={bookingId} kind="TEST" label="Share a test file" />}
      {canUploadAnswer && <UploadForm bookingId={bookingId} kind="ANSWER" label="Upload your answer" />}
    </div>
  );
}

function FileList({ label, files }: { label: string; files: Attachment[] }) {
  if (files.length === 0) return null;
  return (
    <div>
      <span className="font-medium text-black/60 dark:text-white/60">{label}: </span>
      {files.map((f, i) => (
        <span key={f.id}>
          {i > 0 && ", "}
          <a
            href={f.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-green-700 hover:underline dark:text-green-400"
          >
            {f.fileName}
          </a>
        </span>
      ))}
    </div>
  );
}

function UploadForm({ bookingId, kind, label }: { bookingId: string; kind: AttachmentKind; label: string }) {
  const action = uploadAttachment.bind(null, bookingId, kind);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await formAction(fd);
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="file" name="file" required className="text-xs" />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Uploading…" : label}
      </Button>
      {state?.message && (
        <span className={state.success ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          {state.message}
        </span>
      )}
    </form>
  );
}
