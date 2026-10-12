-- Saved ("liked") listings per user.
CREATE TABLE IF NOT EXISTS likes (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS likes_product_idx ON likes (product_id);

-- Per-participant inbox archiving.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS buyer_archived boolean NOT NULL DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS seller_archived boolean NOT NULL DEFAULT false;

-- Sponsored (house-promoted) listings shown in ad slots.
ALTER TABLE products ADD COLUMN IF NOT EXISTS promoted_until timestamptz;
