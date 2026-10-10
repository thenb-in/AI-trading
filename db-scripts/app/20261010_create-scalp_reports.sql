-- ScalpReport -> scalp_reports (timestamps:false)
CREATE TABLE IF NOT EXISTS scalp_reports (
  id         SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  kind       VARCHAR(24) NOT NULL,
  label      VARCHAR(80) NOT NULL,
  params     JSONB NOT NULL,
  summary    JSONB NOT NULL,
  by_day     JSONB,
  trades     JSONB
);
CREATE INDEX IF NOT EXISTS scalp_reports_created_at ON scalp_reports (created_at);
CREATE INDEX IF NOT EXISTS scalp_reports_kind       ON scalp_reports (kind);
