export const SCHEMA_VERSION = 1

export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS platforms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS connectors (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL,
  driver TEXT NOT NULL,
  risk_label TEXT NOT NULL,
  status TEXT NOT NULL,
  last_sync_at TEXT,
  config TEXT
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  connector_id TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  gross_amount REAL NOT NULL,
  currency TEXT NOT NULL,
  kind TEXT NOT NULL,
  external_id TEXT,
  payer_ref TEXT,
  raw TEXT
);
CREATE INDEX IF NOT EXISTS idx_tx_occurred ON transactions(occurred_at);
CREATE INDEX IF NOT EXISTS idx_tx_platform ON transactions(platform_id);
CREATE TABLE IF NOT EXISTS rate_rules (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  rate REAL NOT NULL,
  fixed_fee REAL NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  note TEXT,
  is_estimate INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS egress_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  connector_id TEXT,
  host TEXT NOT NULL,
  purpose TEXT NOT NULL
);
`
