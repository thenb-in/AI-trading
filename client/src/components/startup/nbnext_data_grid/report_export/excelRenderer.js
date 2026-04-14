import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  getColumnWidth,
  getCurrentDateTime,
  getExportDisplayString,
  generateFileName
} from './formattingUtils.js';
import { convertCellToText } from '../../BaseReport/ReportUtils.js';

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

    const headerText = String(excelCol.header || '');
    const headerLength = headerText.length;

    for (let rowIndex = dataStartRow; rowIndex <= reportSheet.rowCount; rowIndex++) {
      const cell = reportSheet.getRow(rowIndex).getCell(colIndex + 1);
      if (cell.value !== null && cell.value !== undefined) {
        const cellText = String(cell.value);
        maxDataLength = Math.max(maxDataLength, cellText.length);
      }
    }

    const maxLength = Math.max(headerLength, maxDataLength);
    let optimalWidth;

    if (maxLength <= 3) {
      optimalWidth = Math.max(headerLength * 1.2 + 1, maxLength * 1.2 + 1, 5);
    } else if (maxLength <= 6) {
      optimalWidth = Math.max(headerLength * 1.2 + 1.5, maxLength * 1.2 + 1.5);
    } else if (maxLength <= 10) {
      optimalWidth = Math.max(headerLength * 1.2 + 2, maxLength * 1.2 + 2);
    } else if (maxLength <= 15) {
      optimalWidth = Math.max(headerLength * 1.2 + 2.5, maxLength * 1.2 + 2.5);
    } else {
      optimalWidth = Math.min(Math.max(headerLength * 1.2 + 3, maxLength * 1.2 + 3), 45);
    }

    optimalWidth = Math.max(optimalWidth, headerLength * 1.1 + 1);

    if (column?.type === 'number' || column?.type === 'duration') {
      optimalWidth = Math.max(optimalWidth, Math.max(headerLength * 1.2 + 1, 10));
    }

    if (column?.type === 'date' || column?.type === 'time' || column?.type === 'datetime') {
      optimalWidth = Math.max(optimalWidth, Math.max(headerLength * 1.2 + 1, 12));
    }

    columnWidths.push(optimalWidth);

    const columnObj = reportSheet.getColumn(colIndex + 1);
    columnObj.width = optimalWidth;
  });

  return columnWidths;
};

/**
 * Add footer information at the end of the sheet (plain text, no merging)
 */
const addFooterInfo = (reportSheet, report, startDate, endDate, lastDataRow) => {
  const footerRow = lastDataRow + 2;

  const { reportDate, reportTime } = getCurrentDateTime();

  const reportNameCell = reportSheet.getCell(`A${footerRow}`);
  reportNameCell.value = `Report: ${report.slug || report.title || 'Data Export'}`;
  reportNameCell.font = { size: 11, name: "Segoe UI" };
  reportNameCell.alignment = { horizontal: "left", vertical: "middle" };

  const dateCell = reportSheet.getCell(`B${footerRow}`);
  dateCell.value = `Date: ${reportDate} ${reportTime}`;
  dateCell.font = { size: 11, name: "Segoe UI" };
  dateCell.alignment = { horizontal: "left", vertical: "middle" };

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
  const column = columns.find(col => (col.key || col.field) === key);
  if (column?.display_name || column?.headerName) {
    return column.display_name || column.headerName;
  }

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

  if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '' : num.toFixed(2);
  }

  return String(value);
};

/**
 * Add summary rows - each key-value pair in columns 1 and 2
 */
const addEmployeeSummaryRow = (reportSheet, summary = {}, excelColumns, columns = []) => {
  if (!summary || Object.keys(summary).length === 0) {
    return 0;
  }

  let currentRow = 1;

  Object.entries(summary).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    const row = reportSheet.getRow(currentRow);

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
      fgColor: { argb: "FFF0F0F0" }
    };
    labelCell.border = {
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } }
    };

    const valueCell = row.getCell(2);
    valueCell.value = formatSummaryValue(value);

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
      fgColor: { argb: "FFFFFFFF" }
    };
    valueCell.border = {
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
      left: { style: "thin", color: { argb: "FFCCCCCC" } },
      right: { style: "thin", color: { argb: "FFCCCCCC" } }
    };

    row.height = 20;

    currentRow++;
  });

  return currentRow - 1;
};

/**
 * Add data rows starting at a specific row number
 */
const addDataRows = (reportSheet, rows, columns, startRow = 2) => {
  rows?.forEach((row, i) => {
    const excelRow = reportSheet.getRow(startRow + i);

    if (row._isGroupTotal) {
      const labelField = row._groupByField;
      const label = row._groupLabel || 'Group Total';
      const totals = row._groupTotals || {};

      columns.forEach((col, colIdx) => {
        const fieldKey = col.field || col.key;
        const cell = excelRow.getCell(colIdx + 1);

        if (fieldKey === labelField || colIdx === 0) {
          cell.value = `Total for ${label}:`;
        } else if (totals[fieldKey] !== undefined && totals[fieldKey] !== null) {
          const t = totals[fieldKey];
          let text = convertCellToText(col, t);
          if (text === '-') {
            text = '';
          }
          cell.value = text === '' ? null : text;
        } else {
          cell.value = null;
        }

        cell.font = { bold: true, size: 11, name: "Segoe UI", color: { argb: "FF1E3A8A" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE2E8F0" }
        };
        cell.border = {
          top: { style: "medium", color: { argb: "FF1E3A8A" } },
          bottom: { style: "medium", color: { argb: "FF1E3A8A" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } }
        };

        const alignRight =
          col?.type === 'number' ||
          col?.type === 'duration' ||
          col?.type === 'boolean' ||
          col?.type === 'currency';
        cell.alignment = {
          horizontal: alignRight ? 'right' : 'left',
          vertical: 'middle'
        };
      });
      return;
    }

    columns.forEach((col, colIdx) => {
      const display = getExportDisplayString(col, row);
      const cell = excelRow.getCell(colIdx + 1);
      cell.value = display === '' ? null : display;
    });

    const fillColor = i % 2 === 0 ? "FFF8FAFC" : "FFEFF6FF";
    const borderColor = "FFE2E8F0";

    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const column = columns?.[colNumber - 1];

      const isNumberType = column?.type === 'number' ||
                          column?.type === 'duration' ||
                          column?.type === 'boolean' ||
                          column?.type === 'currency';

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
 * Add total row at the given row number (for export when showTotalRow is enabled in grid)
 */
const addTotalRow = (reportSheet, totalRowData, columns, startRow) => {
  if (!totalRowData || typeof totalRowData !== 'object' || Object.keys(totalRowData).length === 0) {
    return;
  }
  const excelRow = reportSheet.getRow(startRow);
  columns.forEach((col, colIdx) => {
    const fieldKey = col.field || col.key;
    const cell = excelRow.getCell(colIdx + 1);
    if (colIdx === 0) {
      cell.value = 'Total';
    } else if (totalRowData[fieldKey] !== undefined && totalRowData[fieldKey] !== null) {
      const v = totalRowData[fieldKey];
      let text = convertCellToText(col, v);
      if (text === '-') {
        text = '';
      }
      cell.value = text === '' ? null : text;
    } else {
      cell.value = null;
    }
    cell.font = { bold: true, size: 11, name: 'Segoe UI', color: { argb: 'FF1E3A8A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    const totalAlignRight =
      col?.type === 'number' ||
      col?.type === 'duration' ||
      col?.type === 'boolean' ||
      col?.type === 'currency';
    cell.alignment = {
      horizontal: colIdx === 0 ? 'left' : totalAlignRight ? 'right' : 'left',
      vertical: 'middle'
    };
  });
};

/**
 * Apply row heights
 */
const applyRowHeights = (reportSheet, columns, dataStartRow = 2, headerRowNumber = 1) => {
  if (reportSheet.getRow(headerRowNumber)) {
    reportSheet.getRow(headerRowNumber).height = 30;
  }

  for (let i = dataStartRow; i <= reportSheet.rowCount; i++) {
    const row = reportSheet.getRow(i);
    let maxLines = 1;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (!cell.value) return;

      const col = columns?.[colNumber - 1];
      const colWidth = col?.width || 10;
      const text = String(cell.value);

      const approxCharPerLine = colWidth * 1.2;
      const lines = Math.ceil(text.length / approxCharPerLine);

      if (lines > maxLines) maxLines = lines;
    });

    row.height = 18 * maxLines;
  }
};

/**
 * Apply conditional formatting
 */
const applyConditionalFormatting = () => {};

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
    fitToHeight: 0
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

    return rows.some(row => {
      const value = row[fieldKey] ?? row[column.name];
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
};

export { createWorkbook, setupWorksheetColumns, addHeaderRow, addEmployeeSummaryRow, addDataRows, addTotalRow, applyRowHeights, applyConditionalFormatting, saveExcelFile, calculateOptimalColumnWidths, configurePrintSettings, filterEmptyColumns, addFooterInfo };
