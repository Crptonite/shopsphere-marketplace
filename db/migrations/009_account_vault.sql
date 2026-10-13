-- Accounts a browser has signed in to recently. Tokens are sealed (AES-256-GCM) before storage.
-- A parked account can be switched back to only within 2 hours of its last use.
CREATE TABLE IF NOT EXISTS account_vault (
  browser_id text NOT NULL,
  user_id text NOT NULL,
  email text NOT NULL,
  sealed text NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (browser_id, user_id)
);
CREATE INDEX IF NOT EXISTS account_vault_last_used_idx ON account_vault (last_used_at);
