import React from "react";
import { convertCellToText } from "../../base_report/ReportUtils.js";
import { sanitizeHTML } from "../../base_report/reportFormatter.js";
import { toValidNumber } from "@utils/toValidNumber.js";
import { parseDateValue } from "@utils/dateTimeUtils.js";
import { DEFAULT_COLUMN_WIDTH } from "./constants.js";
import { baseWidthFor } from "./layoutMerge.js";

/**
 * Format a cell value for plain-text display (e.g. in Insights panel).
 * Uses the same logic as the data grid (convertCellToText); for HTML columns strips tags.
 * @param {Object} columnDef - Column definition with at least .type (e.g. 'date', 'datetime', 'duration', 'html', 'number')
 * @param {*} value - Raw cell value
 * @returns {string} Formatted string safe for display in insights
 */
const getColumnFormatType = (columnDef) => {
  const formatType = typeof columnDef?.nature === "string" && columnDef.nature.trim()
    ? columnDef.nature.trim()
    : columnDef?.type;
  return typeof formatType === "string" ? formatType : null;
};

const getColumnForFormatting = (columnDef) => {
  const effectiveType = getColumnFormatType(columnDef);
  if (!columnDef) {
    return { type: effectiveType || "string" };
  }
  if (!effectiveType || effectiveType === columnDef.type) {
    return columnDef;
  }
  return { ...columnDef, type: effectiveType };
};

const formatCellValueForInsight = (columnDef, value) => {
  if (!columnDef) return "—";
  const col = getColumnForFormatting(columnDef);
  let text = convertCellToText(col, value);
  if (col.type === "html" && typeof text === "string") {
    text = sanitizeHTML(text);
  }
  return text ?? "—";
};

/**
 * Normalize columns with default values
 */
const normalizeColumns = (columns) => {
  return (columns || []).map((col) => ({
    ...col,
    // Deliberately left undefined when the server didn't send a width: an
    // explicit number here counts as "the column asserted its own width" and
    // would suppress the header-length sizing in `baseWidthFor`, making every
    // column the same fixed width.
    width: Number.isFinite(col.width) ? col.width : undefined,
    sortable: col.sortable !== false,
    frozen: col.frozen === true,
    // Support both 'hide' and 'hidden' flags (backend reports use 'hidden')
    hide: Boolean(col.hide || col.hidden),
    field: col.field,
    headerName: col.headerName || col.field,
  }));
};

const HTML_CELL_JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' };

/**
 * Where an HTML cell's content sits. A column can say via `align`; otherwise anything that
 * carries its own line breaks is a list or prose and reads left, while a single-line value is
 * a badge (a status chip, a COF figure) and stays centred as it always has.
 */
const htmlCellAlign = (col, html) => {
  if (col.align) {
    return col.align;
  }
  return /<br\s*\/?>/i.test(html) ? 'left' : 'center';
};

/**
 * Render cell content with formatting
 */
const renderCellContent = (col, row) => {
  if (typeof col.renderCell === "function") {
    return col.renderCell({ row, field: col.field });
  }
  const formatCol = getColumnForFormatting(col);
  let rawValue;
  if (typeof col.valueGetter === "function") {
    rawValue = col.valueGetter({ row, field: col.field });
  } else {
    rawValue = row?.[col.field];
  }
  
  // Handle HTML type columns - render with dangerouslySetInnerHTML
  if (formatCol.type === "html" && typeof rawValue === "string" && rawValue.trim()) {
    const align = htmlCellAlign(col, rawValue);
    return React.createElement("div", {
      dangerouslySetInnerHTML: { __html: rawValue },
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: HTML_CELL_JUSTIFY[align] || HTML_CELL_JUSTIFY.center,
        textAlign: align,
        width: '100%'
      }
    });
  }
  
  const formatted = convertCellToText(formatCol, rawValue);
  return formatted == null ? "" : String(formatted);
};

/**
 * Get unique key for a row
 */
const getKeyForRow = (row, idx, getRowIdFunc) => {
  if (typeof getRowIdFunc === "function") return getRowIdFunc(row, idx);
  if (row && row.id != null) return row.id;
  return idx;
};

/**
 * Index rows with original positions
 */
const indexRows = (rows) => {
  return (rows || []).map((r, idx) => ({
    _row: r,
    _origIndex: idx,
  }));
};

/**
 * Filter rows based on filter model
 */
const filterRows = (indexedRows, filterModel, columns) => {
  if (!filterModel || Object.keys(filterModel).length === 0) {
    return indexedRows;
  }

  return indexedRows.filter((indexedRow) => {
    return Object.entries(filterModel).every(([field, filterValue]) => {
      if (!filterValue || filterValue === "") {
        return true;
      }

      const col = columns.find((c) => c.field === field);
      if (!col) return true;

      // Get the cell value
      let cellValue;
      if (typeof col.valueGetter === "function") {
        cellValue = col.valueGetter({ row: indexedRow._row, field: col.field });
      } else {
        cellValue = indexedRow._row?.[field];
      }

      // Convert to string for filtering
      const formatCol = getColumnForFormatting(col);
      const cellText = convertCellToText(formatCol, cellValue);
      const cellString = cellText == null ? "" : String(cellText).toLowerCase();
      const filterString = String(filterValue).toLowerCase();

      // Case-insensitive contains match
      return cellString.includes(filterString);
    });
  });
};


const durationToSeconds = (value) => {
  if (value == null || value === "") return NaN;
  if (typeof value === "number") return value;
  if (typeof value === "object") {
    const days = Number(value.days) || 0;
    const hours = Number(value.hours) || 0;
    const minutes = Number(value.minutes) || 0;
    const seconds = Number(value.seconds) || 0;
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return NaN;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    if (/^P/i.test(trimmed)) {
      const timePart = trimmed.split(/T/i)[1] || "";
      const h = timePart.match(/(\d+)H/i);
      const m = timePart.match(/(\d+)M/i);
      const sec = timePart.match(/(\d+)S/i);
      return (h ? Number(h[1]) : 0) * 3600 + (m ? Number(m[1]) : 0) * 60 + (sec ? Number(sec[1]) : 0);
    }
    const parts = trimmed.split(":");
    if (parts.length >= 2 && parts.every((p) => /^\d+$/.test(p))) {
      const hh = Number(parts[0]);
      const mm = Number(parts[1]);
      const ss = parts.length > 2 ? Number(parts[2]) : 0;
      return hh * 3600 + mm * 60 + ss;
    }
  }
  return NaN;
};

/** Strip currency symbols / thousands separators, then parse. NaN if empty. */
const currencyToNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
};


const getSortKind = (formatType) => {
  switch (formatType) {
    case "duration":
      return "duration";
    case "currency":
      return "currency";
    case "number":
    case "numeric":
      return "number";
    case "date":
    case "datetime":
      return "date";
    case "time":
      return "time";
    default:
      return "string";
  }
};


const getNumericComparable = (value, kind) => {
  switch (kind) {
    case "duration":
      return durationToSeconds(value);
    case "currency":
      return currencyToNumber(value);
    case "number": {
      const n = toValidNumber(value);
      return typeof n === "number" && !Number.isNaN(n) ? n : NaN;
    }
    case "date": {
      if (value instanceof Date) return value.getTime();
      const d = parseDateValue(value);
      return d ? d.getTime() : NaN;
    }
    case "time": {
      if (value instanceof Date) return value.getTime();
      const d = parseDateValue(value);
      if (d) return d.getTime();
      return durationToSeconds(value);
    }
    default:
      return NaN;
  }
};


// Built once, deliberately. `String.prototype.localeCompare(x, undefined, {...})`
// constructs a fresh Intl.Collator on every call, and a sort does O(n log n) of
// them — 16k rows is roughly 220k collator constructions, which measured as the
// single largest cost in opening a large report. Reusing one collator is the
// same comparison with the same locale and options, just without rebuilding the
// machinery each time.
const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

const compareStrings = (va, vb) => COLLATOR.compare(String(va), String(vb));

/**
 * Sort rows based on the canonical array sort model `[{ field, sort }, ...]`
 * (priority by index). Returns indexedRows unchanged if no valid sorts.
 */
const sortRows = (indexedRows, sortModel, columns) => {
  const sorts = (sortModel || []).filter((s) => s && s.field && s.sort);
  if (sorts.length === 0) return indexedRows;

  const comparators = sorts
    .map((s) => {
      const col = columns.find((c) => c.field === s.field);
      if (!col) return null;
      const kind = getSortKind(getColumnFormatType(col));
      const dir = s.sort === "asc" ? 1 : -1;
      const getter = (row) => {
        if (typeof col.valueGetter === "function") {
          return col.valueGetter({ row: row._row, field: col.field });
        }
        return row._row?.[col.field];
      };
      return (a, b) => {
        const va = getter(a);
        const vb = getter(b);

        if (va == null && vb == null) return 0;
        if (va == null) return -1 * dir;
        if (vb == null) return 1 * dir;


        if (kind !== "string") {
          const na = getNumericComparable(va, kind);
          const nb = getNumericComparable(vb, kind);
          const okA = !Number.isNaN(na);
          const okB = !Number.isNaN(nb);

          if (okA && okB) {
            if (na < nb) return -1 * dir;
            if (na > nb) return 1 * dir;
            return 0;
          }
          if (!okA && !okB) return compareStrings(va, vb) * dir;
          return (okA ? -1 : 1) * dir;
        }

        // Text columns: still order any stray Date instances chronologically —
        // without this, `String(date)` lex-sorts by weekday name ("Mon"…).
        if (va instanceof Date || vb instanceof Date) {
          const ta = va instanceof Date ? va.getTime() : parseDateValue(va)?.getTime();
          const tb = vb instanceof Date ? vb.getTime() : parseDateValue(vb)?.getTime();
          const okA = typeof ta === "number" && !Number.isNaN(ta);
          const okB = typeof tb === "number" && !Number.isNaN(tb);
          if (okA && okB) return (ta < tb ? -1 : ta > tb ? 1 : 0) * dir;
          if (!okA && !okB) return compareStrings(va, vb) * dir;
          return (okA ? -1 : 1) * dir;
        }

        return compareStrings(va, vb) * dir;
      };
    })
    .filter(Boolean);

  if (comparators.length === 0) return indexedRows;

  const copy = [...indexedRows];
  copy.sort((a, b) => {
    for (let i = 0; i < comparators.length; i++) {
      const r = comparators[i](a, b);
      if (r !== 0) return r;
    }
    return 0;
  });

  return copy;
};

// Cumulative left offsets for frozen columns. Reads widths from the
// `columnWidths` map produced by `mergeLayout` — every L1 field has an entry
// there, so no fallback math is needed.
const calculateFrozenOffsets = (frozenColumns, columnWidths) => {
  const offsets = {};
  let current = 0;
  frozenColumns.forEach((c) => {
    offsets[c.field] = current;
    current += (columnWidths && columnWidths[c.field]) || DEFAULT_COLUMN_WIDTH;
  });
  return offsets;
};

// Width used by DataGridHeader/DataGridBody for cells when `columnWidths[field]`
// isn't yet populated (transient render before merge has run). It *is*
// `baseWidthFor` — same function, not a copy — so header and body can never
// disagree about a column's width.
const fallbackColumnWidth = baseWidthFor;

/**
 * Calculate totals for numeric columns across all rows
 * @param {Array} rows - Array of row objects
 * @param {Array} columns - Array of column definitions
 * @returns {Object} - Object mapping field names to total values
 */
const calculateTotals = (rows, columns) => {
  const totals = {};
  
  if (!rows || rows.length === 0) {
    return totals;
  }

  // Identify summable columns. Skip non-numeric display types outright.
  // `duration` is allowed through: when the value is numeric seconds (the
  // common convention in this codebase) the sum is meaningful and the footer
  // formats it via convertCellToText. Non-numeric duration payloads (objects,
  // ISO strings) parse to NaN and get filtered out by the value loop below.
  const excludedTypes = ['date', 'datetime', 'time', 'boolean', 'string', 'html', 'status'];

  const numericColumns = columns.filter(col => {
    // Server-set opt-out: numeric-typed identifier columns (e.g. employee_code)
    // that must never be summed in the footer.
    if (col.skip_total === true || col.skip_total === 'true') {
      return false;
    }

    const formatType = getColumnFormatType(col);
    if (formatType && excludedTypes.includes(formatType)) {
      return false;
    }

    const isDurationType = formatType === 'duration';
    const isNumericType = formatType === 'number' || formatType === 'numeric';

    // Also check common numeric field patterns
    const isNumericField = typeof col.field === 'string' && (
      col.field.includes('amount') ||
      col.field.includes('salary') ||
      col.field.includes('total') ||
      col.field.includes('value') ||
      col.field.includes('price') ||
      col.field.includes('cost') ||
      col.field.includes('_sal') ||
      col.field.includes('_amt') ||
      col.field.startsWith('component_')
    );

    return isDurationType || isNumericType || isNumericField;
  });

  // Calculate totals for each numeric column
  numericColumns.forEach(col => {
    let total = 0;
    let count = 0;

    rows.forEach(row => {
      let value;
      if (typeof col.valueGetter === "function") {
        value = col.valueGetter({ row, field: col.field });
      } else {
        value = row?.[col.field];
      }

      // Convert to number if possible
      if (value != null && value !== '') {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        if (!isNaN(numValue)) {
          total += numValue;
          count++;
        }
      }
    });

    // Only set total if we found at least one valid value
    if (count > 0) {
      totals[col.field] = total;
    }
  });

  return totals;
};

/**
 * Sum the columns flagged `is_summary` on their server-side column config.
 * Returns `{ field: total }` for each flagged column that has at least one
 * numeric value across `rows`. When no column carries the flag, returns `{}`
 * so the caller can fall back to a different strategy.
 *
 * `is_summary` is a server-provided curation hint — it says "these specific
 * columns are the ones worth aggregating", e.g. PF/ESIC statutory totals.
 * The grid only renders what callers (or this helper) build; it has no
 * domain knowledge of which columns are summable on its own.
 */
const calculateIsSummaryTotals = (rows, columns) => {
  const totals = {};
  if (!rows || rows.length === 0 || !columns || columns.length === 0) {
    return totals;
  }

  const flaggedColumns = columns.filter(
    (col) => col.is_summary === true || col.is_summary === 'true'
  );
  if (flaggedColumns.length === 0) {
    return totals;
  }

  flaggedColumns.forEach((col) => {
    const key = col.field || col.key;
    if (!key) return;
    let sum = 0;
    let count = 0;
    rows.forEach((row) => {
      const value =
        typeof col.valueGetter === 'function'
          ? col.valueGetter({ row, field: key })
          : row?.[key];
      if (value == null || value === '') return;
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (!isNaN(num)) {
        sum += num;
        count += 1;
      }
    });
    if (count > 0) {
      totals[key] = sum;
    }
  });

  return totals;
};

/**
 * Grouping wraps every row in an envelope ({ _row, ... }) and appends a
 * synthetic group-total line ({ _isGroupTotal: true }); an ungrouped grid hands
 * the rows over as they are. Anything that consumes "the rows the grid is
 * showing" — exports, toolbar actions, totals — has to undo that first, so it
 * lives here once instead of in each consumer.
 */

/** One row, unwrapped from its grouping envelope. Already-plain rows pass through. */
const unwrapGridRow = (wrapped) => wrapped?._row || wrapped;

/** Unwrapped rows, group-total lines still included (what export payloads carry). */
const unwrapGridRows = (rows) => (rows || []).map(unwrapGridRow).filter(Boolean);

/** Only the real data rows: unwrapped, group totals dropped. Safe to re-apply. */
const getGridDataRows = (rows) => unwrapGridRows(rows).filter((row) => !row._isGroupTotal);

export {
  getColumnFormatType,
  getColumnForFormatting,
  normalizeColumns,
  renderCellContent,
  getKeyForRow,
  indexRows,
  sortRows,
  calculateFrozenOffsets,
  fallbackColumnWidth,
  filterRows,
  calculateTotals,
  calculateIsSummaryTotals,
  formatCellValueForInsight,
  toValidNumber,
  unwrapGridRow,
  unwrapGridRows,
  getGridDataRows,
};
