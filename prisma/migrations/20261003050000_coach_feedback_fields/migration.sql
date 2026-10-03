-- AlterTable
ALTER TABLE "CoachApplication" ADD COLUMN "age" INTEGER,
ADD COLUMN "gender" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "joinedOnTime" BOOLEAN,
ADD COLUMN "explainedClearly" BOOLEAN,
ADD COLUMN "stayedOnTopic" BOOLEAN;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "feedbackRequestSentAt" TIMESTAMP(3);
