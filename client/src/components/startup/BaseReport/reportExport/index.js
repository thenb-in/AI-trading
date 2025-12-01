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


const handleExport = async (report, rows, columns, currentUrl) => {
  console.log("Exporting...");
  console.log("Rows:", rows);
  console.log("Columns:", columns);
  console.log("Current URL:", currentUrl);
  
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
    
    // Add title and subtitle rows
    addTitleRow(reportSheet, report, columns?.length);
    addSubtitleRows(reportSheet, report, columns?.length,rows?.length, startDate, endDate);
    
    // Add header row
    addHeaderRow(reportSheet, excelColumns);
    
    // Freeze header row
    reportSheet.views = [{ state: "frozen", ySplit: 5 }];
    
    // Add data rows
    addDataRows(reportSheet, rows, columns);
    
    // Apply formatting
    applyRowHeights(reportSheet);
    applyConditionalFormatting(reportSheet, rows?.length, columns?.length);
    
    // Add auto-filter
    reportSheet.autoFilter = {
      from: 'A5',
      to: `${String.fromCharCode(65 + columns?.length - 1)}${rows?.length + 5}`
    };
    
    // Save file
    await saveExcelFile(workbook, report);
    
  } catch (error) {
    console.error('Error exporting Excel file:', error);
    alert('Error exporting Excel file. Please try again.');
  }
};

export { handleExport };
