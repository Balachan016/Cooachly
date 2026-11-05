-- CreateTable
CREATE TABLE "AdminEmail" (
    "id" TEXT NOT NULL,
    "site" "Site" NOT NULL DEFAULT 'COOACHLY',
    "senderId" TEXT,
    "to" TEXT NOT NULL,
    "cc" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminEmail_site_createdAt_idx" ON "AdminEmail"("site", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminEmail" ADD CONSTRAINT "AdminEmail_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
