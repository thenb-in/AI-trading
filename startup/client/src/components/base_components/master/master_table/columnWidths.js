import { formatDateForDisplay, formatDateTimeForDisplay } from '@utils/dateTimeUtils';

// Size each column to fit its content instead of leaving it to the grid's
// header-length-only default, so a column only takes the width it needs.
// The grid uses table-layout:fixed, so anything past the width truncates
// with an ellipsis; columns stay user-resizable and stretch to fill the
// table when their total is narrower than the container.
const CHAR_PX = 7;          // body cell text (~13px, regular)
const HEADER_CHAR_PX = 8.5; // header text (12px bold, uppercase + tracking)
const CELL_PAD = 32;        // 16px horizontal padding each side
const HEADER_EXTRA = 28;    // sort icon + gap + pin button breathing room
const MIN_COL_W = 80;
const MAX_COL_W = 420;      // keep one long column from dominating the row
const SAMPLE_ROWS = 500;

const clampWidth = (width) => Math.round(Math.max(MIN_COL_W, Math.min(MAX_COL_W, width)));

const cellText = (column, raw, selectLookup) => {
  if (raw == null || raw === '') return '-';
  if (column.type === 'date') return formatDateForDisplay(raw) || '-';
  if (column.type === 'datetime') return formatDateTimeForDisplay(raw) || '-';
  if (column.type === 'boolean') return raw === true ? 'Yes' : 'No';
  if (selectLookup) return String(selectLookup.get(raw) ?? raw);
  return String(raw);
};

const measureColumnWidth = (column, rows) => {
  const fieldKey = column.key || column.id;
  const headerName = String(column.label || column.display_name || fieldKey || '');
  const headerW = headerName.length * HEADER_CHAR_PX + CELL_PAD + HEADER_EXTRA;

  // File cells render just an icon; custom `render` cells return arbitrary
  // (often non-text) nodes we can't measure — size those to the header.
  if (column.type === 'file' || typeof column.render === 'function') return clampWidth(headerW);

  const selectLookup = column.type === 'select' && Array.isArray(column.options)
    ? new Map(column.options.map((o) => [o.value, o.label]))
    : null;

  const contentChars = (rows || []).slice(0, SAMPLE_ROWS).reduce(
    (max, row) => Math.max(max, cellText(column, row?.[fieldKey], selectLookup).length),
    0
  );
  return clampWidth(Math.max(headerW, contentChars * CHAR_PX + CELL_PAD));
};

// Self-drawn actions (`additionalButton`) can be arbitrary; give them a modest default.
const CUSTOM_ACTION_W = 96;
const ACTION_GAP = 8;

const actionButtonWidth = (action, row) => {
  if (action.additionalButton) return CUSTOM_ACTION_W;
  const label = String((typeof action.label === 'function' ? row && action.label(row) : action.label) || 'Action');
  const iconWidth = action.icon ? 20 : 0; // 16px icon + 4px mr-1
  return iconWidth + label.length * 8 + 24; // ~8px/char at text-xs + px-2 / border
};

const rowActionsWidth = (rowActions, row) => rowActions.length === 0
  ? 0
  : rowActions.reduce((sum, a) => sum + actionButtonWidth(a, row), 0) + ACTION_GAP * (rowActions.length - 1);

// Many actions are gated by `show`, so a row rarely renders all of them.
// Measure the widest button set that actually appears in the loaded rows
// instead of reserving room for every possible action. With no rows yet,
// fall back to all actions.
const measureActionsWidth = (actions, rows, isActionVisible) => {
  const measured = rows?.length
    ? rows.reduce((max, row) => Math.max(max, rowActionsWidth(actions.filter((a) => isActionVisible(a, row)), row)), 0)
    : rowActionsWidth(actions, null);
  return Math.max(90, Math.ceil(measured + 40)); // + cell padding + buffer
};

export { measureColumnWidth, measureActionsWidth };
