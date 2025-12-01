import { convertCellToText } from "../../BaseReport/ReportUtils.js";
import { DEFAULT_COLUMN_WIDTH } from "./constants.js";

/**
 * Normalize columns with default values
 */
const normalizeColumns = (columns) => {
  return (columns || []).map((col) => ({
    ...col,
    width: Number.isFinite(col.width) ? col.width : DEFAULT_COLUMN_WIDTH,
    sortable: col.sortable !== false,
    frozen: col.frozen === true,
    hide: Boolean(col.hide),
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
  let rawValue;
  if (typeof col.valueGetter === "function") {
    rawValue = col.valueGetter({ row, field: col.field });
  } else {
    rawValue = row?.[col.field];
  }
  const formatted = convertCellToText(col, rawValue);
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
 * Sort rows based on sort model
 */
const sortRows = (indexedRows, sortModel, columns) => {
  if (!sortModel.field || !sortModel.sort) {
    return indexedRows;
  }
  
  const col = columns.find((c) => c.field === sortModel.field);
  if (!col) return indexedRows;

  const getter = (row) => {
    if (typeof col.valueGetter === "function") {
      return col.valueGetter({ row: row._row, field: col.field });
    }
    return row._row?.[col.field];
  };

  const dir = sortModel.sort === "asc" ? 1 : -1;
  const copy = [...indexedRows];
  copy.sort((a, b) => {
    const va = getter(a);
    const vb = getter(b);
    if (va == null && vb == null) return 0;
    if (va == null) return -1 * dir;
    if (vb == null) return 1 * dir;
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
  return copy;
};

/**
 * Calculate cumulative frozen column offsets
 */
const calculateFrozenOffsets = (frozenColumns) => {
  const offsets = {};
  let current = 0;
  frozenColumns.forEach((c) => {
    offsets[c.field] = current;
    current += getColumnWidthWithIcons(c);
  });
  return offsets;
};

/**
 * Calculate total column width including space for sorting and freeze icons
 * Sorting icon: ~16px + 6px margin = ~22px (only if sortable)
 * Freeze icon: ~14px icon + 4px padding * 2 + 1px border * 2 + 8px marginLeft = ~32px
 */
const getColumnWidthWithIcons = (col) => {
  const baseWidth = col.width || DEFAULT_COLUMN_WIDTH;
  const sortIconWidth = col.sortable !== false ? 22 : 0; // Default sortable is true
  const freezeIconWidth = 32; // Always show freeze icon
  const extraWidth = sortIconWidth + freezeIconWidth;
  return baseWidth + extraWidth;
};

export { normalizeColumns, renderCellContent, getKeyForRow, indexRows, sortRows, calculateFrozenOffsets, getColumnWidthWithIcons };

