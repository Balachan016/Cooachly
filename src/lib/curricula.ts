import type { Site } from "@prisma/client";

export const CURRICULUM_OPTIONS = ["CBSE", "AP", "Honors", "Accelerated"] as const;

// Carnatic vocals doesn't have "curricula" in the academic sense, but reuses
// the same tagging field to describe a student/teacher's proficiency level.
export const ARTS_LEVEL_OPTIONS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Varnam",
  "Kriti",
  "Concert-ready",
] as const;

export function curriculumOptionsForSite(site: Site): readonly string[] {
  return site === "ARTS" ? ARTS_LEVEL_OPTIONS : CURRICULUM_OPTIONS;
}
