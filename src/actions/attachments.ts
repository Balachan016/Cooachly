"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { uploadFile, isBlobConfigured } from "@/lib/blob";
import { sitePath } from "@/lib/site";
import type { AttachmentKind } from "@prisma/client";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export type AttachmentFormState = { message?: string; success?: true } | undefined;

export async function uploadAttachment(
  bookingId: string,
  kind: AttachmentKind,
  _state: AttachmentFormState,
  formData: FormData
): Promise<AttachmentFormState> {
  const session = await requireRole("ADMIN", "PROFESSOR", "STUDENT");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { professor: true } });
  if (!booking || booking.professor.site !== session.site) return { message: "Booking not found." };

  if (kind === "TEST") {
    const allowed =
      session.role === "ADMIN" || (session.role === "PROFESSOR" && booking.professorId === session.userId);
    if (!allowed) return { message: "Only the professor or an admin can share a test file here." };
  } else {
    const allowed = session.role === "STUDENT" && booking.studentId === session.userId;
    if (!allowed) return { message: "Only the student on this booking can upload an answer here." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { message: "Please choose a file." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { message: "File is too large (max 8MB)." };
  }

  if (!isBlobConfigured) {
    return { message: "File storage isn't configured yet. Ask an admin to set up Vercel Blob." };
  }

  const uploaded = await uploadFile({ pathname: `bookings/${bookingId}/${kind.toLowerCase()}-${file.name}`, file });
  if (!uploaded) return { message: "Upload failed. Please try again." };

  await prisma.attachment.create({
    data: {
      bookingId,
      uploadedById: session.userId,
      kind,
      fileName: file.name,
      fileUrl: uploaded.url,
    },
  });

  revalidatePath(sitePath(session.site, "/student/bookings"));
  revalidatePath(sitePath(session.site, "/professor/bookings"));
  revalidatePath(sitePath(session.site, "/admin/bookings"));

  return { message: "Uploaded.", success: true };
}
