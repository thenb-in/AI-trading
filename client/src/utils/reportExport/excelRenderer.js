import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  formatCellValue, 
  getColumnWidth, 
  getDateRangeText, 
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
  if (!columns || columns.length === 0) {
    console.warn('setupWorksheetColumns: No columns provided');
    return [];
  }
  
  console.log('setupWorksheetColumns input columns:', columns);
  
  const excelColumns = columns.map((col, idx) => {
    const header = col.headerName || col.label || col.display_name || col.name || col.field || col.id || col.key || `Column ${idx + 1}`;
    const key = col.field || col.key || col.id || `col_${idx + 1}`;
    const result = {
      header: header,
      key: key,
      width: getColumnWidth(col.type)
    };
    console.log(`setupWorksheetColumns column ${idx}:`, { col, result });
    return result;
  });
  
  console.log('setupWorksheetColumns excelColumns:', excelColumns);
  reportSheet.columns = excelColumns;
  return excelColumns;
};

/**
 * Add title row
 */
const addTitleRow = (reportSheet, report, columnCount) => {
  const titleCell = `A1:${String.fromCharCode(65 + columnCount - 1)}1`;
  reportSheet.mergeCells(titleCell);
  
  const titleCellRef = reportSheet.getCell("A1");
  titleCellRef.value = `📊 ${report.slug?.toUpperCase() || 'REPORT'} 📊`;
  titleCellRef.alignment = { horizontal: "center", vertical: "middle" };
  titleCellRef.font = { 
    size: 20, 
    bold: true, 
    color: { argb: "FFFFFFFF" }, 
    name: "Segoe UI" 
  };
  titleCellRef.fill = { 
    type: "pattern", 
    pattern: "solid", 
    fgColor: { argb: "FF2E4A6B" } 
  };
};

/**
 * Add employee summary row
 */
const addEmployeeSummaryRow = (reportSheet, columnCount, employeeSummary) => {
  if (!employeeSummary || !employeeSummary.emp_code) {
    return false; // Return false if no employee summary
  }

  const employeeInfo = [
    `👤 Employee Code: ${employeeSummary.emp_code || ''}`,
    `Name: ${employeeSummary.first_name || ''}`,
    `Department: ${employeeSummary.department_name || ''}`
  ].filter(Boolean).join(' | ');

  const employeeSummaryRange = `A4:${String.fromCharCode(65 + columnCount - 1)}4`;
  reportSheet.mergeCells(employeeSummaryRange);
  const employeeSummaryCell = reportSheet.getCell("A4");
  employeeSummaryCell.value = employeeInfo;
  employeeSummaryCell.alignment = { horizontal: "center", vertical: "middle" };
  employeeSummaryCell.font = { 
    size: 12, 
    bold: true, 
    color: { argb: "FF000000" }, 
    name: "Segoe UI" 
  };
  employeeSummaryCell.fill = { 
    type: "pattern", 
    pattern: "solid", 
    fgColor: { argb: "FFFFF4E6" } 
  };

  return true; // Return true if employee summary was added
};

/**
 * Add subtitle rows
 */
const addSubtitleRows = (reportSheet, report, columnCount, rowCount, startDate, endDate, employeeSummary = null) => {
  const { reportDate, reportTime } = getCurrentDateTime();
  
  // Subtitle 1: Generation info
  const subtitle1Range = `A2:${String.fromCharCode(65 + columnCount - 1)}2`;
  reportSheet.mergeCells(subtitle1Range);
  const subtitle1Cell = reportSheet.getCell("A2");
  subtitle1Cell.value = `🚀 Generated: ${reportDate} | Time: ${reportTime}`;
  subtitle1Cell.alignment = { horizontal: "center", vertical: "middle" };
  subtitle1Cell.font = { 
    size: 14, 
    bold: true, 
    color: { argb: "FFFFFFFF" }, 
    name: "Segoe UI" 
  };
  subtitle1Cell.fill = { 
    type: "pattern", 
    pattern: "solid", 
    fgColor: { argb: "FF4A90E2" } 
  };

  // Subtitle 2: Date range from URL
  const subtitle2Range = `A3:${String.fromCharCode(65 + columnCount - 1)}3`;
  reportSheet.mergeCells(subtitle2Range);
  const subtitle2Cell = reportSheet.getCell("A3");
  subtitle2Cell.value = getDateRangeText(startDate, endDate);
  subtitle2Cell.alignment = { horizontal: "center", vertical: "middle" };
  subtitle2Cell.font = { 
    size: 12, 
    bold: true, 
    color: { argb: "FF000000" }, 
    name: "Segoe UI" 
  };
  subtitle2Cell.fill = { 
    type: "pattern", 
    pattern: "solid", 
    fgColor: { argb: "FFE8F4FD" } 
  };

  // Row 4: Employee Summary (if present) or Report details
  let currentRow = 4;
  const hasEmployeeSummary = addEmployeeSummaryRow(reportSheet, columnCount, employeeSummary);
  
  if (hasEmployeeSummary) {
    currentRow = 5; // Move report details to row 5
  }

  // Report details
  const subtitle3Range = `A${currentRow}:${String.fromCharCode(65 + columnCount - 1)}${currentRow}`;
  reportSheet.mergeCells(subtitle3Range);
  const subtitle3Cell = reportSheet.getCell(`A${currentRow}`);
  subtitle3Cell.value = `📈 Report: ${report.slug || 'Data Export'} | Total Records: ${rowCount} | Columns: ${columnCount}`;
  subtitle3Cell.alignment = { horizontal: "center", vertical: "middle" };
  subtitle3Cell.font = { 
    size: 12, 
    bold: true, 
    color: { argb: "FF000000" }, 
    name: "Segoe UI" 
  };
  subtitle3Cell.fill = { 
    type: "pattern", 
    pattern: "solid", 
    fgColor: { argb: "FFF0F8FF" } 
  };

  // Header row is always the next row after the last subtitle row
  const headerRowNumber = currentRow + 1;
  console.log('addSubtitleRows: currentRow:', currentRow, 'hasEmployeeSummary:', hasEmployeeSummary, 'headerRowNumber:', headerRowNumber);
  return headerRowNumber; // Return the header row number
};

/**
 * Add header row
 */
const addHeaderRow = (reportSheet, excelColumns, headerRowNumber = 5) => {
  if (!excelColumns || excelColumns.length === 0) {
    console.error('addHeaderRow: No excelColumns provided');
    return;
  }
  
  const headerRow = reportSheet.getRow(headerRowNumber);
  
  console.log('addHeaderRow: excelColumns:', excelColumns, 'headerRowNumber:', headerRowNumber, 'excelColumns.length:', excelColumns.length);
  
  excelColumns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    const headerValue = col.header || col.key || col.field || `Column ${idx + 1}`;
    console.log(`addHeaderRow cell ${idx + 1} (column ${String.fromCharCode(65 + idx)}):`, { 
      col, 
      headerValue,
      'col.header': col.header,
      'col.key': col.key,
      'col.field': col.field
    });
    
    if (!headerValue || headerValue.trim() === '') {
      console.warn(`addHeaderRow: Empty header value for column ${idx + 1}, using fallback`);
    }
    
    cell.value = headerValue || `Column ${idx + 1}`;
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
 * Add data rows
 */
const addDataRows = (reportSheet, rows, columns, startRowNumber = 6) => {
    rows?.forEach((row, i) => {
    // Map row data to match column keys
    const mappedRow = mapRowData(row, columns);
    const excelRow = reportSheet.getRow(startRowNumber + i);
    
    // Set row values
    columns?.forEach((col, idx) => {
      const cell = excelRow.getCell(idx + 1);
      const value = mappedRow[col.field] || row[col.field] || row[col.key];
      cell.value = formatCellValue(value, col?.type);
    });
    
    // Alternating row colors with premium styling
    const fillColor = i % 2 === 0 ? "FFF8FAFC" : "FFEFF6FF";
    const borderColor = "FFE2E8F0";
    
    excelRow.eachCell((cell, colNumber) => {
      const column = columns?.[colNumber - 1];
      
      cell.font = { 
        size: 11, 
        name: "Segoe UI",
        color: { argb: "FF1F2937" }
      };
      cell.alignment = { 
        vertical: "middle", 
        horizontal: column?.type === 'number' ? "right" : "left", 
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
 * Apply row heights
 */
const applyRowHeights = (reportSheet, columns, headerRowNumber = 5) => {
  reportSheet.getRow(1).height = 35; // Title row
  reportSheet.getRow(2).height = 20; // Subtitle 1
  reportSheet.getRow(3).height = 20; // Date range row
  
  // Employee summary row (if present)
  if (headerRowNumber === 6) {
    reportSheet.getRow(4).height = 20; // Employee summary row
    reportSheet.getRow(5).height = 20; // Report details row
  } else {
    reportSheet.getRow(4).height = 20; // Report details row
  }
  
  reportSheet.getRow(headerRowNumber).height = 30; // Header row

  // Data rows start after header row
  const dataStartRow = headerRowNumber + 1;
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
 */
const applyConditionalFormatting = (reportSheet, rowCount, headerRowNumber = 5) => {
  const dataStartRow = headerRowNumber + 1;
  const lastRow = rowCount + headerRowNumber;
  
  // Add a subtle gradient effect to the data area
  for (let i = dataStartRow; i <= lastRow; i++) {
    const row = reportSheet.getRow(i);
    row.eachCell((cell) => {
      if (i % 5 === 0) { // Every 5th row gets a slightly different shade
        cell.fill = { 
          type: "pattern", 
          pattern: "solid", 
          fgColor: { argb: "FFF1F5F9" } 
        };
      }
    });
  }
};

/**
 * Save Excel file
 */
const saveExcelFile = async (workbook, report, employeeSummary = null) => {  
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = generateFileName(report, employeeSummary);
  
  saveAs(new Blob([buffer]), fileName);
  console.log(`✅ Excel file exported successfully: ${fileName}`);
};

export { createWorkbook, setupWorksheetColumns, addTitleRow, addSubtitleRows, addHeaderRow, addDataRows, applyRowHeights, applyConditionalFormatting, saveExcelFile };
