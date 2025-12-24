CREATE TYPE "public"."content_type" AS ENUM('18+', 'general');--> statement-breakpoint
CREATE TYPE "public"."creator_type" AS ENUM('ai', 'human');--> statement-breakpoint
CREATE TABLE "creator" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text,
	"display_name" text NOT NULL,
	"country" text,
	"creator_type" "creator_type",
	"content_type" "content_type",
	"gender" text,
	"date_of_birth" timestamp,
	"categories" jsonb,
	"onboarded" boolean DEFAULT false NOT NULL,
	"username_locked" boolean DEFAULT false NOT NULL,
	"subdomain" text,
	"onboarding_step" integer DEFAULT 0,
	"onboarding_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "creator_username_unique" UNIQUE("username"),
	CONSTRAINT "creator_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
ALTER TABLE "creator" ADD CONSTRAINT "creator_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;