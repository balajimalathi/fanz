CREATE TYPE "public"."call_status" AS ENUM('initiated', 'ringing', 'accepted', 'rejected', 'ended', 'missed');--> statement-breakpoint
CREATE TYPE "public"."call_type" AS ENUM('audio', 'video');--> statement-breakpoint
ALTER TYPE "public"."message_type" ADD VALUE 'image';--> statement-breakpoint
ALTER TYPE "public"."message_type" ADD VALUE 'video';--> statement-breakpoint
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
CREATE TABLE "call_permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"fan_id" text NOT NULL,
	"can_call" boolean DEFAULT false NOT NULL,
	"last_checked_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"message_type" "message_type" NOT NULL,
	"content" text,
	"media_url" text,
	"thumbnail_url" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"fan_id" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp,
	"last_message_preview" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call" ADD CONSTRAINT "call_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call" ADD CONSTRAINT "call_caller_id_user_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call" ADD CONSTRAINT "call_receiver_id_user_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_permission" ADD CONSTRAINT "call_permission_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_permission" ADD CONSTRAINT "call_permission_fan_id_user_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_fan_id_user_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;