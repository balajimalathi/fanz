ALTER TABLE "service" ALTER COLUMN "service_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."service_type";--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('shoutout', 'chat', 'custom_video', 'custom_photo', 'product_review', 'endorsement', 'collaboration', 'personalized_message');--> statement-breakpoint
ALTER TABLE "service" ALTER COLUMN "service_type" SET DATA TYPE "public"."service_type" USING "service_type"::"public"."service_type";--> statement-breakpoint
ALTER TABLE "service_order" ADD COLUMN "customer_fulfilled_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_order" ADD COLUMN "fulfillment_deadline_hours" integer DEFAULT 12;--> statement-breakpoint
ALTER TABLE "service_order" ADD COLUMN "fulfillment_config" jsonb;