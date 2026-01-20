ALTER TABLE "exchange_rates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_currency_preference" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "exchange_rates" CASCADE;--> statement-breakpoint
DROP TABLE "user_currency_preference" CASCADE;--> statement-breakpoint
ALTER TABLE "creator" ALTER COLUMN "currency" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "payment_transaction" ALTER COLUMN "base_currency" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "payout" ALTER COLUMN "payout_currency" SET DEFAULT 'INR';