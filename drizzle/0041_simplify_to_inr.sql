-- Simplify currency system to INR only
-- Remove exchange_rates and user_currency_preference tables
-- Update currency defaults to INR
-- Keep migration columns for future transformation

-- Drop exchange_rates table
DROP TABLE IF EXISTS "exchange_rates";

-- Drop user_currency_preference table
DROP TABLE IF EXISTS "user_currency_preference";

-- Update creator table default currency to INR
ALTER TABLE "creator" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- Update payment_transaction table default base_currency to INR
ALTER TABLE "payment_transaction" ALTER COLUMN "base_currency" SET DEFAULT 'INR';

-- Update payout table default payout_currency to INR
ALTER TABLE "payout" ALTER COLUMN "payout_currency" SET DEFAULT 'INR';

-- Update existing records to use INR where currency is NULL or USD
UPDATE "creator" 
SET "currency" = 'INR'
WHERE "currency" IS NULL OR "currency" = 'USD';

UPDATE "payment_transaction"
SET "base_currency" = 'INR'
WHERE "base_currency" IS NULL OR "base_currency" = 'USD';

UPDATE "payout"
SET "payout_currency" = 'INR'
WHERE "payout_currency" IS NULL OR "payout_currency" = 'USD';

-- Note: Migration columns (original_currency, base_currency, converted_amount, exchange_rate, processor_fee, 
-- payout_currency, converted_from_amount, converted_amount, exchange_rate, payout_fee, preferred_currency, payout_currency)
-- are kept intact to facilitate future transformation back to multicurrency support
