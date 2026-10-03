"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/actions/reviews";
import { Button, FormMessage, Textarea } from "@/components/ui";

type YesNo = "yes" | "no" | "";

function YesNoQuestion({
  name,
  question,
  value,
  onChange,
}: {
  name: string;
  question: string;
  value: YesNo;
  onChange: (value: YesNo) => void;
}) {
  return (
    <div>
      <p className="text-sm text-black/70 dark:text-white/70">{question}</p>
      <div className="mt-1 flex gap-4">
        {(["yes", "no"] as const).map((option) => (
          <label key={option} className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 border-black/20 text-brand-700 focus:ring-brand-600 dark:border-white/20"
              required
            />
            {option === "yes" ? "Yes" : "No"}
          </label>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({
  bookingId,
  revieweeLabel,
  existingRating,
  existingComment,
  existingJoinedOnTime,
  existingExplainedClearly,
  existingStayedOnTopic,
}: {
  bookingId: string;
  revieweeLabel: string;
  existingRating?: number | null;
  existingComment?: string | null;
  existingJoinedOnTime?: boolean | null;
  existingExplainedClearly?: boolean | null;
  existingStayedOnTopic?: boolean | null;
}) {
  const [state, action, pending] = useActionState(submitReview, undefined);
  const [rating, setRating] = useState(existingRating ?? 0);
  const [joinedOnTime, setJoinedOnTime] = useState<YesNo>(boolToYesNo(existingJoinedOnTime));
  const [explainedClearly, setExplainedClearly] = useState<YesNo>(boolToYesNo(existingExplainedClearly));
  const [stayedOnTopic, setStayedOnTopic] = useState<YesNo>(boolToYesNo(existingStayedOnTopic));
  const [submitted, setSubmitted] = useState(!!existingRating);

  if (state?.success && !submitted) setSubmitted(true);

  if (submitted) {
    return (
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        You rated {revieweeLabel}: {"★".repeat(rating)}
        {"☆".repeat(5 - rating)}
      </p>
    );
  }

  return (
    <form action={action} className="mt-2 space-y-4 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="rating" value={rating} />
      <p className="text-sm font-medium">Share feedback on {revieweeLabel}</p>

      <YesNoQuestion
        name="joinedOnTime"
        question={`Did ${revieweeLabel} join the call on time?`}
        value={joinedOnTime}
        onChange={setJoinedOnTime}
      />
      <YesNoQuestion
        name="explainedClearly"
        question={`Was ${revieweeLabel} able to explain things clearly, until you understood?`}
        value={explainedClearly}
        onChange={setExplainedClearly}
      />
      <YesNoQuestion
        name="stayedOnTopic"
        question={`Did ${revieweeLabel} stay focused on the course topic throughout?`}
        value={stayedOnTopic}
        onChange={setStayedOnTopic}
      />

      <div>
        <p className="text-sm text-black/70 dark:text-white/70">Overall rating</p>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className="text-2xl leading-none"
            >
              {n <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>
      </div>

      <Textarea name="comment" rows={2} placeholder="Optional comment" defaultValue={existingComment ?? ""} />
      {state?.message && <FormMessage>{state.message}</FormMessage>}
      <Button
        type="submit"
        variant="secondary"
        disabled={pending || rating === 0 || !joinedOnTime || !explainedClearly || !stayedOnTopic}
      >
        {pending ? "Submitting…" : "Submit feedback"}
      </Button>
    </form>
  );
}

function boolToYesNo(value?: boolean | null): YesNo {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}
