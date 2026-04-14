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

    // null handling
    if (va == null && vb == null) return 0;
    if (va == null) return -1 * dir;
    if (vb == null) return 1 * dir;

    if (sortAsNumber) {
      const na = toValidNumber(va);
      const nb = toValidNumber(vb);

      const isNa = typeof na === "number" && !Number.isNaN(na);
      const isNb = typeof nb === "number" && !Number.isNaN(nb);

      // ✅ both invalid → fallback to string sort
      if (!isNa && !isNb) {
        return String(na).localeCompare(String(nb)) * dir;
      }

      // ✅ push invalid to bottom
      if (!isNa) return 1 * dir;
      if (!isNb) return -1 * dir;

      // ✅ numeric compare
      if (na < nb) return -1 * dir;
      if (na > nb) return 1 * dir;
      return 0;
    }

    // default string sorting
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
    // Use columnWidths if provided (actual rendered width), otherwise fallback to getColumnWidthWithIcons
    const width = columnWidths && columnWidths[c.field] 
      ? columnWidths[c.field]
      : getColumnWidthWithIcons(c);
    current += width;
  });
  return offsets;
};

/**
 * Calculate total column width including space for sorting and freeze icons
 * Sorting icon: ~16px + 6px margin = ~22px (only if sortable)
 * Freeze icon: ~14px icon + 4px padding * 2 + 1px border * 2 + 8px marginLeft = ~32px
 * Group icon: ~14px icon + 4px padding * 2 + 1px border * 2 + 8px marginLeft = ~32px
 */
const getColumnWidthWithIcons = (col) => {
  const baseWidth = col.width || DEFAULT_COLUMN_WIDTH;
  const sortIconWidth = col.sortable !== false ? 22 : 0; // Default sortable is true
  const freezeIconWidth = 32; // Always show freeze icon
  const groupIconWidth = 32; // Always show group icon
  const extraWidth = sortIconWidth + freezeIconWidth + groupIconWidth;
  return baseWidth + extraWidth;
};

/**
 * Build column config from current grid state for saving to layout
 * Only saves which columns are frozen and which are hidden
 */
 const buildColumnConfig = (normalizedColumns, columnVisibility, frozenState, columnOrder = []) => {
  // If columnOrder is provided, use it for ordering; otherwise use normalizedColumns order
  const orderedFields = columnOrder.length > 0
    ? columnOrder
    : normalizedColumns.map((col) => col.field);

  return normalizedColumns.map((col) => ({
    field: col.field,
    frozen: frozenState[col.field] || false,
    hide: !columnVisibility[col.field],
    order: orderedFields.indexOf(col.field),
  }));
};

/**
 * Apply column config from layout to grid state
 * Returns updated column visibility and frozen state
 */
 const applyColumnConfig = (normalizedColumns, columnConfig) => {
  const columnVisibility = {};
  const frozenState = {};
  const columnConfigMap = {};

  // Create a map of column config by field
  if (Array.isArray(columnConfig)) {
    columnConfig.forEach((config) => {
      columnConfigMap[config.field] = config;
    });
  }

  // Apply config to each normalized column
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
      // Add any columns not in config at the end
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

  // Identify numeric columns (exclude duration, date, datetime, time, boolean, string types)
  const excludedTypes = ['duration', 'date', 'datetime', 'time', 'boolean', 'string', 'html', 'status'];
  /** Seconds stored as numbers; sum in footer (e.g. detailed attendance vertical rows). */
  const isDurationSecondsTotalable = (col) =>
    getColumnFormatType(col) === 'duration' && col.field === 'total_work_seconds';

  const numericColumns = columns.filter(col => {
    const formatType = getColumnFormatType(col);
    // Skip excluded types except duration columns that hold numeric seconds
    if (formatType && excludedTypes.includes(formatType) && !isDurationSecondsTotalable(col)) {
      return false;
    }
    
    // Check if column type is number or numeric
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
    
    return isNumericType || isNumericField;
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

export {
  getColumnFormatType,
  getColumnForFormatting,
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
  formatCellValueForInsight,
  toValidNumber,
};
