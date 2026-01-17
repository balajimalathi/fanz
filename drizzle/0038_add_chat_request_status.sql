-- Create conversation_request_status enum
CREATE TYPE "conversation_request_status" AS ENUM('pending_request', 'accepted', 'rejected');--> statement-breakpoint

-- Add request status fields to conversation table
ALTER TABLE "conversation" ADD COLUMN "request_status" "conversation_request_status" NOT NULL DEFAULT 'pending_request';--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "rejected_at" timestamp;--> statement-breakpoint

-- Update existing conversations:
-- Set conversations with messages to 'accepted' (they already have activity)
-- Set conversations without messages to 'pending_request' (require acceptance)
UPDATE "conversation" 
SET "request_status" = 'accepted', 
    "accepted_at" = COALESCE("last_message_at", "created_at")
WHERE EXISTS (
    SELECT 1 FROM "chat_message" 
    WHERE "chat_message"."conversation_id" = "conversation"."id"
);--> statement-breakpoint

-- Set requested_at for all existing conversations to their creation time
UPDATE "conversation" 
SET "requested_at" = "created_at"
WHERE "requested_at" IS NULL;