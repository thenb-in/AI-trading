-- IndexCandle -> index_candles (timestamps:false)
CREATE TABLE IF NOT EXISTS index_candles (
  id     SERIAL PRIMARY KEY,
  symbol VARCHAR(16) NOT NULL,
  "time" BIGINT NOT NULL,
  "open" NUMERIC(12, 2) NOT NULL,
  high   NUMERIC(12, 2) NOT NULL,
  low    NUMERIC(12, 2) NOT NULL,
  "close" NUMERIC(12, 2) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS index_candles_symbol_time
  ON index_candles (symbol, "time");
