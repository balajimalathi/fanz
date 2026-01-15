ALTER TABLE "creator" ADD COLUMN "currency" varchar(3) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "creator" DROP COLUMN "preferred_currency";--> statement-breakpoint
ALTER TABLE "creator" DROP COLUMN "payout_currency";