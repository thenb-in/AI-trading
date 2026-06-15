import React from "react";
import { convertCellToText } from "../../base_report/ReportUtils.js";
import { sanitizeHTML } from "../../base_report/reportFormatter.js";
import { toValidNumber } from "@utils/toValidNumber.js";
import { DEFAULT_COLUMN_WIDTH } from "./constants.js";

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
    width: Number.isFinite(col.width) ? col.width : DEFAULT_COLUMN_WIDTH,
    sortable: col.sortable !== false,
    frozen: col.frozen === true,
    // Support both 'hide' and 'hidden' flags (backend reports use 'hidden')
    hide: Boolean(col.hide || col.hidden),
    field: col.field,
    headerName: col.headerName || col.field,
  }));
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
    return React.createElement("div", {
      dangerouslySetInnerHTML: { __html: rawValue },
      style: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
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
      const formatType = getColumnFormatType(col);
      const sortAsNumber = formatType === "number" || formatType === "numeric";
      const sortAsDate = formatType === "date" || formatType === "datetime";
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

        if (sortAsNumber) {
          const na = toValidNumber(va);
          const nb = toValidNumber(vb);

          const isNa = typeof na === "number" && !Number.isNaN(na);
          const isNb = typeof nb === "number" && !Number.isNaN(nb);

          if (!isNa && !isNb) {
            return String(na).localeCompare(String(nb)) * dir;
          }
          if (!isNa) return 1 * dir;
          if (!isNb) return -1 * dir;

          if (na < nb) return -1 * dir;
          if (na > nb) return 1 * dir;
          return 0;
        }

        // Sort dates chronologically. Triggers on declared date columns OR
        // when the cell value is a Date instance — without this, `String(date)`
        // produces "Mon Apr 13 2026 ..." and lex-sorts by weekday name.
        if (sortAsDate || va instanceof Date || vb instanceof Date) {
          const ta = va instanceof Date ? va.getTime() : Date.parse(va);
          const tb = vb instanceof Date ? vb.getTime() : Date.parse(vb);
          const isTa = !Number.isNaN(ta);
          const isTb = !Number.isNaN(tb);

          if (!isTa && !isTb) {
            return String(va).localeCompare(String(vb)) * dir;
          }
          if (!isTa) return 1 * dir;
          if (!isTb) return -1 * dir;

          if (ta < tb) return -1 * dir;
          if (ta > tb) return 1 * dir;
          return 0;
        }

        return String(va).localeCompare(String(vb)) * dir;
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

// Width used by DataGridHeader for cells when `columnWidths[field]` isn't yet
// populated (transient render before merge has run). Matches `baseWidthFor` in
// layoutMerge.js so the header and body agree.
const fallbackColumnWidth = (col) => {
  if (Number.isFinite(col.width)) return col.width;
  const n = (col.headerName || col.field || "").length;
  return Math.max(15 * n + 18 + 22 + 32 + 32, 80, DEFAULT_COLUMN_WIDTH);
};

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
 * columns are the ones worth aggregating". The grid only renders what callers
 * (or this helper) build; it has no
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
};
