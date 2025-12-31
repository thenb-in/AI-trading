import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  formatCellValue, 
  getColumnWidth, 
  getCurrentDateTime,
  mapRowData,
  generateFileName 
} from './formattingUtils.js';

// ===== EXCEL RENDERING FUNCTIONS =====

/**
 * Create and configure workbook
 */
const createWorkbook = () => {
  return new ExcelJS.Workbook();
};

/**
 * Setup worksheet columns
 */
const setupWorksheetColumns = (reportSheet, columns) => {
  const excelColumns = columns?.map(col => ({
    header: col.headerName || col.label || col.name || col.field,
    key: col.field || col.key,
    width: getColumnWidth(col.type)
  }));
  
  reportSheet.columns = excelColumns;
  return excelColumns;
};

/**
 * Calculate optimal column widths based on content
 * Optimized for printing - tighter widths to fit more columns per page
 * Ensures headers are never cut off
 */
const calculateOptimalColumnWidths = (reportSheet, columns, excelColumns, dataStartRow = 2) => {
  const columnWidths = [];
  
  excelColumns.forEach((excelCol, colIndex) => {
    const column = columns?.[colIndex];
    let maxDataLength = 0;
    
    // Check header length - this must always fit
    const headerText = String(excelCol.header || '');
    const headerLength = headerText.length;
    
    // Check summary row if it exists (row 1, merged cell)
    // For merged summary row, we don't need to calculate per-column width
    // But we should ensure columns are wide enough for headers
    if (dataStartRow > 2) {
      // Summary row exists, but it's merged so doesn't affect column width calculation
    }
    
    // Check all data cells in this column
    for (let rowIndex = dataStartRow; rowIndex <= reportSheet.rowCount; rowIndex++) {
      const cell = reportSheet.getRow(rowIndex).getCell(colIndex + 1);
      if (cell.value !== null && cell.value !== undefined) {
        const cellText = String(cell.value);
        maxDataLength = Math.max(maxDataLength, cellText.length);
      }
    }
    
    // Use the maximum of header length and data length
    // Excel width units are approximately 1.2x character count for proper display
    const maxLength = Math.max(headerLength, maxDataLength);
    let optimalWidth;
    
    // Calculate width ensuring header always fits
    // Excel width: need to account for font width (approximately 1.1-1.2x character count)
    // Add padding to ensure headers don't get cut off
    
    if (maxLength <= 3) {
      // Very short: Day (3), Status (6) - but ensure header fits
      optimalWidth = Math.max(headerLength * 1.2 + 1, maxLength * 1.2 + 1, 5);
    } 
    else if (maxLength <= 6) {
      // Short: Status (6), Hours (5), Factor (6)
      optimalWidth = Math.max(headerLength * 1.2 + 1.5, maxLength * 1.2 + 1.5);
    }
    else if (maxLength <= 10) {
      // Medium: Department (10), Position (8)
      optimalWidth = Math.max(headerLength * 1.2 + 2, maxLength * 1.2 + 2);
    }
    else if (maxLength <= 15) {
      // Medium-long: Code (12), Shift Start/End
      optimalWidth = Math.max(headerLength * 1.2 + 2.5, maxLength * 1.2 + 2.5);
    }
    else {
      // Long content: All Punch Pairs, Remarks
      optimalWidth = Math.min(Math.max(headerLength * 1.2 + 3, maxLength * 1.2 + 3), 45);
    }
    
    // Ensure minimum width for readability
    optimalWidth = Math.max(optimalWidth, headerLength * 1.1 + 1); // Always fit header with padding
    
    // For number/duration types, ensure they can display formatted numbers properly
    if (column?.type === 'number' || column?.type === 'duration') {
      optimalWidth = Math.max(optimalWidth, Math.max(headerLength * 1.2 + 1, 10));
    }
    
    // For date/time types, ensure they can display formatted dates
    if (column?.type === 'date' || column?.type === 'time' || column?.type === 'datetime') {
      optimalWidth = Math.max(optimalWidth, Math.max(headerLength * 1.2 + 1, 12));
    }
    
    columnWidths.push(optimalWidth);
    
    // Apply the width to the column
    const columnObj = reportSheet.getColumn(colIndex + 1);
    columnObj.width = optimalWidth;
  });
  
  return columnWidths;
};

/**
 * Add footer information at the end of the sheet (plain text, no merging)
 */
const addFooterInfo = (reportSheet, report, startDate, endDate, lastDataRow) => {
  const footerRow = lastDataRow + 2; // Add one blank row after data, then footer
  
  // Get current date and time
  const { reportDate, reportTime } = getCurrentDateTime();
  
  // Cell A: Report name
  const reportNameCell = reportSheet.getCell(`A${footerRow}`);
  reportNameCell.value = `Report: ${report.slug || report.title || 'Data Export'}`;
  reportNameCell.font = { size: 11, name: "Segoe UI" };
  reportNameCell.alignment = { horizontal: "left", vertical: "middle" };
  
  // Cell B: Date
  const dateCell = reportSheet.getCell(`B${footerRow}`);
  dateCell.value = `Date: ${reportDate} ${reportTime}`;
  dateCell.font = { size: 11, name: "Segoe UI" };
  dateCell.alignment = { horizontal: "left", vertical: "middle" };
  
  // Cell C: Filters (Date range)
  const filtersCell = reportSheet.getCell(`C${footerRow}`);
  let filterText = '';
  if (startDate && endDate) {
    filterText = `Filters: ${startDate} to ${endDate}`;
  } else if (startDate) {
    filterText = `Filters: Start Date: ${startDate}`;
  } else if (endDate) {
    filterText = `Filters: End Date: ${endDate}`;
  } else {
    filterText = 'Filters: Not specified';
  }
  filtersCell.value = filterText;
  filtersCell.font = { size: 11, name: "Segoe UI" };
  filtersCell.alignment = { horizontal: "left", vertical: "middle" };
};

/**
 * Add header row
 */
const addHeaderRow = (reportSheet, excelColumns, headerRowNumber = 1) => {
  const headerRow = reportSheet.getRow(headerRowNumber);
  
  excelColumns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { 
      bold: true, 
      size: 13, 
      color: { argb: "FFFFFFFF" }, 
      name: "Segoe UI" 
    };
    cell.alignment = { 
      horizontal: "center", 
      vertical: "middle", 
      wrapText: true 
    };
    cell.fill = { 
      type: "pattern", 
      pattern: "solid", 
      fgColor: { argb: "FF1E3A8A" } 
    };
    cell.border = {
      top: { style: "thick", color: { argb: "FF1E40AF" } },
      bottom: { style: "thick", color: { argb: "FF1E40AF" } },
      left: { style: "medium", color: { argb: "FF3B82F6" } },
      right: { style: "medium", color: { argb: "FF3B82F6" } }
    };
  });
};

/**
 * Get display name for a summary key by looking up in columns array or using fallback
 */
const getSummaryDisplayName = (key, columns = []) => {
  // First, try to find in columns array
  const column = columns.find(col => (col.key || col.field) === key);
  if (column?.display_name || column?.headerName) {
    return column.display_name || column.headerName;
  }
  
  // Fallback: Use human-readable names for common employee fields
  const displayNameMap = {
    'emp_code': 'Employee Code',
    'employee_code': 'Employee Code',
    'first_name': 'Name',
    'employee_name': 'Name',
    'department_name': 'Department',
    'employee_department': 'Department',
    'position_name': 'Position',
    'emp_type': 'Employee Type'
  };
  
  return displayNameMap[key] || key;
};

/**
 * Format summary value appropriately based on type
 */
const formatSummaryValue = (value) => {
  if (value === null || value === undefined) return '';
  
  // If it's a number (or numeric string), format with 2 decimal places
  if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '' : num.toFixed(2);
  }
  
  // Otherwise return as string
  return String(value);
};

/**
 * Add summary rows - each key-value pair in columns 1 and 2
 * @param {Object} reportSheet - Excel worksheet
 * @param {Object} summary - Summary object with key-value pairs
 * @param {Array} columns - Columns array to lookup display names
 * @returns {number} Number of summary rows created
 */
const addEmployeeSummaryRow = (reportSheet, summary = {}, excelColumns, columns = []) => {
  if (!summary || Object.keys(summary).length === 0) {
    return 0;
  }
  
  let currentRow = 1;
  
  // Process all summary key-value pairs
  Object.entries(summary).forEach(([key, value]) => {
    // Skip null/undefined values
    if (value === null || value === undefined || value === '') {
      return;
    }
    
    const row = reportSheet.getRow(currentRow);
    
    // Column 1: Display name
    const labelCell = row.getCell(1);
    labelCell.value = getSummaryDisplayName(key, columns);
    labelCell.font = { 
      bold: true, 
      size: 11, 
      color: { argb: "FF000000" }, 
      name: "Segoe UI" 
    };
    labelCell.alignment = { 
      horizontal: "left", 
      vertical: "middle",
      wrapText: true
    };
    labelCell.fill = { 
      type: "pattern", 
      pattern: "solid", 
      fgColor: { argb: "FFF0F0F0" } // Light gray background
    };
    labelCell.border = {
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } }
    };
    
    // Column 2: Value
    const valueCell = row.getCell(2);
    valueCell.value = formatSummaryValue(value);
    
    // Determine if value is numeric for alignment
    const isNumeric = typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)) && value !== '');
    
    valueCell.font = { 
      size: 11, 
      color: { argb: "FF000000" }, 
      name: "Segoe UI" 
    };
    valueCell.alignment = { 
      horizontal: isNumeric ? "right" : "left", 
      vertical: "middle",
      wrapText: true
    };
    valueCell.fill = { 
      type: "pattern", 
      pattern: "solid", 
      fgColor: { argb: "FFFFFFFF" } // White background
    };
    valueCell.border = {
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } }
    };
    
    // Set row height
    row.height = 20;
    
    currentRow++;
  });
  
  // Return number of summary rows created
  return currentRow - 1;
};

/**
 * Add data rows starting at a specific row number
 */
const addDataRows = (reportSheet, rows, columns, startRow = 2) => {
    rows?.forEach((row, i) => {
    // Map row data to match column keys
    const mappedRow = mapRowData(row, columns);
    const excelRow = reportSheet.getRow(startRow + i);
    
    // Set values for each cell in the row, maintaining column order
    columns.forEach((col, colIdx) => {
      const fieldKey = col.field || col.key;
      const value = mappedRow[fieldKey];
      const cell = excelRow.getCell(colIdx + 1);
      cell.value = value !== undefined ? value : null;
    });
    
    // Alternating row colors with premium styling
    const fillColor = i % 2 === 0 ? "FFF8FAFC" : "FFEFF6FF";
    const borderColor = "FFE2E8F0";
    
    // Apply formatting to all cells including empty ones
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const column = columns?.[colNumber - 1];
      
      // Format cell value based on type (even if empty, apply type-based formatting)
      if (cell.value !== null && cell.value !== undefined) {
        cell.value = formatCellValue(cell.value, column?.type);
      }
      
      // Determine alignment based on column type
      const isNumberType = column?.type === 'number' || 
                          column?.type === 'duration' || 
                          column?.type === 'boolean';
      
      cell.font = { 
        size: 11, 
        name: "Segoe UI",
        color: { argb: "FF1F2937" }
      };
      cell.alignment = { 
        vertical: "middle", 
        horizontal: isNumberType ? "right" : "left", 
        wrapText: true 
      };
      
      // Apply alternating row colors to ALL cells (including empty ones)
      cell.fill = { 
        type: "pattern", 
        pattern: "solid", 
        fgColor: { argb: fillColor } 
      };
      cell.border = {
        top: { style: "thin", color: { argb: borderColor } },
        bottom: { style: "thin", color: { argb: borderColor } },
        left: { style: "thin", color: { argb: borderColor } },
        right: { style: "thin", color: { argb: borderColor } }
      };
    });
  });
};

/**
 * Apply row heights
 */
const applyRowHeights = (reportSheet, columns, dataStartRow = 2, headerRowNumber = 1) => {
  // Header row height is set in addHeaderRow, but ensure it's set
  if (reportSheet.getRow(headerRowNumber)) {
    reportSheet.getRow(headerRowNumber).height = 30; // Header row
  }
  
  // Summary row height is set in addEmployeeSummaryRow, skip it here
  // Data rows start from dataStartRow
  for (let i = dataStartRow; i <= reportSheet.rowCount; i++) {
    const row = reportSheet.getRow(i);
    let maxLines = 1;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (!cell.value) return;

      const col = columns?.[colNumber - 1];
      const colWidth = col?.width || 10;
      const text = String(cell.value);

      // Estimate number of lines required
      const approxCharPerLine = colWidth * 1.2; // rough factor
      const lines = Math.ceil(text.length / approxCharPerLine);

      if (lines > maxLines) maxLines = lines;
    });

    row.height = 18 * maxLines; // 18px per line
  }
};


/**
 * Apply conditional formatting
 * Note: This is kept minimal to preserve alternating row colors from addDataRows
 */
const applyConditionalFormatting = () => {
  // Conditional formatting is now handled in addDataRows with alternating colors
  // This function is kept for future enhancements if needed
};

/**
 * Configure print settings: landscape orientation and zero margins
 */
const configurePrintSettings = (reportSheet) => {
  reportSheet.pageSetup = {
    orientation: 'landscape',
    margins: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      header: 0,
      footer: 0
    },
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0 // 0 means fit all rows
  };
};

/**
 * Filter out columns that have no values in any row
 */
const filterEmptyColumns = (columns, rows) => {
  if (!columns || !rows || rows.length === 0) {
    return columns || [];
  }
  
  return columns.filter(column => {
    const fieldKey = column.field || column.key;
    
    // Check if any row has a value for this column
    return rows.some(row => {
      const value = row[fieldKey] ?? row[column.name];
      // Consider value as non-empty if it's not null, undefined, or empty string
      return value !== null && value !== undefined && value !== '';
    });
  });
};

/**
 * Save Excel file
 */
const saveExcelFile = async (workbook, report) => {  
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = generateFileName(report);
  
  saveAs(new Blob([buffer]), fileName);
  console.log(`✅ Excel file exported successfully: ${fileName}`);
};

export { createWorkbook, setupWorksheetColumns, addHeaderRow, addEmployeeSummaryRow, addDataRows, applyRowHeights, applyConditionalFormatting, saveExcelFile, calculateOptimalColumnWidths, configurePrintSettings, filterEmptyColumns, addFooterInfo };
