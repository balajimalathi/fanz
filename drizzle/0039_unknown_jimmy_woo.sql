CREATE TYPE "public"."conversation_request_status" AS ENUM('pending_request', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "coin_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" text NOT NULL,
	"fan_wallet_transaction_id" uuid NOT NULL,
	"coins_used" integer NOT NULL,
	"usd_value" integer NOT NULL,
	"creator_currency" varchar(3) NOT NULL,
	"creator_amount" integer NOT NULL,
	"platform_fee" integer NOT NULL,
	"exchange_rate" numeric(10, 6) NOT NULL,
	"payment_transaction_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "request_status" "conversation_request_status" DEFAULT 'pending_request' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "rejected_at" timestamp;--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" ADD COLUMN "coin_value_usd" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" ADD COLUMN "exchange_rate" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" ADD COLUMN "creator_currency" varchar(3);--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" ADD COLUMN "linked_purchase_transaction_id" uuid;--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" ADD COLUMN "remaining_coins" integer;--> statement-breakpoint
ALTER TABLE "coin_earnings" ADD CONSTRAINT "coin_earnings_creator_id_creator_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_earnings" ADD CONSTRAINT "coin_earnings_fan_wallet_transaction_id_fan_wallet_transaction_id_fk" FOREIGN KEY ("fan_wallet_transaction_id") REFERENCES "public"."fan_wallet_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_earnings" ADD CONSTRAINT "coin_earnings_payment_transaction_id_payment_transaction_id_fk" FOREIGN KEY ("payment_transaction_id") REFERENCES "public"."payment_transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" ADD CONSTRAINT "fan_wallet_transaction_linked_purchase_transaction_id_fan_wallet_transaction_id_fk" FOREIGN KEY ("linked_purchase_transaction_id") REFERENCES "public"."fan_wallet_transaction"("id") ON DELETE set null ON UPDATE no action;