-- OptionSnapshot -> option_snapshots (timestamps:false, underscored:false)
-- type is a Sequelize ENUM('CE','PE'); create the matching enum type first.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_option_snapshots_type') THEN
    CREATE TYPE enum_option_snapshots_type AS ENUM ('CE', 'PE');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS option_snapshots (
  id        SERIAL PRIMARY KEY,
  expiry    DATE NOT NULL,
  strike    INTEGER NOT NULL,
  "type"    enum_option_snapshots_type NOT NULL,
  oi        BIGINT NOT NULL,
  ltp       NUMERIC(12, 2) NOT NULL,
  "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS option_snapshots_expiry    ON option_snapshots (expiry);
CREATE INDEX IF NOT EXISTS option_snapshots_strike    ON option_snapshots (strike);
CREATE INDEX IF NOT EXISTS option_snapshots_type      ON option_snapshots ("type");
CREATE INDEX IF NOT EXISTS option_snapshots_timestamp ON option_snapshots ("timestamp");
CREATE INDEX IF NOT EXISTS option_snapshots_expiry_strike_type_timestamp
  ON option_snapshots (expiry, strike, "type", "timestamp");
