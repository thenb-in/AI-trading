const XLSX = require('xlsx');
const Papa = require('papaparse');
const path = require('path');
const fs = require('fs');

/**
 * Detect duplicate headers in the first line of CSV and log which ones are duplicated (column indices 1-based).
 * Does not modify headers; PapaParse will still rename them. Call before Papa.parse for user intimation.
 * @param {string} sheetName - Name of the sheet (for the log message)
 * @param {string} csv - Full CSV string; only the first line is used for headers
 */
function logDuplicateHeadersIfAny(sheetName, csv) {
  const firstLine = csv.split('\n')[0];
  if (!firstLine) return;
  const raw = firstLine.split(',').map((h) => h.trim());
  const headers = raw.map((h) =>
    h.length >= 2 && h[0] === '"' && h[h.length - 1] === '"' ? h.slice(1, -1) : h
  );
  const byName = new Map();
  headers.forEach((name, index) => {
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(index + 1);
  });
  const duplicates = [];
  byName.forEach((indices, name) => {
    if (indices.length > 1) duplicates.push({ name, columns: indices });
  });
  if (duplicates.length > 0) {
    const msg = duplicates
      .map((d) => `"${d.name}" (column indices: ${d.columns.join(', ')})`)
      .join('; ');
    console.error(`[parseExcel] Duplicate headers in sheet "${sheetName}": ${msg}. PapaParse will rename them.`);
  }
}

// Import date utilities (using require since this is CommonJS)
let dateUtils;
try {
  dateUtils = require('../helpers/dateUtils.ts');
} catch {
  // Fallback if import fails
  dateUtils = {
    getCurrentLocalTimestamp: () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }
  };
}

/**
 * Parse Excel file and extract data from Timetable, Txns1 and Txns2 sheets
 * Uses xlsx to read Excel file and convert sheets to CSV format
 * Then uses PapaParse to parse the CSV data
 * Finds unique combinations of "Shift name" and "Compound shift" from both Txns1 and Txns2 sheets
 * Creates employee codes for each unique combination
 * Returns arrays of objects with headers as keys (PapaParse format)
 */
function parseExcelFile(filePath) {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Read the Excel workbook
  const workbook = XLSX.readFile(filePath);

  // Get sheet names
  const sheetNames = workbook.SheetNames;
  console.log('Available sheets:', sheetNames);

  // Initialize arrays for storing parsed data
  const timetable = parseTimetable(workbook);
  // const txns = parseTxns1(workbook);
  let txns = parseTxns1(workbook);
  txns = [];
  const txns2 = parseTxns2(workbook);

  return {
    timetable,
    txns,
    txns2,
  };
}

function parseTimetable(workbook) {
  const timetable = [];
  // Parse Timetable sheet using PapaParse
  if (workbook.Sheets['Timetable']) {
    const timetableSheet = workbook.Sheets['Timetable'];
    // Convert Excel sheet to CSV format
    const timetableCSV = XLSX.utils.sheet_to_csv(timetableSheet);
    logDuplicateHeadersIfAny('Timetable', timetableCSV);

    // Use PapaParse to parse the CSV
    const parseResult = Papa.parse(timetableCSV, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn('PapaParse warnings for Timetable sheet:', parseResult.errors);
    }

    // Push all rows into timetable array
    timetable.push(...parseResult.data);
    console.log(`Parsed ${timetable.length} rows from Timetable sheet using PapaParse`);
  } else {
    console.warn('Warning: Timetable sheet not found in Excel file');
  }
  return timetable;
}

function parseTxns1(workbook) {
  const txns = [];
  // Parse Txns1 sheet using PapaParse
  if (workbook.Sheets['Txns1']) {
    const txnsSheet = workbook.Sheets['Txns1'];
    // Convert Excel sheet to CSV format
    const txnsCSV = XLSX.utils.sheet_to_csv(txnsSheet);
    logDuplicateHeadersIfAny('Txns1', txnsCSV);

    // Use PapaParse to parse the CSV
    const parseResult = Papa.parse(txnsCSV, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn('PapaParse warnings for Txns1 sheet:', parseResult.errors);
    }

    // Push all rows into txns array
    txns.push(...parseResult.data);
    console.log(`Parsed ${txns.length} rows from Txns1 sheet using PapaParse`);
  } else {
    console.warn('Warning: Txns1 sheet not found in Excel file');
  }
  return txns;
}

function parseTxns2(workbook) {
  const txns2 = [];
  if (workbook.Sheets['Txns2']) {
    const txns2Sheet = workbook.Sheets['Txns2'];
    // Convert Excel sheet to CSV format
    const txns2CSV = XLSX.utils.sheet_to_csv(txns2Sheet);
    logDuplicateHeadersIfAny('Txns2', txns2CSV);

    // Use PapaParse to parse the CSV
    const parseResult = Papa.parse(txns2CSV, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn('PapaParse warnings for Txns2 sheet:', parseResult.errors);
    }

    // Push all rows into txns2 array
    txns2.push(...parseResult.data);
    console.log(`Parsed ${txns2.length} rows from Txns2 sheet using PapaParse`);
  } else {
    console.warn('Warning: Txns2 sheet not found in Excel file');
  }
  return txns2;
}

// Main execution
if (require.main === module) {
  // Get the Excel file path (assuming it's in the same directory)
  const excelFilePath = path.join(__dirname, 'att-test.xlsx');

  try {
    const result = parseExcelFile(excelFilePath);

    console.log('\n=== Parsing Results ===');
    console.log(`Timetable rows: ${result.timetable.length}`);
    console.log(`Txns1 rows: ${result.txns.length} (commented out)`);
    console.log(`Txns2 rows: ${result.txns2.length}`);

    // Display first row of each sheet as sample
    if (result.timetable.length > 0) {
      console.log('\nSample Timetable row:');
      console.log(JSON.stringify(result.timetable[0], null, 2));
    }

    // Txns1 sample commented out
  
    if (result.txns.length > 0) {
      console.log('\nSample Txns1 row:');
      console.log(JSON.stringify(result.txns[0], null, 2));
    }
    

    if (result.txns2.length > 0) {
      console.log('\nSample Txns2 row:');
      console.log(JSON.stringify(result.txns2[0], null, 2));
    }

    // Loop through Txns2 and find unique combinations of "Shift name" and "Compound shift"
    console.log('\n=== Finding Unique Shift Name and Compound Shift Combinations from Txns2 ===');
    const uniqueCombinations = new Set();
    const combinationDetails = [];

    // Use only txns2 array (txns1 commented out)
    const combinedTxns = [...result.txns, ...result.txns2];

    combinedTxns.forEach((row) => {
      // Check if row has both "Shift name" and "Compound shift" keys
      if ('Shift name' in row && 'Compound shift' in row) {
        const shiftName = String(row['Shift name'] || '').trim();
        const compoundShift = String(row['Compound shift'] || '').trim();

        // Check if both have data (non-empty)
        if (shiftName && compoundShift) {
          // Create a unique key for the combination
          const combinationKey = `${shiftName}|||${compoundShift}`;

          // If this combination hasn't been seen before, add it
          if (!uniqueCombinations.has(combinationKey)) {
            uniqueCombinations.add(combinationKey);
            combinationDetails.push({
              'Shift name': shiftName,
              'Compound shift': compoundShift,
            });
          }
        }
      }
    });

    console.log(`\nFound ${combinationDetails.length} unique combinations:`);
    combinationDetails.forEach((combo, index) => {
      console.log(`${index + 1}. Shift name: "${combo['Shift name']}" | Compound shift: "${combo['Compound shift']}"`);
    });

    // Create empyeetobecrete array with emp_code for each unique combination
    console.log('\n=== Creating Employee Codes for Unique Combinations ===');
    const empyeetobecrete = [];

    combinationDetails.forEach((combo) => {
      // Generate timestamp in format: YYYYMMDDHHmmss using local timezone
      const timestamp = dateUtils.getCurrentLocalTimestamp();

      // Create emp_code: EMP-timestamp-Shift name + Compound shift
      const shiftName = combo['Shift name'];
      const compoundShift = combo['Compound shift'];
      const empCode = `EMP-${timestamp}:${shiftName}:${compoundShift}`;

      empyeetobecrete.push({
        emp_code: empCode,
      });
    });

    console.log(`\nCreated ${empyeetobecrete.length} employee codes:`);
    empyeetobecrete.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.emp_code}`);
    });

    console.log('\n=== empyeetobecrete Array ===');
    console.log(JSON.stringify(empyeetobecrete, null, 2));

    // Export the arrays (can be used by other modules)
    module.exports.timetable = result.timetable;
    module.exports.txns = result.txns;
    module.exports.txns2 = result.txns2;
    module.exports.empyeetobecrete = empyeetobecrete;
  } catch (error) {
    console.error('Failed to parse Excel file:', error);
    process.exit(1);
  }
}

// Export the function for use in other modules
module.exports = {
  parseExcelFile,
  timetable: [],
  txns: [],
  txns2: [],
  empyeetobecrete: [],
};

