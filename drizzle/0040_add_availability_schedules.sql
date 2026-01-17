-- Add availability schedule fields to creator table
ALTER TABLE "creator" ADD COLUMN "chat_availability_schedule" jsonb;--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "call_availability_schedule" jsonb;