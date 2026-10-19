-- CreateEnum
CREATE TYPE "CallEventType" AS ENUM ('JOINED', 'LEFT');

-- CreateTable
CREATE TABLE "CallAttendanceEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT,
    "participantName" TEXT,
    "eventType" "CallEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallAttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallAttendanceEvent_bookingId_idx" ON "CallAttendanceEvent"("bookingId");

-- AddForeignKey
ALTER TABLE "CallAttendanceEvent" ADD CONSTRAINT "CallAttendanceEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallAttendanceEvent" ADD CONSTRAINT "CallAttendanceEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
