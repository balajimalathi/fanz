ALTER TABLE "call" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "call_permission" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_message" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversation" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "call" CASCADE;--> statement-breakpoint
DROP TABLE "call_permission" CASCADE;--> statement-breakpoint
DROP TABLE "chat_message" CASCADE;--> statement-breakpoint
DROP TABLE "conversation" CASCADE;--> statement-breakpoint
ALTER TABLE "service_order" DROP CONSTRAINT "service_order_call_id_call_id_fk";
--> statement-breakpoint
ALTER TABLE "service_order" DROP CONSTRAINT "service_order_conversation_id_conversation_id_fk";
--> statement-breakpoint
ALTER TABLE "service" ALTER COLUMN "service_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."service_type";--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('shoutout', 'audio_call', 'video_call');--> statement-breakpoint
ALTER TABLE "service" ALTER COLUMN "service_type" SET DATA TYPE "public"."service_type" USING "service_type"::"public"."service_type";--> statement-breakpoint
ALTER TABLE "service_order" DROP COLUMN "call_id";--> statement-breakpoint
ALTER TABLE "service_order" DROP COLUMN "conversation_id";--> statement-breakpoint
DROP TYPE "public"."call_status";--> statement-breakpoint
DROP TYPE "public"."call_type";