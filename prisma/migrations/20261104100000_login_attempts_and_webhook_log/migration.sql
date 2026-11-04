-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "site" "Site" NOT NULL DEFAULT 'COOACHLY',
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_site_email_createdAt_idx" ON "LoginAttempt"("site", "email", "createdAt");

-- CreateIndex
CREATE INDEX "DailyWebhookEvent_receivedAt_idx" ON "DailyWebhookEvent"("receivedAt");
