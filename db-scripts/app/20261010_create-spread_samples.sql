-- SpreadSample -> spread_samples (timestamps:false)
CREATE TABLE IF NOT EXISTS spread_samples (
  id            SERIAL PRIMARY KEY,
  minute        BIGINT NOT NULL,
  tradingsymbol VARCHAR(32) NOT NULL,
  symbol        VARCHAR(16) NOT NULL,
  strike        INTEGER,
  "type"        VARCHAR(2),
  ltp           NUMERIC(12, 2),
  avg_spread    NUMERIC(10, 2) NOT NULL,
  min_spread    NUMERIC(10, 2) NOT NULL,
  max_spread    NUMERIC(10, 2) NOT NULL,
  ticks         INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS spread_samples_minute_tradingsymbol
  ON spread_samples (minute, tradingsymbol);
CREATE INDEX IF NOT EXISTS spread_samples_symbol_minute
  ON spread_samples (symbol, minute);
