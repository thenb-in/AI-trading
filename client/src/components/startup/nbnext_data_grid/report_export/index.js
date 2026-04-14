// ===== MAIN EXPORT FUNCTION =====

import { extractDateRangeFromUrl } from './formattingUtils.js';
import {
  createWorkbook,
  setupWorksheetColumns,
  addHeaderRow,
  addEmployeeSummaryRow,
  addDataRows,
  addTotalRow,
  applyRowHeights,
  applyConditionalFormatting,
  saveExcelFile,
  calculateOptimalColumnWidths,
  configurePrintSettings,
  filterEmptyColumns,
  addFooterInfo
} from './excelRenderer.js';
import { detectConstantColumns, constantColumnsToSummary } from '../utils/constantColumnsUtils.js';

// Excel caps worksheet names at 31 chars and forbids a small set of symbols.
const sanitizeSheetName = (name, fallback = 'Sheet') => {
  const cleaned = String(name || fallback)
    .replace(/[\\/?*[\]:]/g, ' ')
    .trim()
    .slice(0, 31);
  return cleaned || fallback;
};

// Ensure unique sheet names inside a workbook (Excel rejects duplicates).
const uniqueSheetName = (workbook, desired) => {
  const base = sanitizeSheetName(desired);
  let candidate = base;
  let suffix = 2;
  while (workbook.getWorksheet(candidate)) {
    const suffixStr = ` (${suffix})`;
    candidate = `${base.slice(0, 31 - suffixStr.length)}${suffixStr}`;
    suffix += 1;
  }
  return candidate;
};

// Populates a single worksheet on an existing workbook. Extracted from the
// original handleExport so both single-sheet and multi-sheet export can share
// the rendering pipeline.
const populateReportSheet = (
  workbook,
  sheetName,
  report,
  rows,
  columns,
  { startDate, endDate },
  summary = {},
  constantColumns = null,
  totalRow = null
) => {
  const hasProvidedConstantColumns = constantColumns instanceof Map && constantColumns.size > 0;

  let constantColumnsMap = hasProvidedConstantColumns ? constantColumns : new Map();
  let columnsWithoutConstants = columns || [];

  if (hasProvidedConstantColumns) {
    columnsWithoutConstants = (columns || []).filter((col) => {
      const field = col?.field || col?.key;
      return !field || !constantColumnsMap.has(field);
    });
  } else {
    const detected = detectConstantColumns(rows, columns);
    constantColumnsMap = detected.constantColumns;
    columnsWithoutConstants = detected.filteredColumns;
  }

  const constantColumnsSummary = constantColumnsToSummary(constantColumnsMap);
  const mergedSummary = { ...summary, ...constantColumnsSummary };

  const columnsWithData = filterEmptyColumns(columnsWithoutConstants, rows);

  const reportSheet = workbook.addWorksheet(uniqueSheetName(workbook, sheetName));
  const excelColumns = setupWorksheetColumns(reportSheet, columnsWithData);

  let headerRowNumber = 1;
  let dataStartRow = 2;
  if (mergedSummary && Object.keys(mergedSummary).length > 0) {
    const firstRow = reportSheet.getRow(1);
    for (let col = 3; col <= columnsWithData.length + 2; col++) {
      const cell = firstRow.getCell(col);
      cell.value = null;
    }

    const summaryRowCount = addEmployeeSummaryRow(reportSheet, mergedSummary, excelColumns, columns);
    if (summaryRowCount > 0) {
      headerRowNumber = summaryRowCount + 2;
      dataStartRow = summaryRowCount + 3;
    }
  }

  addHeaderRow(reportSheet, excelColumns, headerRowNumber);

  reportSheet.views = [{ state: "frozen", ySplit: headerRowNumber }];

  addDataRows(reportSheet, rows, columnsWithData, dataStartRow);

  if (totalRow && typeof totalRow === 'object' && Object.keys(totalRow).length > 0) {
    addTotalRow(reportSheet, totalRow, columnsWithData, dataStartRow + rows.length);
  }

  calculateOptimalColumnWidths(reportSheet, columnsWithData, excelColumns, dataStartRow);

  applyRowHeights(reportSheet, columnsWithData, dataStartRow, headerRowNumber);
  applyConditionalFormatting();

  const totalRowCount = totalRow && Object.keys(totalRow).length > 0 ? 1 : 0;
  const lastDataRow = rows?.length + dataStartRow - 1 + totalRowCount;

  const headerCol = 'A';
  const lastCol = String.fromCharCode(65 + columnsWithData?.length - 1);
  reportSheet.autoFilter = {
    from: `${headerCol}${headerRowNumber}`,
    to: `${lastCol}${lastDataRow}`
  };

  addFooterInfo(reportSheet, report, startDate, endDate, lastDataRow);
  configurePrintSettings(reportSheet);

  return reportSheet;
};

const handleExport = async (report, rows, columns, currentUrl, summary = {}, constantColumns = null, totalRow = null) => {
  if (!rows || rows?.length === 0) {
    alert("No data available to export");
    return;
  }

  try {
    const dateRange = extractDateRangeFromUrl(currentUrl);
    const workbook = createWorkbook();

    populateReportSheet(
      workbook,
      "Report Data",
      report,
      rows,
      columns,
      dateRange,
      summary,
      constantColumns,
      totalRow
    );

    await saveExcelFile(workbook, report);
  } catch (error) {
    alert('Error exporting Excel file. Please try again.');
    throw error;
  }
};

// Multi-sheet export: one sheet per entry in `sheets`. Each sheet entry has the
// same shape as the positional args to `handleExport` (rows, columns, summary,
// constantColumns, totalRow), plus a sheet `name`. Used by the grid when the
// user exports a tabs-enabled report — each tab becomes its own sheet.
const handleMultiSheetExport = async ({ report, sheets, currentUrl }) => {
  const usable = (sheets || []).filter((s) => s && Array.isArray(s.rows) && s.rows.length > 0);
  if (usable.length === 0) {
    alert("No data available to export");
    return;
  }

  try {
    const dateRange = extractDateRangeFromUrl(currentUrl);
    const workbook = createWorkbook();

    usable.forEach((sheet, index) => {
      populateReportSheet(
        workbook,
        sheet.name || `Sheet ${index + 1}`,
        report,
        sheet.rows,
        sheet.columns || [],
        dateRange,
        sheet.summary || {},
        sheet.constantColumns || null,
        sheet.totalRow || null
      );
    });

    await saveExcelFile(workbook, report);
  } catch (error) {
    alert('Error exporting Excel file. Please try again.');
    throw error;
  }
};

export { handleExport, handleMultiSheetExport };
