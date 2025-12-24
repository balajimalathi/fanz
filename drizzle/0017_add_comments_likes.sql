-- Add post_like table
CREATE TABLE "post_like" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add post_comment table
CREATE TABLE "post_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"parent_comment_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add foreign keys
ALTER TABLE "post_like" ADD CONSTRAINT "post_like_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_like" ADD CONSTRAINT "post_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comment" ADD CONSTRAINT "post_comment_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comment" ADD CONSTRAINT "post_comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comment" ADD CONSTRAINT "post_comment_parent_comment_id_post_comment_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."post_comment"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Add unique constraint
ALTER TABLE "post_like" ADD CONSTRAINT "post_like_post_id_user_id_unique" UNIQUE("post_id","user_id");
--> statement-breakpoint
-- Add indexes for performance
CREATE INDEX "post_like_post_id_idx" ON "post_like"("post_id");--> statement-breakpoint
CREATE INDEX "post_like_user_id_idx" ON "post_like"("user_id");--> statement-breakpoint
CREATE INDEX "post_comment_post_id_idx" ON "post_comment"("post_id");--> statement-breakpoint
CREATE INDEX "post_comment_parent_comment_id_idx" ON "post_comment"("parent_comment_id");

