import "server-only";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

type CodedRole = "STUDENT" | "PROFESSOR" | "ADMIN";

// Backed by a Postgres sequence per role (created, and seeded to continue
// right after the backfilled accounts, in the
// 20261012170701_user_codes_and_referral_code migration) so concurrent
// signups can never land on the same code.
const SEQUENCE_BY_ROLE: Record<CodedRole, string> = {
  STUDENT: "user_code_student_seq",
  PROFESSOR: "user_code_professor_seq",
  ADMIN: "user_code_admin_seq",
};
const PREFIX_BY_ROLE: Record<CodedRole, string> = {
  STUDENT: "ST",
  PROFESSOR: "PR",
  ADMIN: "AD",
};

function isCodedRole(role: Role): role is CodedRole {
  return role === "STUDENT" || role === "PROFESSOR" || role === "ADMIN";
}

/**
 * Assigns the next sequential human-friendly code for a newly created
 * Student, Professor, or Admin account — ST0001, PR0001, AD0001, and so on.
 * Superadmin accounts never get one (there's only ever one or two), so this
 * returns null for any other role. A professor's code doubles as the
 * referral code "Become a Coach" applicants can enter.
 *
 * `client` defaults to the shared `prisma`, but accepts a `$transaction`
 * callback's `tx` too — sequence values advance immediately either way
 * (Postgres never rolls back a nextval(), by design), so the only reason to
 * pass `tx` is to keep this query grouped with the rest of the transaction.
 */
export async function nextUserCode(role: Role, client: DbClient = prisma): Promise<string | null> {
  if (!isCodedRole(role)) return null;
  const sequence = SEQUENCE_BY_ROLE[role];
  const prefix = PREFIX_BY_ROLE[role];
  // `sequence` is always one of the two fixed, internally-defined names
  // above — never user input — so building the identifier into the query
  // text here carries no injection risk.
  const rows = await client.$queryRawUnsafe<{ nextval: bigint }[]>(`SELECT nextval('${sequence}') AS nextval`);
  return `${prefix}${String(rows[0].nextval).padStart(4, "0")}`;
}
