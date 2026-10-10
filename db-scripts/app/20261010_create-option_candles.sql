-- OptionCandle -> option_candles (timestamps:false)
CREATE TABLE IF NOT EXISTS option_candles (
  id            SERIAL PRIMARY KEY,
  tradingsymbol VARCHAR(32) NOT NULL,
  expiry        DATE NOT NULL,
  strike        INTEGER NOT NULL,
  "type"        VARCHAR(2) NOT NULL,
  "time"        BIGINT NOT NULL,
  "open"        NUMERIC(12, 2) NOT NULL,
  high          NUMERIC(12, 2) NOT NULL,
  low           NUMERIC(12, 2) NOT NULL,
  "close"       NUMERIC(12, 2) NOT NULL,
  volume        BIGINT,
  oi            BIGINT
);
CREATE UNIQUE INDEX IF NOT EXISTS option_candles_tradingsymbol_time
  ON option_candles (tradingsymbol, "time");
CREATE INDEX IF NOT EXISTS option_candles_expiry_strike_type
  ON option_candles (expiry, strike, "type");
CREATE INDEX IF NOT EXISTS option_candles_time ON option_candles ("time");
