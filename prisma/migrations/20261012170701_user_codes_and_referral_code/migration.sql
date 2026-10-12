-- AlterTable
ALTER TABLE "User" ADD COLUMN "code" TEXT;

-- AlterTable
ALTER TABLE "CoachApplication" ADD COLUMN "referralCode" TEXT;

-- Backfill: assign every existing Student/Professor/Admin a sequential code
-- (ST0001, PR0001, AD0001, ...), ordered by account creation so the oldest
-- accounts get the lowest numbers. Superadmin accounts are left without one.
WITH ranked AS (
  SELECT id,
         role,
         ROW_NUMBER() OVER (PARTITION BY role ORDER BY "createdAt" ASC) AS rn
  FROM "User"
  WHERE role IN ('STUDENT', 'PROFESSOR', 'ADMIN')
)
UPDATE "User" u
SET "code" = CASE ranked.role
    WHEN 'STUDENT' THEN 'ST' || LPAD(ranked.rn::text, 4, '0')
    WHEN 'PROFESSOR' THEN 'PR' || LPAD(ranked.rn::text, 4, '0')
    WHEN 'ADMIN' THEN 'AD' || LPAD(ranked.rn::text, 4, '0')
  END
FROM ranked
WHERE u.id = ranked.id;

-- CreateIndex
CREATE UNIQUE INDEX "User_code_key" ON "User"("code");

-- Sequences driving every NEW Student/Professor/Admin's code from here on,
-- continuing straight after the backfill above so a freshly created account
-- can never collide with an existing one. nextval() is atomic, so concurrent
-- signups never race for the same number.
CREATE SEQUENCE "user_code_student_seq";
CREATE SEQUENCE "user_code_professor_seq";
CREATE SEQUENCE "user_code_admin_seq";

SELECT setval('user_code_student_seq', (SELECT COUNT(*) FROM "User" WHERE role = 'STUDENT'));
SELECT setval('user_code_professor_seq', (SELECT COUNT(*) FROM "User" WHERE role = 'PROFESSOR'));
SELECT setval('user_code_admin_seq', (SELECT COUNT(*) FROM "User" WHERE role = 'ADMIN'));
