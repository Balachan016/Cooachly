-- CreateEnum
CREATE TYPE "DemoRequestStatus" AS ENUM ('PENDING', 'SCHEDULED', 'JOINED', 'DROPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'DEMO_REQUEST_SCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE 'DEMO_REQUEST_STATUS_CHANGED';

-- CreateTable
CREATE TABLE "DemoRequest" (
    "id" TEXT NOT NULL,
    "site" "Site" NOT NULL DEFAULT 'COOACHLY',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "timezone" TEXT,
    "status" "DemoRequestStatus" NOT NULL DEFAULT 'PENDING',
    "professorId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "meetingLink" TEXT,
    "adminNotes" TEXT,
    "lastReminderSentAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoRequest_site_status_idx" ON "DemoRequest"("site", "status");

-- CreateIndex
CREATE INDEX "DemoRequest_professorId_idx" ON "DemoRequest"("professorId");

-- AddForeignKey
ALTER TABLE "DemoRequest" ADD CONSTRAINT "DemoRequest_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
