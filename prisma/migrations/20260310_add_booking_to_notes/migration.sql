-- AlterTable: Add optional bookingId to PatientNote
ALTER TABLE "PatientNote" ADD COLUMN "bookingId" TEXT;

-- AddForeignKey
ALTER TABLE "PatientNote" ADD CONSTRAINT "PatientNote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
