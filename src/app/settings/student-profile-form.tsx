"use client";

import { useActionState, useState } from "react";
import type { StudentProfile } from "@prisma/client";
import { updateStudentProfile } from "@/actions/student-profile";
import { Button, Input, Label, Select } from "@/components/ui";

export function StudentProfileForm({ profile }: { profile: StudentProfile | null }) {
  const [state, formAction, pending] = useActionState(updateStudentProfile, undefined);
  const [country, setCountry] = useState(profile?.country ?? "US");

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <div>
        <Label htmlFor="country">Country / Region</Label>
        <Select id="country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} required>
          <option value="US">United States</option>
          <option value="Middle East">Middle East</option>
          <option value="Singapore">Singapore</option>
        </Select>
      </div>

      {country === "US" ? (
        <div>
          <Label htmlFor="curriculumLevel">Level</Label>
          <Select id="curriculumLevel" name="curriculumLevel" defaultValue={profile?.curriculumLevel ?? "Honors"} required>
            <option value="Accelerated">Accelerated</option>
            <option value="Honors">Honors</option>
            <option value="AP">AP</option>
          </Select>
        </div>
      ) : (
        <div>
          <Label htmlFor="grade">Grade (Curriculum: CBSE)</Label>
          <Select id="grade" name="grade" defaultValue={profile?.grade ?? "9"} required>
            <option value="9">9</option>
            <option value="10">10</option>
            <option value="11">11</option>
            <option value="12">12</option>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="syllabus">Syllabus (PDF, image, or doc)</Label>
        <Input id="syllabus" name="syllabus" type="file" accept=".pdf,.doc,.docx,image/*" />
        {profile?.syllabusFileName && (
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Current file:{" "}
            <a href={profile.syllabusFileUrl ?? "#"} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline dark:text-brand-400">
              {profile.syllabusFileName}
            </a>
          </p>
        )}
      </div>

      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save curriculum details"}
      </Button>
    </form>
  );
}
