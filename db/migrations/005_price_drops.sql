-- Keeps the price before the latest drop so listings can show "now S$X, was S$Y (Z% off)".
ALTER TABLE products ADD COLUMN IF NOT EXISTS previous_price_sgd numeric(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_changed_at timestamptz;
