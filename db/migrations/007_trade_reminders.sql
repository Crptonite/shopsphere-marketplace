-- Trade reminders (DCA and general investing reminders). The cron job sends them through notify().
CREATE TABLE IF NOT EXISTS trade_reminders (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker text,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 500),
  frequency text NOT NULL CHECK (frequency IN ('once','weekly','monthly')),
  next_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trade_reminders_due_idx ON trade_reminders (active, next_at);
CREATE INDEX IF NOT EXISTS trade_reminders_user_idx ON trade_reminders (user_id);
