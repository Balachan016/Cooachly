"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";

const YesNoSchema = z.enum(["yes", "no"]).transform((v) => v === "yes");

const ReviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  joinedOnTime: YesNoSchema,
  explainedClearly: YesNoSchema,
  stayedOnTopic: YesNoSchema,
  comment: z.string().trim().max(1000).optional(),
});

export type ReviewFormState = { message?: string; success?: true } | undefined;

export async function submitReview(_state: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const session = await requireRole("STUDENT", "PROFESSOR");

  const parsed = ReviewSchema.safeParse({
    bookingId: formData.get("bookingId"),
    rating: formData.get("rating"),
    joinedOnTime: formData.get("joinedOnTime"),
    explainedClearly: formData.get("explainedClearly"),
    stayedOnTopic: formData.get("stayedOnTopic"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) return { message: "Please answer every question and pick a rating from 1 to 5." };

  const { bookingId, rating, joinedOnTime, explainedClearly, stayedOnTopic, comment } = parsed.data;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { message: "Booking not found." };
  if (booking.status !== "COMPLETED") return { message: "You can only review completed sessions." };
  if (booking.studentId !== session.userId && booking.professorId !== session.userId) {
    return { message: "You weren't part of this session." };
  }

  const rateeId = session.userId === booking.studentId ? booking.professorId : booking.studentId;

  await prisma.review.upsert({
    where: { bookingId_raterId: { bookingId, raterId: session.userId } },
    create: {
      bookingId,
      raterId: session.userId,
      rateeId,
      rating,
      joinedOnTime,
      explainedClearly,
      stayedOnTopic,
      comment: comment || null,
    },
    update: { rating, joinedOnTime, explainedClearly, stayedOnTopic, comment: comment || null },
  });

  revalidatePath(sitePath(session.site, "/student/bookings"));
  revalidatePath(sitePath(session.site, "/professor/bookings"));
  revalidatePath(sitePath(session.site, "/student/professors"));
  return { message: "Thanks for your feedback!", success: true };
}
