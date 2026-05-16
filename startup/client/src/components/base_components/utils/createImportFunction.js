// Generic import function for master components
// Supports Excel (.xlsx, .xls) and CSV files
import { formatDate, parseDateValue } from '@utils/dateTimeUtils';

/**
 * Common per-cell normalization shared by the Excel and CSV branches: date strings parse to
 * YYYY-MM-DD; boolean fields fold yes/no/1/0 to true/false. Returns the original value untouched
 * for non-date/non-boolean fields.
 */
function normalizeImportCellValue(value, field, dateFields, booleanFields) {
  if (dateFields.includes(field)) {
    if (value instanceof Date) {
      value = formatDate(value);
    } else if (typeof value === 'string' && value.trim()) {
      const date = parseDateValue(value);
      if (date && !isNaN(date.getTime())) value = formatDate(date);
    }
  }
  if (booleanFields.includes(field)) {
    const v = String(value ?? '').toLowerCase().trim();
    if (v === 'true' || v === 'yes' || v === '1' || value === true) value = true;
    else if (v === 'false' || v === 'no' || v === '0' || value === false) value = false;
  }
  return value;
}

const createImportFunction = ({
  columns = [], 
  existingData = [], 
  api = {},
  codeField = 'code',
  requiredFields = [],
  uniqueFields = null, // Array of fields to use for composite key matching (e.g., ['employee_code', 'att_date'])
  fetchData,
  fieldTransform = null, // Optional function to transform field names
  dateFields = [], // Fields that should be treated as dates
  booleanFields = [], // Fields that should be treated as booleans
  skipExisting = false, // If true: when a row matches an existing record, skip it (no update/create)
}) => {
  // Match a header label to its column definition by id / label / name / headerName.
  const findColumnByHeader = (headerText) => columns.find(c =>
    c.label === headerText ||
    c.id === headerText ||
    c.name === headerText ||
    c.headerName === headerText
  );

  // Build an ExcelJS column-index → field-id map from a header row.
  const buildExcelHeaderMap = (headerRow) => {
    const map = {};
    headerRow.eachCell((cell, colNumber) => {
      const colDef = findColumnByHeader(String(cell.value || '').trim());
      if (colDef) {
        map[colNumber] = colDef.id;
      }
    });
    return map;
  };

  return async (formData) => {
    try {
      const file = formData instanceof FormData ? formData.get('file') : formData;
      if (!file) {
        return { status: 400, data: { error: 'No file provided' } };
      }

      const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`;
      const isExcel = ['.xlsx', '.xls'].includes(fileExtension);
      const isCSV = fileExtension === '.csv';

      if (!isExcel && !isCSV) {
        return { status: 400, data: { error: 'Invalid file type. Supported: .xlsx, .xls, .csv' } };
      }

      let rows = [];
      let headerToField = {};

      if (isExcel) {
        // Parse Excel file
        const ExcelJS = (await import('exceljs')).default;
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.worksheets[0];

        if (!sheet) {
          return { status: 400, data: { error: 'No worksheet found' } };
        }

        // Try to find headers - first at row 5 (exported format), then at row 1 (simple format)
        let headerRowIndex = 5;
        let dataStartRow = 6;
        headerToField = buildExcelHeaderMap(sheet.getRow(headerRowIndex));

        // Validate required columns at row 5
        let presentFields = Object.values(headerToField);
        let missing = requiredFields.filter(f => !presentFields.includes(f));

        // If headers not found at row 5, try row 1 (simple format)
        if (missing.length > 0 && requiredFields.length > 0) {
          headerRowIndex = 1;
          dataStartRow = 2;
          headerToField = buildExcelHeaderMap(sheet.getRow(headerRowIndex));

          presentFields = Object.values(headerToField);
          missing = requiredFields.filter(f => !presentFields.includes(f));
        }

        // Final validation
        if (missing.length > 0) {
          return { 
            status: 400, 
            data: { error: `Missing required columns: ${missing.join(', ')}` } 
          };
        }

        // Extract data rows
        for (let r = dataStartRow; r <= sheet.rowCount; r++) {
          const row = sheet.getRow(r);
          if (!row || row.cellCount === 0) continue;

          const payload = {};
          row.eachCell((cell, colNumber) => {
            const field = headerToField[colNumber];
            if (!field) return;
            payload[field] = normalizeImportCellValue(cell.value, field, dateFields, booleanFields) ?? null;
          });

          // Skip empty rows
          const hasAny = Object.values(payload).some(v => v !== null && v !== '');
          if (hasAny) {
            rows.push(payload);
          }
        }
      } else if (isCSV) {
        // Parse CSV file
        const Papa = (await import('papaparse')).default;
        
        const text = await file.text();
        const parseResult = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        if (parseResult.errors && parseResult.errors.length > 0) {
          return { 
            status: 400, 
            data: { error: `CSV parsing errors: ${parseResult.errors.map(e => e.message).join(', ')}` } 
          };
        }

        // Build header to field mapping
        const csvHeaders = Object.keys(parseResult.data[0] || {});
        csvHeaders.forEach(header => {
          const colDef = findColumnByHeader(header);
          if (colDef) {
            headerToField[header] = colDef.id;
          }
        });

        // Validate required fields
        const presentFields = Object.values(headerToField);
        const missing = requiredFields.filter(f => !presentFields.includes(f));
        
        if (missing.length > 0) {
          return { 
            status: 400, 
            data: { error: `Missing required columns: ${missing.join(', ')}` } 
          };
        }

        // Convert CSV rows to payloads
        rows = parseResult.data.map(row => {
          const payload = {};
          Object.keys(row).forEach(header => {
            const field = headerToField[header];
            if (!field) return;
            payload[field] = normalizeImportCellValue(row[header], field, dateFields, booleanFields) ?? null;
          });
          return payload;
        }).filter(payload => {
          // Skip empty rows
          return Object.values(payload).some(v => v !== null && v !== '');
        });
      }

      // Apply field transformation if provided
      if (fieldTransform && typeof fieldTransform === 'function') {
        rows = rows.map(row => fieldTransform(row));
      }

      // Helper function to create composite key from uniqueFields or fallback to codeField
      const createKey = (item) => {
        if (uniqueFields && Array.isArray(uniqueFields) && uniqueFields.length > 0) {
          // Create composite key from uniqueFields
          const keyParts = uniqueFields.map(field => {
            const value = item[field];
            // Handle dates - normalize to YYYY-MM-DD format using local time
            if (dateFields.includes(field) && value) {
              if (value instanceof Date) {
                return formatDate(value);
              } else if (typeof value === 'string') {
                const date = parseDateValue(value);
                if (date && !isNaN(date.getTime())) {
                  return formatDate(date);
                }
              }
            }
            return String(value ?? '').trim();
          });
          return keyParts.join('_');
        } else {
          // Fallback to single codeField
          const key = item[codeField];
          return key ? String(key).trim() : null;
        }
      };

      // Build lookup map for existing records
      const existingByKey = new Map();
      if (existingData && Array.isArray(existingData)) {
        existingData.forEach(item => {
          const key = createKey(item);
          if (key) {
            existingByKey.set(key, item);
          }
        });
      }

      // Process rows
      const createFunction = api.create;
      const updateFunction = api.update;
      
      if (!createFunction || typeof createFunction !== 'function') {
        return { 
          status: 400, 
          data: { error: 'Create function not provided in API' } 
        };
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let duplicatesInFile = 0;
      const seenInFile = new Set();
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const payload = rows[i];
        const rowNumber = i + 2; // Account for header row

        // Validate required fields (treat 0 / false as present; only null/undefined/'' are missing)
        const missingFields = requiredFields.filter(f => {
          const v = payload[f];
          return v === null || v === undefined || String(v).trim() === '';
        });
        if (missingFields.length > 0) {
          const keyField = uniqueFields && uniqueFields.length > 0 ? uniqueFields[0] : codeField;
          errors.push({
            row: rowNumber,
            [keyField]: payload[keyField] || 'N/A',
            error: `Missing required fields: ${missingFields.join(', ')}`
          });
          skipped += 1;
          continue;
        }

        // Get the key for matching (composite key if uniqueFields provided, otherwise codeField)
        const key = createKey(payload);
        if (!key) {
          const keyField = uniqueFields && uniqueFields.length > 0 ? uniqueFields[0] : codeField;
          const keyFieldLabel = uniqueFields && uniqueFields.length > 0 ? uniqueFields.join(' + ') : codeField;
          errors.push({
            row: rowNumber,
            [keyField]: 'N/A',
            error: `${keyFieldLabel} is required but missing`
          });
          skipped += 1;
          continue;
        }

        // Check for duplicates in file
        if (seenInFile.has(key)) {
          duplicatesInFile += 1;
          continue;
        }
        seenInFile.add(key);

        try {
          const existing = existingByKey.get(key);

          // Create-only mode: skip rows that already exist
          if (skipExisting && existing?.id) {
            skipped += 1;
            continue;
          }
          
          if (existing?.id && skipExisting) {
            // Skip existing record when configured (useful for immutable/approved records)
            skipped += 1;
          } else if (existing?.id && updateFunction && typeof updateFunction === 'function') {
            // Update existing record
            const updatePayload = { ...existing, ...payload };
            await updateFunction(existing.id, updatePayload);
            updated += 1;
          } else {
            // Create new record
            await createFunction(payload);
            created += 1;
          }
        } catch (error) {
          const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
          const keyField = uniqueFields && uniqueFields.length > 0 ? uniqueFields[0] : codeField;
          errors.push({
            row: rowNumber,
            [keyField]: uniqueFields && uniqueFields.length > 0 ? payload[uniqueFields[0]] || 'N/A' : key,
            error: errorMessage
          });
          skipped += 1;
        }
      }

      // Refresh data if fetchData is provided
      if (fetchData && typeof fetchData === 'function') {
        await fetchData();
      }

      const message = `Imported: ${created} created, ${updated} updated, ${duplicatesInFile} duplicates skipped, ${skipped} rows skipped${errors.length > 0 ? `, ${errors.length} errors` : ''}`;

      return {
        status: errors.length === rows.length ? 400 : 200,
        data: {
          message,
          created,
          updated,
          skipped,
          duplicates: duplicatesInFile,
          errors: errors.length > 0 ? errors : undefined
        }
      };
    } catch (error) {
      return {
        status: 500,
        data: { error: error?.message || 'Import failed' }
      };
    }
  };
};

export { createImportFunction };

