// ===== FORMATTING UTILITIES =====

import { convertCellToText } from '../ReportUtils.js';
import { getColumnForFormatting, toValidNumber } from '../../nbnext_data_grid/utils/helpers.js';
import { parseDateValue, convertToISOString } from '@utils/dateTimeUtils';

/**
 * Format cell value based on column type (legacy path — prefer getExportDisplayString for new code)
 */
const formatCellValue = (value, columnType) => {
  try {
    switch (columnType) {
      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'date': {
        const date = parseDateValue(value);
        if (date) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
          });
        }
        break;
      }

      case 'datetime': {
        const dateTime = parseDateValue(value);
        if (dateTime) {
          return dateTime.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
        break;
      }

      case 'time': {
        const time = parseDateValue(value);
        if (time) {
          return time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
        break;
      }

      case 'number': {
        const num = toValidNumber(value);
        if (typeof num === 'number' && !Number.isNaN(num)) {
          return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
        return value;
      }

      case 'html':
        if (typeof value === 'string' && value.includes('<')) {
          const textMatch = value.match(/>([^<]+)</);
          if (textMatch && textMatch[1]) {
            return textMatch[1].replace(/[*✓]/g, '').trim();
          }
          return value.replace(/<[^>]*>/g, '').trim();
        }
        return value;

      case 'string':
        return value;

      case 'duration': {
        const duration = parseFloat(value) / 3600;
        const decimalPart = ((duration % 1) * 60) / 100;
        const integerPart = Math.floor(duration);
        const time_duration = integerPart + decimalPart;
        if (!isNaN(time_duration)) {
          return time_duration.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
        break;
      }

      default:
        return value;
    }
  } catch {
    // Keep original value if formatting fails
  }

  return value;
};

/**
 * Get column width based on type
 */
const getColumnWidth = (columnType) => {
  switch (columnType) {
    case 'date':
    case 'time':
    case 'datetime':
      return 32;
    case 'number':
      return 15;
    default:
      return 32;
  }
};

/**
 * Extract date range from URL
 */
const extractDateRangeFromUrl = (currentUrl) => {
  let startDate = '';
  let endDate = '';

  if (currentUrl) {
    try {
      const url = new URL(currentUrl);
      const params = new URLSearchParams(url.search);
      startDate = params.get('start_date') || '';
      endDate = params.get('end_date') || '';
    } catch {
      // Ignore URL parse errors
    }
  }

  return { startDate, endDate };
};

/**
 * Get date range display text
 */
const getDateRangeText = (startDate, endDate) => {
  if (startDate && endDate) {
    return `📅 Date Range: ${startDate} to ${endDate}`;
  } else if (startDate) {
    return `📅 Start Date: ${startDate}`;
  } else if (endDate) {
    return `📅 End Date: ${endDate}`;
  } else {
    return `📅 Date Range: Not specified`;
  }
};

/**
 * Raw cell value for a column (matches grid data source before valueGetter / formatting).
 */
const getRawCellValue = (row, col) => {
  const fieldKey = col.field || col.key;
  const exportField = col.export;
  let value = null;

  if (exportField && exportField !== fieldKey) {
    value = row[exportField];

    // If export field value is missing and column type is html, extract text from main field
    if ((value === undefined || value === null || value === '') && col.type === 'html') {
      const mainFieldValue = row[fieldKey];
      if (typeof mainFieldValue === 'string' && mainFieldValue.includes('<')) {
        const textMatch = mainFieldValue.match(/>([^<]+)</);
        if (textMatch && textMatch[1]) {
          value = textMatch[1].replace(/[*✓]/g, '').trim();
        } else {
          value = mainFieldValue.replace(/<[^>]*>/g, '').trim();
        }
      } else {
        value = mainFieldValue;
      }
    }
  }

  if (value === undefined || value === null) {
    value = row[fieldKey] ?? row[col.name];
  }

  return value === undefined || value === '' ? null : value;
};

/**
 * Plain text for Excel for HTML columns (grid renders HTML; Excel should not store tags).
 */
const htmlToPlainTextForExcel = (htmlString) => {
  if (typeof htmlString !== 'string' || !htmlString.trim()) {
    return '';
  }
  if (htmlString.includes('<')) {
    const textMatch = htmlString.match(/>([^<]+)</);
    if (textMatch && textMatch[1]) {
      return textMatch[1].replace(/[*✓]/g, '').trim();
    }
    return htmlString.replace(/<[^>]*>/g, '').trim();
  }
  return htmlString.trim();
};

/**
 * Display string for Excel: same pipeline as the grid (convertCellToText), except HTML is plain text.
 * Optional column.getExportValue({ row, field }) overrides when a custom renderCell cannot be mirrored.
 */
const getExportDisplayString = (col, row) => {
  const formatCol = getColumnForFormatting(col);

  if (typeof col.getExportValue === 'function') {
    try {
      const v = col.getExportValue({ row, field: col.field });
      if (v !== undefined && v !== null && v !== '') {
        return String(v);
      }
    } catch {
      // Silently fall through to default handling
    }
  }

  if (formatCol.type === 'html') {
    const raw = getRawCellValue(row, col);
    if (raw == null || raw === '') {
      return '';
    }
    return htmlToPlainTextForExcel(typeof raw === 'string' ? raw : String(raw));
  }

  let rawValue;
  if (typeof col.valueGetter === 'function') {
    rawValue = col.valueGetter({ row, field: col.field });
  } else {
    rawValue = getRawCellValue(row, col);
  }

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return '';
  }

  const text = convertCellToText(formatCol, rawValue);
  return text === '-' ? '' : text;
};

/**
 * Map row data to match column keys (raw values; used where display strings are not needed)
 */
const mapRowData = (row, columns) => {
  const mappedRow = {};
  columns?.forEach((col) => {
    const fieldKey = col.field || col.key;
    mappedRow[fieldKey] = getRawCellValue(row, col);
  });
  return mappedRow;
};

/**
 * Generate filename for export
 */
const generateFileName = (report) => {
  const timestamp = convertToISOString(new Date()).slice(0, 19).replace(/:/g, '-');
  const reportName = report.slug?.replace(/[^a-zA-Z0-9]/g, '_') || 'report';
  return `${reportName}_export_${timestamp}.xlsx`;
};

export {
  formatCellValue,
  getColumnWidth,
  extractDateRangeFromUrl,
  getDateRangeText,
  mapRowData,
  getRawCellValue,
  getExportDisplayString,
  htmlToPlainTextForExcel,
  generateFileName
};
