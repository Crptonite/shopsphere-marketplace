-- Trade data: stock catalogue, saves (favourites and watchlist), positions and saved screener filters.
CREATE TABLE IF NOT EXISTS trade_stocks (
  ticker text PRIMARY KEY,
  name text NOT NULL,
  sector text NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS trade_saves (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker text NOT NULL REFERENCES trade_stocks(ticker) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('favourite','watchlist')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticker, kind)
);
CREATE TABLE IF NOT EXISTS trade_positions (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker text NOT NULL REFERENCES trade_stocks(ticker),
  shares numeric(14,2) NOT NULL CHECK (shares > 0),
  avg_cost numeric(12,4) NOT NULL CHECK (avg_cost >= 0),
  opened_at date NOT NULL DEFAULT current_date
);
CREATE INDEX IF NOT EXISTS trade_positions_user_idx ON trade_positions (user_id);
CREATE TABLE IF NOT EXISTS trade_filters (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  criteria jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trade_filters_user_idx ON trade_filters (user_id);
