-- Update service_type enum: remove audio_call and video_call, add new service types
-- First, migrate existing audio_call and video_call services to shoutout (default)
UPDATE "service" SET "service_type" = 'shoutout'::text WHERE "service_type"::text = 'audio_call' OR "service_type"::text = 'video_call';--> statement-breakpoint

-- Convert enum to text temporarily
ALTER TABLE "service" ALTER COLUMN "service_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."service_type";--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('shoutout', 'chat', 'custom_video', 'custom_photo', 'product_review', 'endorsement', 'collaboration', 'personalized_message');--> statement-breakpoint
ALTER TABLE "service" ALTER COLUMN "service_type" SET DATA TYPE "public"."service_type" USING "service_type"::"public"."service_type";--> statement-breakpoint

-- Add new fulfillment fields to service_order table
ALTER TABLE "service_order" ADD COLUMN "customer_fulfilled_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_order" ADD COLUMN "fulfillment_deadline_hours" integer DEFAULT 12;--> statement-breakpoint
ALTER TABLE "service_order" ADD COLUMN "fulfillment_config" jsonb;--> statement-breakpoint

-- Set default fulfillment_deadline_hours for existing active orders
UPDATE "service_order" SET "fulfillment_deadline_hours" = 12 WHERE "fulfillment_deadline_hours" IS NULL;--> statement-breakpoint
