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
  const excelColumns = columns?.map(col => ({
    header: col.headerName || col.label || col.name || col.field,
    key: col.field || col.key,
    width: getColumnWidth(col.type)
  }));
  
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
 * Add subtitle rows
 */
const addSubtitleRows = (reportSheet, report, columnCount,rowCount, startDate, endDate) => {
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

  // Subtitle 3: Report details
  const subtitle3Range = `A4:${String.fromCharCode(65 + columnCount - 1)}4`;
  reportSheet.mergeCells(subtitle3Range);
  const subtitle3Cell = reportSheet.getCell("A4");
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
};

/**
 * Add header row
 */
const addHeaderRow = (reportSheet, excelColumns) => {
  const headerRow = reportSheet.getRow(5);
  
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
 * Add data rows
 */
const addDataRows = (reportSheet, rows, columns) => {
    rows?.forEach((row, i) => {
    // Map row data to match column keys
    const mappedRow = mapRowData(row, columns);
    const excelRow = reportSheet.addRow(mappedRow);
    
    // Alternating row colors with premium styling
    const fillColor = i % 2 === 0 ? "FFF8FAFC" : "FFEFF6FF";
    const borderColor = "FFE2E8F0";
    
    excelRow.eachCell((cell, colNumber) => {
      const column = columns?.[colNumber - 1];
      
      // Format cell value
      // if (cell.value) {
        cell.value = formatCellValue(cell.value, column?.type);
      // }
      
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
const applyRowHeights = (reportSheet, columns) => {
  reportSheet.getRow(1).height = 35; // Title row
  reportSheet.getRow(2).height = 20; // Subtitle 1
  reportSheet.getRow(3).height = 20; // Date range row
  reportSheet.getRow(4).height = 20; // Report details row
  reportSheet.getRow(5).height = 30; // Header row

  // Data rows
  for (let i = 6; i <= reportSheet.rowCount; i++) {
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
const applyConditionalFormatting = (reportSheet, rowCount) => {
  const lastRow = rowCount + 5;
  
  // Add a subtle gradient effect to the data area
  for (let i = 6; i <= lastRow; i++) {
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
const saveExcelFile = async (workbook, report) => {  
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = generateFileName(report);
  
  saveAs(new Blob([buffer]), fileName);
  console.log(`✅ Excel file exported successfully: ${fileName}`);
};

export { createWorkbook, setupWorksheetColumns, addTitleRow, addSubtitleRows, addHeaderRow, addDataRows, applyRowHeights, applyConditionalFormatting, saveExcelFile };
