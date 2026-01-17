ALTER TABLE "coin_earnings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "coin_earnings" CASCADE;--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" DROP CONSTRAINT "fan_wallet_transaction_linked_purchase_transaction_id_fan_wallet_transaction_id_fk";
--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "chat_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "call_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "request_status";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "requested_at";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "accepted_at";--> statement-breakpoint
ALTER TABLE "conversation" DROP COLUMN "rejected_at";--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" DROP COLUMN "coin_value_usd";--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" DROP COLUMN "exchange_rate";--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" DROP COLUMN "creator_currency";--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" DROP COLUMN "linked_purchase_transaction_id";--> statement-breakpoint
ALTER TABLE "fan_wallet_transaction" DROP COLUMN "remaining_coins";--> statement-breakpoint
DROP TYPE "public"."conversation_request_status";