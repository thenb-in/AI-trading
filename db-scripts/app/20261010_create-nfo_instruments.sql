-- NfoInstrument -> nfo_instruments (timestamps:false, underscored:false)
CREATE TABLE IF NOT EXISTS nfo_instruments (
  id               SERIAL PRIMARY KEY,
  snapshot_date    DATE NOT NULL,
  instrument_token BIGINT NOT NULL,
  exchange_token   BIGINT,
  tradingsymbol    VARCHAR(64) NOT NULL,
  name             VARCHAR(32),
  expiry           DATE,
  strike           NUMERIC(12, 2),
  lot_size         INTEGER,
  instrument_type  VARCHAR(8),
  segment          VARCHAR(16),
  exchange         VARCHAR(8)
);
CREATE INDEX IF NOT EXISTS nfo_instruments_snapshot_date ON nfo_instruments (snapshot_date);
CREATE INDEX IF NOT EXISTS nfo_instruments_tradingsymbol ON nfo_instruments (tradingsymbol);
CREATE INDEX IF NOT EXISTS nfo_instruments_name_expiry_strike_instrument_type
  ON nfo_instruments (name, expiry, strike, instrument_type);
CREATE UNIQUE INDEX IF NOT EXISTS nfo_instruments_instrument_token_snapshot_date
  ON nfo_instruments (instrument_token, snapshot_date);
