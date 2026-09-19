"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/actions/reviews";
import { Button, FormMessage, Textarea } from "@/components/ui";

export function ReviewForm({
  bookingId,
  revieweeLabel,
  existingRating,
  existingComment,
}: {
  bookingId: string;
  revieweeLabel: string;
  existingRating?: number | null;
  existingComment?: string | null;
}) {
  const [state, action, pending] = useActionState(submitReview, undefined);
  const [rating, setRating] = useState(existingRating ?? 0);
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
    <form action={action} className="mt-2 space-y-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="rating" value={rating} />
      <p className="text-sm font-medium">Rate {revieweeLabel}</p>
      <div className="flex gap-1">
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
      <Textarea name="comment" rows={2} placeholder="Optional comment" defaultValue={existingComment ?? ""} />
      {state?.message && <FormMessage>{state.message}</FormMessage>}
      <Button type="submit" variant="secondary" disabled={pending || rating === 0}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
