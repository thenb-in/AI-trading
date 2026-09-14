-- =============================================================================
-- nbnext_layouts.column_config -> filterModel entries as { operator, value }
--
-- A saved layout used to keep each column filter as the typed text alone
-- ({ "name": "steel" }). Filters now carry their operator
-- ({ "name": { "operator": "contains", "value": "steel" } }), and the grid no
-- longer reads the bare-text shape. Bare text was always a "contains" match,
-- so that is the operator it gets here.
--
-- Safe to re-run: only string entries are rewritten.
-- =============================================================================

BEGIN;

UPDATE nbnext_layouts AS layout
SET column_config = jsonb_set(
  layout.column_config,
  '{filterModel}',
  (
    SELECT jsonb_object_agg(
      entry.key,
      CASE
        WHEN jsonb_typeof(entry.value) = 'string'
          THEN jsonb_build_object('operator', 'contains', 'value', entry.value)
        ELSE entry.value
      END
    )
    FROM jsonb_each(layout.column_config->'filterModel') AS entry
  )
)
WHERE jsonb_typeof(layout.column_config->'filterModel') = 'object'
  AND EXISTS (
    SELECT 1
    FROM jsonb_each(layout.column_config->'filterModel') AS entry
    WHERE jsonb_typeof(entry.value) = 'string'
  );

COMMIT;

-- Verify (should be 0):
-- SELECT count(*) FROM nbnext_layouts l, jsonb_each(l.column_config->'filterModel') f
-- WHERE jsonb_typeof(f.value) = 'string';
