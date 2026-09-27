-- CreateEnum
CREATE TYPE "Site" AS ENUM ('COOACHLY', 'ARTS');

-- AlterTable: User gets a Site column. Existing rows default to COOACHLY
-- (the platform's only site until now), and the old global-uniqueness
-- constraint on email is replaced with one scoped per site so the same
-- email can hold one Cooachly account and one separate Arts account.
ALTER TABLE "User" ADD COLUMN "site" "Site" NOT NULL DEFAULT 'COOACHLY';

DROP INDEX "User_email_key";

CREATE UNIQUE INDEX "User_site_email_key" ON "User"("site", "email");

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN "site" "Site" NOT NULL DEFAULT 'COOACHLY';

CREATE INDEX "Enquiry_site_idx" ON "Enquiry"("site");

-- AlterTable
ALTER TABLE "CoachApplication" ADD COLUMN "site" "Site" NOT NULL DEFAULT 'COOACHLY';

CREATE INDEX "CoachApplication_site_idx" ON "CoachApplication"("site");
