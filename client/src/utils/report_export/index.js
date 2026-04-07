// ===== MAIN EXPORT FUNCTION =====

import { extractDateRangeFromUrl } from './formattingUtils.js';
import {
  createWorkbook,
  setupWorksheetColumns,
  addTitleRow,
  addSubtitleRows,
  addHeaderRow,
  addDataRows,
  applyRowHeights,
  applyConditionalFormatting,
  saveExcelFile
} from './excelRenderer.js';


const handleExport = async (report, rows, columns, currentUrl, employeeSummary = null) => {
  console.log("Exporting...");
  console.log("Rows:", rows);
  console.log("Columns:", columns);
  console.log("Current URL:", currentUrl);
  console.log("Employee Summary:", employeeSummary);
  
  if (!rows || rows?.length === 0) {
    alert("No data available to export");
    return;
  }

  try {
    // Extract date range from URL
    const { startDate, endDate } = extractDateRangeFromUrl(currentUrl);
    
    // Create workbook and worksheet
    const workbook = createWorkbook();
    const reportSheet = workbook.addWorksheet("Report Data");
    
    // Setup columns
    const excelColumns = setupWorksheetColumns(reportSheet, columns);
    console.log('handleExport: excelColumns after setup:', excelColumns);
    
    if (!excelColumns || excelColumns.length === 0) {
      console.error('handleExport: No excelColumns after setup, columns input was:', columns);
      alert('Error: No columns available for export');
      return;
    }
    
    // Add title and subtitle rows (returns header row number)
    addTitleRow(reportSheet, report, columns?.length);
    const headerRowNumber = addSubtitleRows(reportSheet, report, columns?.length, rows?.length, startDate, endDate, employeeSummary);
    console.log('handleExport: headerRowNumber:', headerRowNumber);
    
    // Add header row
    addHeaderRow(reportSheet, excelColumns, headerRowNumber);
    
    // Verify header row was set
    const headerRow = reportSheet.getRow(headerRowNumber);
    console.log('handleExport: Verifying header row', headerRowNumber, ':', headerRow.values);
    
    // Freeze header row
    reportSheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
    
    // Add data rows (start after header row)
    const dataStartRow = headerRowNumber + 1;
    addDataRows(reportSheet, rows, columns, dataStartRow);
    
    // Apply formatting
    applyRowHeights(reportSheet, columns, headerRowNumber);
    applyConditionalFormatting(reportSheet, rows?.length, headerRowNumber);
    
    // Add auto-filter
    const lastDataRow = rows?.length + headerRowNumber;
    reportSheet.autoFilter = {
      from: `A${headerRowNumber}`,
      to: `${String.fromCharCode(65 + columns?.length - 1)}${lastDataRow}`
    };
    
    // Save file
    await saveExcelFile(workbook, report, employeeSummary);
    
  } catch (error) {
    console.error('Error exporting Excel file:', error);
    alert('Error exporting Excel file. Please try again.');
  }
};

export { handleExport };
