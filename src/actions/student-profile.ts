"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { uploadFile, isBlobConfigured } from "@/lib/blob";

export type StudentProfileFormState = { message?: string; success?: true } | undefined;

const StudentProfileSchema = z.object({
  country: z.enum(["US", "Middle East", "Singapore"]),
  curriculumLevel: z.enum(["Accelerated", "Honors", "AP"]).optional(),
  grade: z.enum(["9", "10", "11", "12"]).optional(),
});

export async function updateStudentProfile(
  _state: StudentProfileFormState,
  formData: FormData
): Promise<StudentProfileFormState> {
  const session = await requireRole("STUDENT");

  const parsed = StudentProfileSchema.safeParse({
    country: formData.get("country"),
    curriculumLevel: formData.get("curriculumLevel") || undefined,
    grade: formData.get("grade") || undefined,
  });

  if (!parsed.success) {
    return { message: "Please check the form fields and try again." };
  }

  const { country, curriculumLevel, grade } = parsed.data;
  const isUS = country === "US";

  if (isUS && !curriculumLevel) {
    return { message: "Please select a level (Accelerated, Honors, or AP)." };
  }
  if (!isUS && !grade) {
    return { message: "Please select a grade." };
  }

  const existing = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });

  let syllabusFileName = existing?.syllabusFileName ?? null;
  let syllabusFileUrl = existing?.syllabusFileUrl ?? null;
  let fileWarning: string | null = null;

  const file = formData.get("syllabus");
  if (file instanceof File && file.size > 0) {
    if (!isBlobConfigured) {
      fileWarning = "Saved your other details, but file storage isn't configured yet, so the syllabus wasn't uploaded.";
    } else {
      const uploaded = await uploadFile({ pathname: `syllabi/${session.userId}-${file.name}`, file });
      if (!uploaded) {
        fileWarning = "Saved your other details, but the syllabus upload failed. Please try again.";
      } else {
        syllabusFileName = file.name;
        syllabusFileUrl = uploaded.url;
      }
    }
  }

  await prisma.studentProfile.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      country,
      curriculumLevel: isUS ? curriculumLevel : null,
      curriculum: isUS ? null : "CBSE",
      grade: isUS ? null : grade,
      syllabusFileName,
      syllabusFileUrl,
    },
    update: {
      country,
      curriculumLevel: isUS ? curriculumLevel : null,
      curriculum: isUS ? null : "CBSE",
      grade: isUS ? null : grade,
      syllabusFileName,
      syllabusFileUrl,
    },
  });

  revalidatePath("/settings");
  return { message: fileWarning ?? "Saved.", success: true };
}
