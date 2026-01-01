CREATE TYPE "public"."live_stream_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."live_stream_type" AS ENUM('free', 'follower_only', 'paid');--> statement-breakpoint
ALTER TYPE "public"."payment_transaction_type" ADD VALUE 'live_stream';--> statement-breakpoint
CREATE TABLE "live_stream" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"livekit_room_name" text NOT NULL,
	"stream_type" "live_stream_type" NOT NULL,
	"price" integer,
	"status" "live_stream_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "live_stream_livekit_room_name_unique" UNIQUE("livekit_room_name")
);
--> statement-breakpoint
CREATE TABLE "live_stream_purchase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"live_stream_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"payment_transaction_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "live_stream" ADD CONSTRAINT "live_stream_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_stream_purchase" ADD CONSTRAINT "live_stream_purchase_live_stream_id_live_stream_id_fk" FOREIGN KEY ("live_stream_id") REFERENCES "public"."live_stream"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_stream_purchase" ADD CONSTRAINT "live_stream_purchase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_stream_purchase" ADD CONSTRAINT "live_stream_purchase_payment_transaction_id_payment_transaction_id_fk" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transaction"("id") ON DELETE set null ON UPDATE no action;