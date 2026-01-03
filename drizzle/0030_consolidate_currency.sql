-- Consolidate preferred_currency and payout_currency into currency field
-- Migration to simplify currency system to single currency field

-- Update currency field from preferred_currency or payout_currency (prefer payout_currency if both exist)
UPDATE "creator" 
SET "currency" = COALESCE("payout_currency", "preferred_currency", "USD")
WHERE "currency" IS NULL OR "currency" = 'USD';

-- For existing records, if currency is still USD but preferred_currency or payout_currency is set, use that
UPDATE "creator"
SET "currency" = COALESCE("payout_currency", "preferred_currency", "USD")
WHERE ("currency" IS NULL OR "currency" = 'USD')
  AND ("payout_currency" IS NOT NULL OR "preferred_currency" IS NOT NULL);

-- Note: We keep preferred_currency and payout_currency columns for now for backward compatibility
-- They can be dropped in a future migration after verifying all systems use the currency field

