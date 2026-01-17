-- Add chat and call enabled fields to creator table
ALTER TABLE "creator" ADD COLUMN "chat_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "call_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
