-- Add HLS video streaming fields to post_media table
ALTER TABLE "post_media" ADD COLUMN "hls_url" text;--> statement-breakpoint
ALTER TABLE "post_media" ADD COLUMN "blur_thumbnail_url" text;

