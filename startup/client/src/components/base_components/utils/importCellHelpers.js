// Primitives shared by the spreadsheet-import paths (createImportFunction,
// importMasterFromExcel, importParsingEngine). Each is a single meaningful
// operation on an uploaded file / cell, not just incidentally-shared lines.

/**
 * Fold a spreadsheet cell to a real boolean. Accepts the common textual truthy/
 * falsy spellings people type into Excel/CSV (yes/no, true/false, 1/0) in any
 * case, plus actual booleans. Returns the coerced boolean when the value maps
 * cleanly; otherwise returns the value untouched so non-boolean cells pass
 * through unchanged.
 */
function coerceBooleanCell(value) {
  const v = String(value ?? '').toLowerCase().trim();
  if (v === 'true' || v === 'yes' || v === '1' || value === true) return true;
  if (v === 'false' || v === 'no' || v === '0' || value === false) return false;
  return value;
}

/**
 * Load the first worksheet from an uploaded Excel file (.xlsx/.xls). ExcelJS is
 * imported lazily so it stays out of the initial bundle. Returns the worksheet,
 * or null when the workbook has no sheets.
 */
async function loadFirstWorksheet(file) {
  const ExcelJS = (await import('exceljs')).default;
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.worksheets[0] || null;
}

export { coerceBooleanCell, loadFirstWorksheet };
