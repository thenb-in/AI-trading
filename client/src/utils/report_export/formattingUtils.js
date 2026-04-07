// TODO: consolidate with src/components/startup/BaseReport/reportExport/formattingUtils.js
// ===== FORMATTING UTILITIES =====

/**
 * Format cell value based on column type
 */
const formatCellValue = (value, columnType) => {
  // console.log('columnType',columnType,'value',value)
  // if (!value) return null;

  try {
    switch (columnType) {
      case 'boolean': {
        console.log(value)
        return value ? 'Yes' : 'No';
      }
      case 'date': {
        const date = new Date(value);
        if (!isNaN(date)) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
          });
        }
        break;
      }
      
      case 'datetime': {
        const dateTime = new Date(value);
        if (!isNaN(dateTime)) {
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
        const time = new Date(value);
        if (!isNaN(time)) {
          return time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
        break;
      }
      
      case 'number': {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
        break;
      }
      
      case 'html':
      case 'string':
        return value;

      case 'duration': {
        const duration = parseFloat(value) / 3600;
        // get the decimal part
        const decimalPart = (duration % 1) * 60/100;
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
        console.log('formatCellValue: default', value, columnType);
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
    } catch (e) {
      console.log('Error parsing URL:', e);
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
 * Map row data to match column keys
 */
const mapRowData = (row, columns) => {
  const mappedRow = {};
  columns?.forEach(col => {
    const fieldKey = col.field || col.key;
    
    // Use nullish coalescing (??) instead of || 
    // so false/0 are preserved
    const value = row[fieldKey] ?? row[col.name];

    // Convert only undefined or empty string to null
    mappedRow[fieldKey] = (value === undefined || value === '') ? null : value;
  });
  return mappedRow;
};


/**
 * Get current date and time formatted
 */
const getCurrentDateTime = () => {
  const reportDate = new Date().toLocaleDateString("en-US", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
  const reportTime = new Date().toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit", 
    second: "2-digit" 
  });
  
  return { reportDate, reportTime };
};

/**
 * Generate filename for export
 */
const generateFileName = (report, employeeSummary = null) => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const reportName = report.slug?.replace(/[^a-zA-Z0-9]/g, '_') || 'report';
  
  // Add employee name to filename if employee summary is present
  if (employeeSummary && employeeSummary.first_name) {
    const employeeName = employeeSummary.first_name.replace(/[^a-zA-Z0-9]/g, '_');
    return `${employeeName}_${reportName}_export_${timestamp}.xlsx`;
  }
  
  return `${reportName}_export_${timestamp}.xlsx`;
};

export { formatCellValue, getColumnWidth, extractDateRangeFromUrl, getDateRangeText, mapRowData, getCurrentDateTime, generateFileName };
