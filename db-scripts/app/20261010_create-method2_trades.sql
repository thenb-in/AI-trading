-- Method2Trade -> method2_trades (timestamps:false)
CREATE TABLE IF NOT EXISTS method2_trades (
  id             SERIAL PRIMARY KEY,
  entry_time     TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time      TIMESTAMP WITH TIME ZONE,
  status         VARCHAR(12) NOT NULL DEFAULT 'active',
  resolve_reason VARCHAR(200),
  direction      VARCHAR(8) NOT NULL,
  tradingsymbol  VARCHAR(32) NOT NULL,
  option_type    VARCHAR(4) NOT NULL,
  strike         INTEGER,
  expiry         VARCHAR(16),
  confidence     INTEGER,
  spot_entry     NUMERIC(10, 2),
  entry_premium  NUMERIC(10, 2) NOT NULL,
  sl_premium     NUMERIC(10, 2) NOT NULL,
  trail_sl       NUMERIC(10, 2) NOT NULL,
  t1_premium     NUMERIC(10, 2) NOT NULL,
  t2_premium     NUMERIC(10, 2) NOT NULL,
  t3_premium     NUMERIC(10, 2) NOT NULL,
  ul_levels      JSONB,
  targets_hit    INTEGER NOT NULL DEFAULT 0,
  last_premium   NUMERIC(10, 2),
  max_premium    NUMERIC(10, 2),
  min_premium    NUMERIC(10, 2),
  exit_premium   NUMERIC(10, 2),
  entry_reasons  JSONB
);
CREATE INDEX IF NOT EXISTS method2_trades_status     ON method2_trades (status);
CREATE INDEX IF NOT EXISTS method2_trades_entry_time ON method2_trades (entry_time);
