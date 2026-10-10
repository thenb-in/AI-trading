-- ChainOiBaseline -> chain_oi_baselines (timestamps:false)
CREATE TABLE IF NOT EXISTS chain_oi_baselines (
  id            SERIAL PRIMARY KEY,
  "date"        DATE NOT NULL,
  tradingsymbol VARCHAR(32) NOT NULL,
  oi            BIGINT NOT NULL,
  captured_at   TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS chain_oi_baselines_date_tradingsymbol
  ON chain_oi_baselines ("date", tradingsymbol);
