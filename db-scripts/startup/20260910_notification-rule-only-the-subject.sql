ALTER TABLE nbnext_notification_rule
  ADD COLUMN IF NOT EXISTS only_the_subject BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN nbnext_notification_rule.only_the_subject IS
  'TRUE: each message goes to the person it is about, resolved from the record. FALSE: to everyone in recipients';

-- Rules that used the old sentinel keep doing what they did.
UPDATE nbnext_notification_rule
SET only_the_subject = TRUE,
    recipients = jsonb_set(
      recipients,
      '{employee}',
      COALESCE(
        (SELECT jsonb_agg(value) FROM jsonb_array_elements(recipients->'employee') WHERE value <> '"record"'::jsonb),
        '[]'::jsonb
      )
    ),
    updated_at = NOW()
WHERE recipients->'employee' @> '["record"]'::jsonb;
