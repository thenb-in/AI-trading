const cellToText = (value) => {
  if (value === null || value === undefined) return '';
  let text;
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) text = value.richText.map((t) => t.text).join('');
    else if (value.text !== undefined) text = value.text;
    else if (value.result !== undefined) text = value.result;
    else text = '';
  } else {
    text = value;
  }
  return String(text).replace(/<[^>]*>/g, '').trim();
};

// Read an uploaded file into a 0-indexed 2D grid of RAW cell values. Excel cells keep their
// native type (string / number / Date / rich-text object); CSV cells are raw strings.
// Returns: grid (array of rows) | null (empty/no sheet) | undefined (unsupported type).
const importParsingEngine = async (file) => {
  const ext = `.${(file.name.split('.').pop() || '').toLowerCase()}`;

  if (['.xlsx', '.xls'].includes(ext)) {
    const ExcelJS = (await import('exceljs')).default;
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return null;
    const colCount = sheet.columnCount || 0;
    const grid = [];
    for (let r = 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const cells = [];
      for (let c = 1; c <= colCount; c++) cells.push(row.getCell(c).value);
      grid.push(cells);
    }
    return grid;
  }

  if (ext === '.csv') {
    const Papa = (await import('papaparse')).default;
    const text = await file.text();
    const result = Papa.parse(text, { skipEmptyLines: false });
    return (result.data || []).map((row) => (Array.isArray(row) ? row : []));
  }

  return undefined;
};


const findHeaderRow = (grid, detect, limit = 15) => {
  const scanLimit = Math.min(grid.length, limit);
  for (let r = 0; r < scanLimit; r++) {
    if (detect(grid[r], r)) return { rowIndex: r, cells: grid[r] };
  }
  return null;
};

// Footer row written by report exporters (Report / Date / Filters in cols A–C). Used as the
// default stop-row for parseImportedExcelFile so the metadata footer isn't read as data.
const isExportFooterCells = (cells = []) =>
  (cells[0] || '').includes('Report:') &&
  (cells[1] || '').includes('Date:') &&
  (cells[2] || '').includes('Filters:');


const parseImportedExcelFile = async (file, detect, { stopAt = isExportFooterCells, limit = 15 } = {}) => {
  const rawGrid = await importParsingEngine(file);
  if (rawGrid === undefined) return { error: 'Unsupported file type. Please upload a .xlsx, .xls or .csv file.' };
  if (!rawGrid || rawGrid.length === 0) return { error: 'No data rows were found in the uploaded file.' };

  const grid = rawGrid.map((row) => row.map(cellToText));
  const header = findHeaderRow(grid, detect, limit);
  if (!header) return { error: 'Could not find a matching header row in the file.' };

  const rows = [];
  for (let r = header.rowIndex + 1; r < grid.length; r++) {
    const cells = grid[r];
    if (!cells || cells.every((c) => c === '')) continue; // skip blank rows
    if (stopAt && stopAt(cells, r)) break;                // stop at footer / end of data
    rows.push(cells);
  }

  return { columns: header.cells, rows };
};

export { cellToText, importParsingEngine, findHeaderRow, isExportFooterCells, parseImportedExcelFile };
