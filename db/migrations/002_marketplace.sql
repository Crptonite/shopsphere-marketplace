-- Phase 1–3: auth-linked users, listing types, payments, ledger, chats, notifications, finance.

-- Users: every account can buy and sell; admin is a flag.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Products: listing types, stock, property attributes, provenance.
ALTER TABLE products ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'goods'
  CHECK (listing_type IN ('goods','trade_in','property_sale','property_rent'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_qty integer NOT NULL DEFAULT 1 CHECK (stock_qty >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS property jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user' CHECK (source IN ('user','external'));
ALTER TABLE products ALTER COLUMN condition DROP NOT NULL;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_condition_check;
ALTER TABLE products ADD CONSTRAINT products_condition_check CHECK (condition IS NULL OR condition IN ('New','Like new','Good','Fair'));
CREATE INDEX IF NOT EXISTS products_seller_idx ON products (seller_id);
CREATE INDEX IF NOT EXISTS products_listing_type_idx ON products (listing_type);
CREATE INDEX IF NOT EXISTS products_location_idx ON products (lower(location));
CREATE INDEX IF NOT EXISTS products_embedding_hnsw_idx ON products USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS product_images (
  id bigserial PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images (product_id, sort_order);

-- Orders: track the Stripe session and refunds.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_sgd numeric(12,2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS orders_buyer_idx ON orders (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_seller_idx ON order_items (seller_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS carts_user_unique_idx ON carts (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS carts_session_unique_idx ON carts (session_id) WHERE user_id IS NULL;

CREATE TABLE IF NOT EXISTS payments (
  id bigserial PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id),
  stripe_session_id text NOT NULL UNIQUE,
  payment_intent text,
  amount_sgd numeric(12,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('succeeded','refunded','partially_refunded','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_intent_idx ON payments (payment_intent);

-- Idempotency for verified webhooks.
CREATE TABLE IF NOT EXISTS webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Cash wallet: one balance row per user; ledger rows record before/after.
CREATE TABLE IF NOT EXISTS wallets (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_sgd numeric(14,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('purchase','sale','refund','sale_reversal','deposit','withdrawal','adjustment')),
  amount_sgd numeric(14,2) NOT NULL,
  balance_before numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,
  description text NOT NULL DEFAULT '',
  category text,
  ref_type text,
  ref_id text,
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_user_idx ON ledger_entries (user_id, created_at DESC);
-- One ledger row per (user, kind, reference) so replayed webhooks cannot double-post.
CREATE UNIQUE INDEX IF NOT EXISTS ledger_ref_unique_idx ON ledger_entries (user_id, kind, ref_type, ref_id) WHERE ref_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS seller_accounts (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seller payouts (Stripe Connect transfers). Reduce the seller's available earnings, not their cash.
CREATE TABLE IF NOT EXISTS payouts (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_sgd numeric(14,2) NOT NULL CHECK (amount_sgd > 0),
  stripe_transfer_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Chats: structured messages (offers, viewings) and read tracking.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','offer','viewing','system'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS meta jsonb;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS buyer_read_at timestamptz;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS seller_read_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_idx ON conversations (buyer_id, seller_id, coalesce(product_id, ''));
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, id);

CREATE TABLE IF NOT EXISTS offers (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id),
  buyer_id text NOT NULL REFERENCES users(id),
  conversation_id text REFERENCES conversations(id),
  trade_item text,
  cash_diff_sgd numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS viewings (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id),
  requester_id text NOT NULL REFERENCES users(id),
  conversation_id text REFERENCES conversations(id),
  slot timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  in_app_enabled boolean NOT NULL DEFAULT true
);

-- External discovery (SerpApi). Never treated as stock.
CREATE TABLE IF NOT EXISTS external_products (
  id bigserial PRIMARY KEY,
  query text NOT NULL,
  title text NOT NULL,
  price_text text,
  price_sgd numeric(12,2),
  thumbnail text,
  merchant text,
  source_url text NOT NULL UNIQUE,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  verified boolean NOT NULL DEFAULT false CHECK (verified = false)
);

-- Finance: stock holdings and user-entered property assets.
CREATE TABLE IF NOT EXISTS holdings (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  avg_cost numeric(14,4) NOT NULL CHECK (avg_cost >= 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS property_assets (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  purchase_price_sgd numeric(14,2) NOT NULL CHECK (purchase_price_sgd >= 0),
  est_value_sgd numeric(14,2) NOT NULL CHECK (est_value_sgd >= 0),
  outstanding_loan_sgd numeric(14,2) NOT NULL DEFAULT 0 CHECK (outstanding_loan_sgd >= 0),
  valuation_date date NOT NULL DEFAULT current_date,
  value_source text NOT NULL DEFAULT 'user-entered',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Daily net-worth snapshots for the chart (written when /finance is viewed).
CREATE TABLE IF NOT EXISTS networth_snapshots (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  cash_sgd numeric(14,2) NOT NULL,
  stocks_sgd numeric(14,2) NOT NULL,
  property_sgd numeric(14,2) NOT NULL,
  PRIMARY KEY (user_id, snapshot_date)
);
