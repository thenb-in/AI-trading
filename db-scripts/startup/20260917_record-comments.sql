-- record_comment: what people say about one record of any master.
--
-- Keyed the way nbnext_drive keys its rows — object_name is the master's name
-- ("Notification Rule"), object_id the record — so a record's files and its
-- comments are addressed alike, and no master needs a comments table of its own.

CREATE TABLE IF NOT EXISTS record_comment (
  id           SERIAL PRIMARY KEY,
  body         TEXT NOT NULL,
  object_name  VARCHAR(255),
  object_id    VARCHAR(255),
  created_by   UUID REFERENCES nbnext_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  company_id   UUID NOT NULL REFERENCES nbnext_company(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- How the panel reads them: this record's comments, oldest first.
CREATE INDEX IF NOT EXISTS record_comment_object_idx ON record_comment (object_name, object_id);
CREATE INDEX IF NOT EXISTS record_comment_company_idx ON record_comment (company_id);
CREATE INDEX IF NOT EXISTS record_comment_created_by_idx ON record_comment (created_by);
