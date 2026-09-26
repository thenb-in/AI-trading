CREATE TABLE IF NOT EXISTS nbnext_naming_series (
  id          SERIAL        PRIMARY KEY,
  company_id  UUID          NOT NULL REFERENCES nbnext_company (id) ON DELETE CASCADE,
  master      VARCHAR(100)  NOT NULL,
  template    VARCHAR(100)  NOT NULL,
  count       INTEGER       NOT NULL DEFAULT 0,
  is_default  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_by  UUID          REFERENCES nbnext_users (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN nbnext_naming_series.count IS
  'The last number handed out; the next code is formatted from count + 1.';

-- At most one default series per master per company.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_naming_series_one_default
  ON nbnext_naming_series (company_id, master)
  WHERE is_default = TRUE;
