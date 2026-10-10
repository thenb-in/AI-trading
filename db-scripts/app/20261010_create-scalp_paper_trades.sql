-- ScalpPaperTrade -> scalp_paper_trades (timestamps:false, underscored:false)
CREATE TABLE IF NOT EXISTS scalp_paper_trades (
  id             SERIAL PRIMARY KEY,
  entry_time     TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time      TIMESTAMP WITH TIME ZONE,
  status         VARCHAR(10) NOT NULL DEFAULT 'open',
  direction      VARCHAR(8) NOT NULL,
  option_type    VARCHAR(4) NOT NULL,
  tradingsymbol  VARCHAR(32) NOT NULL,
  strike         INTEGER,
  spot_entry     NUMERIC(10, 2),
  spot_exit      NUMERIC(10, 2),
  premium_entry  NUMERIC(10, 2) NOT NULL,
  premium_target NUMERIC(10, 2) NOT NULL,
  premium_stop   NUMERIC(10, 2) NOT NULL,
  premium_exit   NUMERIC(10, 2),
  premium_best   NUMERIC(10, 2),
  premium_worst  NUMERIC(10, 2),
  polls          INTEGER NOT NULL DEFAULT 0,
  qty            INTEGER NOT NULL,
  gross_rs       NUMERIC(12, 2),
  costs_rs       NUMERIC(12, 2),
  net_rs         NUMERIC(12, 2),
  held_seconds   INTEGER,
  regime         JSONB,
  reason         VARCHAR(160)
);
CREATE INDEX IF NOT EXISTS scalp_paper_trades_entry_time    ON scalp_paper_trades (entry_time);
CREATE INDEX IF NOT EXISTS scalp_paper_trades_status        ON scalp_paper_trades (status);
CREATE INDEX IF NOT EXISTS scalp_paper_trades_tradingsymbol ON scalp_paper_trades (tradingsymbol);
