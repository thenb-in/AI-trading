CREATE TABLE IF NOT EXISTS nbnext_notification_rule (
  id                SERIAL PRIMARY KEY,
  company_id        UUID NOT NULL REFERENCES nbnext_company (id) ON UPDATE CASCADE ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  recipients        JSONB NOT NULL DEFAULT '{}'::jsonb,
  channels          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by        UUID NULL REFERENCES nbnext_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN nbnext_notification_rule.name IS
  'Chosen from a fixed list, never typed. Resolves to exactly one audited (source, action) pair -- see notifications/rules/ruleNameIndex.js';
COMMENT ON COLUMN nbnext_notification_rule.recipients IS
  '{ role: [role ids], users: [user ids], addresses: [emails/numbers] } -- unioned, deduplicated at send';
COMMENT ON COLUMN nbnext_notification_rule.channels IS
  'Per-channel { enabled, body, ... }. Each channel carries its own body because the providers differ';

CREATE UNIQUE INDEX IF NOT EXISTS nbnext_notification_rule_company_name
  ON nbnext_notification_rule (company_id, name);


