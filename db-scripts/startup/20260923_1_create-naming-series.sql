-- How a master numbers the rows it creates without a code.
-- Matches startup/server/src/models/NamingSeries.js and models/mixins/namingSeries.js.

CREATE TABLE IF NOT EXISTS nbnext_naming_series (
  id         SERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES nbnext_company(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  master     VARCHAR(100) NOT NULL,
  template   VARCHAR(100) NOT NULL,
  -- The last number handed out; the next code is formatted from count + 1.
  count      INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NULL REFERENCES nbnext_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exactly one series per master numbers that master's new rows.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_naming_series_one_default
  ON nbnext_naming_series (company_id, master) WHERE is_default;

-- The screen lists a company's series by master.
CREATE INDEX IF NOT EXISTS naming_series_company_master_idx
  ON nbnext_naming_series (company_id, master);
