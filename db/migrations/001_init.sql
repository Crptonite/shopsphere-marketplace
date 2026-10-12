-- PostgreSQL 15+ with pgvector installed
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  title text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  category text NOT NULL,
  price_sgd numeric(12,2) NOT NULL CHECK (price_sgd > 0),
  condition text NOT NULL CHECK (condition IN ('New','Like new','Good')),
  location text NOT NULL DEFAULT 'Singapore',
  image_url text NOT NULL DEFAULT '',
  seller_id text,
  seller_display_name text NOT NULL DEFAULT 'Marketplace seller',
  description text NOT NULL DEFAULT '',
  is_sample boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','sold','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_document tsvector NOT NULL DEFAULT ''::tsvector,
  embedding vector(1536)
);

CREATE INDEX IF NOT EXISTS products_search_document_idx ON products USING GIN (search_document);
CREATE INDEX IF NOT EXISTS products_title_trgm_idx ON products USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_model_trgm_idx ON products USING GIN (model gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_brand_idx ON products (brand);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_price_idx ON products (price_sgd);
CREATE INDEX IF NOT EXISTS products_created_at_idx ON products (created_at DESC);
CREATE INDEX IF NOT EXISTS products_active_idx ON products (status) WHERE status = 'active';
-- Add an HNSW index once real embeddings are populated:
-- CREATE INDEX products_embedding_hnsw_idx ON products USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION products_search_document_update() RETURNS trigger AS $$
BEGIN
  NEW.search_document := to_tsvector('english', coalesce(NEW.title,'') || ' ' || coalesce(NEW.brand,'') || ' ' || coalesce(NEW.model,'') || ' ' || coalesce(NEW.category,'') || ' ' || coalesce(NEW.description,''));
  NEW.updated_at := now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_document_trigger ON products;
CREATE TRIGGER products_search_document_trigger BEFORE INSERT OR UPDATE OF title, brand, model, category, description ON products
FOR EACH ROW EXECUTE FUNCTION products_search_document_update();

CREATE TABLE IF NOT EXISTS categories (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  parent_id bigint REFERENCES categories(id),
  image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS model_families (
  id bigserial PRIMARY KEY,
  brand text NOT NULL,
  family_name text NOT NULL,
  model_name text NOT NULL,
  generation text,
  category_slug text NOT NULL DEFAULT 'phones',
  official_url text,
  is_current boolean NOT NULL DEFAULT false,
  UNIQUE (brand, model_name)
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer','seller','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carts (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id bigserial PRIMARY KEY,
  cart_id text NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE(cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  buyer_id text NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','shipped','completed','cancelled','refunded')),
  currency char(3) NOT NULL DEFAULT 'SGD' CHECK (currency = 'SGD'),
  subtotal_sgd numeric(12,2) NOT NULL CHECK (subtotal_sgd >= 0),
  shipping_sgd numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipping_sgd >= 0),
  total_sgd numeric(12,2) NOT NULL CHECK (total_sgd >= 0),
  payment_provider text,
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id bigserial PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id),
  seller_id text,
  title_snapshot text NOT NULL,
  unit_price_sgd numeric(12,2) NOT NULL CHECK (unit_price_sgd >= 0),
  quantity integer NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY,
  buyer_id text NOT NULL REFERENCES users(id),
  seller_id text NOT NULL REFERENCES users(id),
  product_id text REFERENCES products(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id bigserial PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES users(id),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
