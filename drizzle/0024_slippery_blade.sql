CREATE TYPE "public"."call_status" AS ENUM('initiated', 'ringing', 'accepted', 'rejected', 'ended', 'missed');--> statement-breakpoint
CREATE TYPE "public"."call_type" AS ENUM('audio', 'video');--> statement-breakpoint
CREATE TABLE "call" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"caller_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"call_type" "call_type" NOT NULL,
	"status" "call_status" NOT NULL,
	"livekit_room_name" text,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call" ADD CONSTRAINT "call_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call" ADD CONSTRAINT "call_caller_id_user_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call" ADD CONSTRAINT "call_receiver_id_user_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;