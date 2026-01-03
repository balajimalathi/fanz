-- Add currency support to payment_transaction table
ALTER TABLE "payment_transaction" ADD COLUMN "original_currency" varchar(3) DEFAULT 'INR';
ALTER TABLE "payment_transaction" ADD COLUMN "base_currency" varchar(3) DEFAULT 'USD';
ALTER TABLE "payment_transaction" ADD COLUMN "converted_amount" integer;
ALTER TABLE "payment_transaction" ADD COLUMN "exchange_rate" numeric(10,6);
ALTER TABLE "payment_transaction" ADD COLUMN "processor_fee" integer;

-- Add currency support to payout table
ALTER TABLE "payout" ADD COLUMN "payout_currency" varchar(3) DEFAULT 'USD';
ALTER TABLE "payout" ADD COLUMN "converted_from_amount" integer;
ALTER TABLE "payout" ADD COLUMN "converted_amount" integer;
ALTER TABLE "payout" ADD COLUMN "exchange_rate" numeric(10,6);
ALTER TABLE "payout" ADD COLUMN "payout_fee" integer;

-- Add currency preferences to creator table
ALTER TABLE "creator" ADD COLUMN "preferred_currency" varchar(3) DEFAULT 'USD';
ALTER TABLE "creator" ADD COLUMN "payout_currency" varchar(3) DEFAULT 'USD';

-- Create exchange_rates table
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency" varchar(3) NOT NULL,
	"to_currency" varchar(3) NOT NULL,
	"rate" numeric(10,6) NOT NULL,
	"source" text NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);

-- Create unique index on exchange_rates for currency pair and timestamp
CREATE UNIQUE INDEX "exchange_rates_from_to_fetched_idx" ON "exchange_rates" ("from_currency", "to_currency", "fetched_at");

-- Create user_currency_preference table
CREATE TABLE "user_currency_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"currency" varchar(3) NOT NULL,
	"detected_from" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint for user_currency_preference
ALTER TABLE "user_currency_preference" ADD CONSTRAINT "user_currency_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

-- Migrate existing data: Set default values for existing transactions
-- Existing transactions are assumed to be in INR, convert amounts to USD base
-- Note: This is a simplified migration. In production, you may want to:
-- 1. Fetch historical exchange rates for accurate conversion
-- 2. Update converted_amount based on historical rates
UPDATE "payment_transaction" 
SET 
  "original_currency" = 'INR',
  "base_currency" = 'USD',
  "converted_amount" = "amount", -- Temporary: assumes 1:1 for migration (should use actual historical rate)
  "exchange_rate" = 1.0 -- Should be updated with actual historical rates
WHERE "original_currency" IS NULL;

-- Set default currency for existing creators based on country (if available)
-- This is a placeholder - you may want to implement country-to-currency mapping
UPDATE "creator" 
SET 
  "preferred_currency" = CASE 
    WHEN "country" = 'IN' THEN 'INR'
    WHEN "country" = 'US' THEN 'USD'
    WHEN "country" IN ('GB', 'UK') THEN 'GBP'
    ELSE 'USD'
  END,
  "payout_currency" = CASE 
    WHEN "country" = 'IN' THEN 'INR'
    WHEN "country" = 'US' THEN 'USD'
    WHEN "country" IN ('GB', 'UK') THEN 'GBP'
    ELSE 'USD'
  END
WHERE "preferred_currency" IS NULL;

