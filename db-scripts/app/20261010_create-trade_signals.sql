-- TradeSignal -> trade_signals (timestamps:false, underscored:false)
CREATE TABLE IF NOT EXISTS trade_signals (
  id            SERIAL PRIMARY KEY,
  "timestamp"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  direction     VARCHAR(8) NOT NULL,
  action        VARCHAR(64),
  tradingsymbol VARCHAR(32),
  option_type   VARCHAR(4),
  strike        INTEGER,
  expiry        DATE,
  spot_price    NUMERIC(10, 2),
  premium_entry NUMERIC(10, 2),
  premium_sl    NUMERIC(10, 2),
  premium_t1    NUMERIC(10, 2),
  premium_t2    NUMERIC(10, 2),
  premium_t3    NUMERIC(10, 2),
  ul_sl         INTEGER,
  ul_t1         INTEGER,
  ul_t2         INTEGER,
  confidence    INTEGER,
  ema20         NUMERIC(10, 2),
  ema50         NUMERIC(10, 2),
  rsi           NUMERIC(6, 2),
  pcr           NUMERIC(6, 3),
  reasons       JSONB
);
CREATE INDEX IF NOT EXISTS trade_signals_timestamp     ON trade_signals ("timestamp");
CREATE INDEX IF NOT EXISTS trade_signals_direction     ON trade_signals (direction);
CREATE INDEX IF NOT EXISTS trade_signals_tradingsymbol ON trade_signals (tradingsymbol);
