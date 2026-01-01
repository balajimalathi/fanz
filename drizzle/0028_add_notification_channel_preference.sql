CREATE TABLE "notification_channel_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_channel_preference_user_id_channel_unique" UNIQUE("user_id", "channel")
);
--> statement-breakpoint
ALTER TABLE "notification_channel_preference" ADD CONSTRAINT "notification_channel_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Migrate existing notification preferences to channel preferences
-- If global enabled is true, enable all channels; if false, disable all
INSERT INTO "notification_channel_preference" ("user_id", "channel", "enabled", "created_at", "updated_at")
SELECT 
	np.user_id,
	unnest(ARRAY['payout', 'follow', 'comment', 'message', 'security', 'platform']::text[]) as channel,
	np.enabled,
	np.created_at,
	np.updated_at
FROM "notification_preference" np
ON CONFLICT ("user_id", "channel") DO NOTHING;

