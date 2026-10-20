import "server-only";
import { prisma } from "@/lib/prisma";
import { SITE_CONFIG, type Site } from "@/lib/site";
import { countClauses } from "@/lib/consent-format";

// {{brandName}} / {{roleLabel}} / {{roleLabelLower}} are substituted per
// site+role before this is ever shown to someone or logged in a
// ConsentAcceptance — see renderConsentContent. Admin can override either
// of these from Superadmin → Settings (see ConsentTemplate); these are only
// the fallback used until that's ever saved.
const DEFAULT_PROFESSOR_CONSENT = `# {{brandName}} – {{roleLabel}} Consent & Agreement

**Please read and acknowledge the following terms before completing your {{roleLabelLower}} registration.**

By registering as a {{roleLabelLower}} on {{brandName}}, I confirm that I have read, understood, and agreed to the following terms and conditions.

### {{roleLabel}} Consent Checklist

☐ **1. Accuracy of Information**
I confirm that all personal details, academic qualifications, teaching experience, and other information provided during registration are true and accurate.

☐ **2. Professional Conduct**
I agree to maintain professional behaviour, respectful communication, punctuality, and appropriate conduct while interacting with students, parents, and the {{brandName}} team.

☐ **3. Class Scheduling and Attendance**
I agree to honour the classes I accept, adhere to the mutually agreed schedule, and inform the concerned parties promptly of any unavoidable changes.

☐ **4. Rescheduling Policy**
I understand that rescheduling is permitted once per month, provided that at least 24 hours' prior notice is given. Any exceptional circumstances will be handled in coordination with the {{brandName}} team.

☐ **5. Class Preparation and Quality**
I agree to prepare adequately for each session, follow the agreed syllabus and learning objectives, and provide quality instruction appropriate to the student's level.

☐ **6. Payment and Fee Terms**
I acknowledge that {{roleLabelLower}} compensation, payment schedules, and other applicable financial terms will be communicated and mutually agreed upon before the commencement of classes.

☐ **7. Student Privacy and Confidentiality**
I agree to protect students' and parents' personal information, contact details, academic records, and other confidential information. I will not disclose or misuse such information without proper authorisation.

☐ **8. Communication and Platform Usage**
I agree to use {{brandName}}'s platform and communication channels responsibly and to provide accurate updates regarding class attendance, progress, and scheduling whenever required.

☐ **9. Independent Professional Responsibility**
I understand that I am responsible for the accuracy of my qualifications, the quality of my teaching, and fulfilling the commitments I accept through {{brandName}}.

☐ **10. Fair and Respectful Treatment**
I agree to treat all students and parents fairly, without discrimination, harassment, or inappropriate conduct.

☐ **11. Recording and Use of Learning Materials**
I agree to respect intellectual property rights and student privacy. Any recording of classes or use of student-related materials must comply with {{brandName}}'s policies and applicable consent requirements.

☐ **12. Updates to Policies**
I understand that {{brandName}} may communicate updates to its policies and terms. Any material changes requiring renewed consent will be communicated appropriately.

### Final Declaration

☐ **I hereby confirm that I have read, understood, and voluntarily agree to all the above terms and conditions as a {{roleLabelLower}} registering on {{brandName}}. I understand that my registration and participation are subject to the applicable {{brandName}} policies and agreements.**`;

// Placeholder only — the real Student Consent & Agreement text hasn't been
// supplied yet. Replace this from Superadmin → Settings → Consent
// agreements (no code change needed) as soon as it is.
const DEFAULT_STUDENT_CONSENT = `# {{brandName}} – {{roleLabel}} Consent & Agreement

**Please read and acknowledge the following terms before continuing.**

By using {{brandName}} as a {{roleLabelLower}}, I confirm that I have read, understood, and agreed to the following terms and conditions.

### {{roleLabel}} Consent Checklist

☐ **1. Placeholder — awaiting official text**
This is a placeholder clause. An admin should replace this template's content from Superadmin → Settings → Consent agreements with the official Student Consent & Agreement text.

### Final Declaration

☐ **I hereby confirm that I have read, understood, and voluntarily agree to all the above terms and conditions as a {{roleLabelLower}} using {{brandName}}.**`;

function defaultTemplateFor(role: "STUDENT" | "PROFESSOR"): string {
  return role === "PROFESSOR" ? DEFAULT_PROFESSOR_CONSENT : DEFAULT_STUDENT_CONSENT;
}

export function roleLabelFor(site: Site, role: "STUDENT" | "PROFESSOR"): string {
  if (role === "STUDENT") return "Student";
  return site === "ARTS" ? "Guru" : "Professor";
}

export function renderConsentContent(template: string, site: Site, role: "STUDENT" | "PROFESSOR"): string {
  const roleLabel = roleLabelFor(site, role);
  return template
    .replaceAll("{{brandName}}", SITE_CONFIG[site].brandName)
    .replaceAll("{{roleLabel}}", roleLabel)
    .replaceAll("{{roleLabelLower}}", roleLabel.toLowerCase());
}

/** The raw (unsubstituted) template an admin is editing, for a given role. */
export async function getConsentTemplateSource(role: "STUDENT" | "PROFESSOR"): Promise<string> {
  const stored = await prisma.consentTemplate.findUnique({ where: { role } });
  return stored?.content ?? defaultTemplateFor(role);
}

/** The fully rendered text to show (and log) for a given site+role. */
export async function getConsentContentFor(site: Site, role: "STUDENT" | "PROFESSOR"): Promise<string> {
  const template = await getConsentTemplateSource(role);
  return renderConsentContent(template, site, role);
}

function currentPeriod(viewerTimezone: string, reference: Date = new Date()): { year: number; month: number } {
  const formatted = new Intl.DateTimeFormat("en-CA", { timeZone: viewerTimezone, year: "numeric", month: "2-digit" }).format(reference);
  const [year, month] = formatted.split("-").map(Number);
  return { year, month };
}

export type ConsentRequirement = { needsAcceptance: true; content: string; clauseCount: number } | { needsAcceptance: false };

/**
 * Gate used by the student/professor layouts (both sites): has this person
 * accepted the current calendar month's (their own timezone) consent
 * agreement yet? If not, returns the content they need to accept so the
 * layout can render the consent gate instead of the dashboard.
 */
export async function getConsentRequirement(opts: {
  userId: string;
  site: Site;
  role: "STUDENT" | "PROFESSOR";
  viewerTimezone: string;
}): Promise<ConsentRequirement> {
  const { year, month } = currentPeriod(opts.viewerTimezone);
  const existing = await prisma.consentAcceptance.findUnique({
    where: { userId_periodYear_periodMonth: { userId: opts.userId, periodYear: year, periodMonth: month } },
  });
  if (existing) return { needsAcceptance: false };

  const content = await getConsentContentFor(opts.site, opts.role);
  return { needsAcceptance: true, content, clauseCount: countClauses(content) };
}

export { currentPeriod as consentCurrentPeriod };
