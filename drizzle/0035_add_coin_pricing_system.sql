-- Add creator online status fields
ALTER TABLE "creator" ADD COLUMN "is_online" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint

-- Add DM pending charges fields to chat_message
ALTER TABLE "chat_message" ADD COLUMN "coins_pending" integer;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "coins_deducted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "deducted_at" timestamp;--> statement-breakpoint

-- Add call metering fields
ALTER TABLE "call" ADD COLUMN "coins_reserved" integer;--> statement-breakpoint
ALTER TABLE "call" ADD COLUMN "coins_spent" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "call" ADD COLUMN "last_heartbeat_at" timestamp;--> statement-breakpoint
ALTER TABLE "call" ADD COLUMN "metering_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Create creator_pricing table
CREATE TABLE "creator_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"dm_text_price" integer DEFAULT 0 NOT NULL,
	"dm_image_price" integer DEFAULT 0 NOT NULL,
	"dm_video_price" integer DEFAULT 0 NOT NULL,
	"audio_call_price_per_minute" integer DEFAULT 0 NOT NULL,
	"video_call_price_per_minute" integer DEFAULT 0 NOT NULL,
	"live_stream_entry_price" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "creator_pricing_creator_id_unique" UNIQUE("creator_id")
);
--> statement-breakpoint
ALTER TABLE "creator_pricing" ADD CONSTRAINT "creator_pricing_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;
