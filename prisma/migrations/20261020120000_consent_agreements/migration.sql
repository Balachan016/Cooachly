-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'CONSENT_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'CONSENT_TEMPLATE_UPDATED';

-- CreateTable
CREATE TABLE "ConsentTemplate" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ConsentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "site" "Site" NOT NULL,
    "role" "Role" NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsentTemplate_role_key" ON "ConsentTemplate"("role");

-- CreateIndex
CREATE INDEX "ConsentAcceptance_userId_idx" ON "ConsentAcceptance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentAcceptance_userId_periodYear_periodMonth_key" ON "ConsentAcceptance"("userId", "periodYear", "periodMonth");

-- AddForeignKey
ALTER TABLE "ConsentTemplate" ADD CONSTRAINT "ConsentTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAcceptance" ADD CONSTRAINT "ConsentAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
