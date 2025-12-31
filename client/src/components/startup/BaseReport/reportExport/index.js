// ===== MAIN EXPORT FUNCTION =====

import { extractDateRangeFromUrl } from './formattingUtils.js';
import {
  createWorkbook,
  setupWorksheetColumns,
  addHeaderRow,
  addEmployeeSummaryRow,
  addDataRows,
  applyRowHeights,
  applyConditionalFormatting,
  saveExcelFile,
  calculateOptimalColumnWidths,
  configurePrintSettings,
  filterEmptyColumns,
  addFooterInfo
} from './excelRenderer.js';


const handleExport = async (report, rows, columns, currentUrl, summary = {}) => {
  if (!rows || rows?.length === 0) {
    alert("No data available to export");
    return;
  }

  try {
    // Extract date range from URL
    const { startDate, endDate } = extractDateRangeFromUrl(currentUrl);
    
    // Filter out columns that have no values in any row
    const columnsWithData = filterEmptyColumns(columns, rows);
    
    // Create workbook and worksheet
    const workbook = createWorkbook();
    const reportSheet = workbook.addWorksheet("Report Data");
    
    // Setup columns (only those with data)
    const excelColumns = setupWorksheetColumns(reportSheet, columnsWithData);
    
    // Add summary rows if available (each key-value pair in columns 1 and 2)
    let headerRowNumber = 1; // Default: header at row 1
    let dataStartRow = 2; // Default: data starts at row 2
    if (summary && Object.keys(summary).length > 0) {
      // Clear any headers that might have been auto-created in row 1 by setupWorksheetColumns
      // (summary rows only use columns 1 and 2, so clear columns 3 onwards)
      const firstRow = reportSheet.getRow(1);
      for (let col = 3; col <= columnsWithData.length + 2; col++) {
        const cell = firstRow.getCell(col);
        cell.value = null;
      }
      
      const summaryRowCount = addEmployeeSummaryRow(reportSheet, summary, excelColumns, columns);
      if (summaryRowCount > 0) {
        // Add blank row after summaries, then header starts after that
        headerRowNumber = summaryRowCount + 2; // +1 for blank row after summaries
        dataStartRow = summaryRowCount + 3; // +1 for blank row, +1 for header row
      }
    }
    
    // Add header row
    addHeaderRow(reportSheet, excelColumns, headerRowNumber);
    
    // Freeze header row
    reportSheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
    
    // Add data rows (starting from dataStartRow)
    addDataRows(reportSheet, rows, columnsWithData, dataStartRow);
    
    // Calculate and apply optimal column widths based on content
    calculateOptimalColumnWidths(reportSheet, columnsWithData, excelColumns, dataStartRow);
    
    // Apply formatting
    applyRowHeights(reportSheet, columnsWithData, dataStartRow, headerRowNumber);
    applyConditionalFormatting(reportSheet, rows?.length);
    
    // Calculate last row for auto-filter
    const lastDataRow = rows?.length + dataStartRow - 1;
    
    // Add auto-filter (starts from header row)
    const headerCol = 'A';
    const lastCol = String.fromCharCode(65 + columnsWithData?.length - 1);
    reportSheet.autoFilter = {
      from: `${headerCol}${headerRowNumber}`,
      to: `${lastCol}${lastDataRow}`
    };
    
    // Add footer information at the end (plain text, no merging)
    addFooterInfo(reportSheet, report, startDate, endDate, lastDataRow);
    
    // Configure print settings: landscape orientation and zero margins
    configurePrintSettings(reportSheet);
    
    // Save file
    await saveExcelFile(workbook, report);
    
  } catch (error) {
    console.error('Error exporting Excel file:', error);
    alert('Error exporting Excel file. Please try again.');
  }
};

export { handleExport };
