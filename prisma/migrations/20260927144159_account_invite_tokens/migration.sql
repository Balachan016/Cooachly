-- CreateTable
CREATE TABLE "AccountInviteToken" (
    "id" TEXT NOT NULL,
    "site" "Site" NOT NULL DEFAULT 'COOACHLY',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "phone" TEXT,
    "message" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountInviteToken_tokenHash_key" ON "AccountInviteToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountInviteToken_site_email_idx" ON "AccountInviteToken"("site", "email");
