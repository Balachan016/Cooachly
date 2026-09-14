-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "dailyRoomName" TEXT,
ADD COLUMN     "dailyRoomUrl" TEXT,
ADD COLUMN     "recordingUrl" TEXT,
ADD COLUMN     "reminder1hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder24hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder5mSentAt" TIMESTAMP(3),
ADD COLUMN     "summarySentAt" TIMESTAMP(3),
ADD COLUMN     "transcript" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;
