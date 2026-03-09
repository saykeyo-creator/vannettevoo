-- AlterTable: Add status field to Patient
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
