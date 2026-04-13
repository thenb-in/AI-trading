import React from "react";
import { convertCellToText } from "../../BaseReport/ReportUtils.js";
import { sanitizeHTML } from "../../BaseReport/reportFormatter.js";
import { toValidNumber } from "@utils/toValidNumber.js";
import { DEFAULT_COLUMN_WIDTH } from "./constants.js";

/**
 * Returns the effective format type for a column, preferring `nature` over `type`.
 * This allows backend columns to carry a display hint (nature) that differs from
 * their storage type.
 */
const getColumnFormatType = (columnDef) => {
  const formatType =
    typeof columnDef?.nature === "string" && columnDef.nature.trim()
      ? columnDef.nature.trim()
      : columnDef?.type;
  return typeof formatType === "string" ? formatType : null;
};

/**
 * Returns a column definition with `type` set to the effective format type
 * (from `getColumnFormatType`). Used to drive convertCellToText and sort logic.
 */
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

/**
 * Format a cell value for plain-text display (e.g. in Insights panel).
 * Uses the same logic as the data grid (convertCellToText); for HTML columns strips tags.
 */
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
      style: { display: "flex", alignItems: "center", justifyContent: "center" },
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

      let cellValue;
      if (typeof col.valueGetter === "function") {
        cellValue = col.valueGetter({ row: indexedRow._row, field: col.field });
      } else {
        cellValue = indexedRow._row?.[field];
      }

      const formatCol = getColumnForFormatting(col);
      const cellText = convertCellToText(formatCol, cellValue);
      const cellString = cellText == null ? "" : String(cellText).toLowerCase();
      const filterString = String(filterValue).toLowerCase();

      return cellString.includes(filterString);
    });
  });
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

  const formatType = getColumnFormatType(col);
  const sortAsNumber = formatType === "number" || formatType === "numeric";

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

    if (sortAsNumber) {
      const na = toValidNumber(va);
      const nb = toValidNumber(vb);

      const isNa = typeof na === "number" && !Number.isNaN(na);
      const isNb = typeof nb === "number" && !Number.isNaN(nb);

      if (!isNa && !isNb) return String(na).localeCompare(String(nb)) * dir;
      if (!isNa) return 1 * dir;
      if (!isNb) return -1 * dir;

      if (na < nb) return -1 * dir;
      if (na > nb) return 1 * dir;
      return 0;
    }

    return String(va).localeCompare(String(vb)) * dir;
  });
  return copy;
};

/**
 * Calculate cumulative frozen column offsets
 * @param {Array} frozenColumns - Array of frozen column objects
 * @param {Object} columnWidths - Optional object mapping field names to actual rendered widths
 */
const calculateFrozenOffsets = (frozenColumns, columnWidths = null) => {
  const offsets = {};
  let current = 0;
  frozenColumns.forEach((c) => {
    offsets[c.field] = current;
    const width =
      columnWidths && columnWidths[c.field]
        ? columnWidths[c.field]
        : getColumnWidthWithIcons(c);
    current += width;
  });
  return offsets;
};

/**
 * Calculate total column width including space for sorting, freeze, and group icons.
 * Sorting icon: ~16px + 6px margin = ~22px (only if sortable)
 * Freeze icon: ~14px icon + 4px padding * 2 + 1px border * 2 + 8px marginLeft = ~32px
 * Group icon: same = ~32px
 */
const getColumnWidthWithIcons = (col) => {
  const baseWidth = col.width || DEFAULT_COLUMN_WIDTH;
  const sortIconWidth = col.sortable !== false ? 22 : 0;
  const freezeIconWidth = 32;
  const groupIconWidth = 32;
  const extraWidth = sortIconWidth + freezeIconWidth + groupIconWidth;
  return baseWidth + extraWidth;
};

/**
 * Build column config from current grid state for saving to layout.
 * Includes field ordering when columnOrder is provided.
 */
const buildColumnConfig = (normalizedColumns, columnVisibility, frozenState, columnOrder = []) => {
  const orderedFields =
    columnOrder.length > 0 ? columnOrder : normalizedColumns.map((col) => col.field);

  return normalizedColumns.map((col) => ({
    field: col.field,
    frozen: frozenState[col.field] || false,
    hide: !columnVisibility[col.field],
    order: orderedFields.indexOf(col.field),
  }));
};

/**
 * Apply column config from layout to grid state.
 * Returns updated column visibility, frozen state, and column order.
 */
const applyColumnConfig = (normalizedColumns, columnConfig) => {
  const columnVisibility = {};
  const frozenState = {};
  const columnConfigMap = {};

  if (Array.isArray(columnConfig)) {
    columnConfig.forEach((config) => {
      columnConfigMap[config.field] = config;
    });
  }

  normalizedColumns.forEach((col) => {
    const config = columnConfigMap[col.field];
    if (config) {
      columnVisibility[col.field] = !config.hide;
      frozenState[col.field] = config.frozen === true;
    } else {
      columnVisibility[col.field] = !col.hide;
      frozenState[col.field] = col.frozen === true;
    }
  });

  // Build column order from saved config (if order info exists)
  let columnOrder = [];
  if (Array.isArray(columnConfig)) {
    const hasOrder = columnConfig.some((c) => typeof c.order === "number");
    if (hasOrder) {
      columnOrder = [...columnConfig]
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
        .map((c) => c.field);
      normalizedColumns.forEach((col) => {
        if (!columnOrder.includes(col.field)) {
          columnOrder.push(col.field);
        }
      });
    }
  }

  return { columnVisibility, frozenState, columnOrder };
};

/**
 * Calculate totals for numeric columns across all rows.
 * @param {Array} rows - Array of row objects
 * @param {Array} columns - Array of column definitions
 * @returns {Object} - Object mapping field names to total values
 */
const calculateTotals = (rows, columns) => {
  const totals = {};

  if (!rows || rows.length === 0) {
    return totals;
  }

  const excludedTypes = ["duration", "date", "datetime", "time", "boolean", "string", "html", "status"];

  /** Seconds stored as numbers; sum in footer (e.g. detailed attendance vertical rows). */
  const isDurationSecondsTotalable = (col) =>
    getColumnFormatType(col) === "duration" && col.field === "total_work_seconds";

  const numericColumns = columns.filter((col) => {
    const formatType = getColumnFormatType(col);
    if (formatType && excludedTypes.includes(formatType) && !isDurationSecondsTotalable(col)) {
      return false;
    }

    const isNumericType = formatType === "number" || formatType === "numeric";

    const isNumericField =
      typeof col.field === "string" &&
      (col.field.includes("amount") ||
        col.field.includes("salary") ||
        col.field.includes("total") ||
        col.field.includes("value") ||
        col.field.includes("price") ||
        col.field.includes("cost") ||
        col.field.includes("_sal") ||
        col.field.includes("_amt") ||
        col.field.startsWith("component_"));

    return isNumericType || isNumericField;
  });

  numericColumns.forEach((col) => {
    let total = 0;
    let count = 0;

    rows.forEach((row) => {
      let value;
      if (typeof col.valueGetter === "function") {
        value = col.valueGetter({ row, field: col.field });
      } else {
        value = row?.[col.field];
      }

      if (value != null && value !== "") {
        const numValue = typeof value === "number" ? value : parseFloat(value);
        if (!isNaN(numValue)) {
          total += numValue;
          count++;
        }
      }
    });

    if (count > 0) {
      totals[col.field] = total;
    }
  });

  return totals;
};

export {
  getColumnFormatType,
  getColumnForFormatting,
  formatCellValueForInsight,
  normalizeColumns,
  renderCellContent,
  getKeyForRow,
  indexRows,
  sortRows,
  calculateFrozenOffsets,
  getColumnWidthWithIcons,
  buildColumnConfig,
  applyColumnConfig,
  filterRows,
  calculateTotals,
  toValidNumber,
};
