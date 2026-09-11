import { toast } from "react-toastify";
import { writeFilterValuesToParams } from "@startup/components/base_filter/filter/helpers";
import { sanitizeHTML, formatDate, formatDateTime, formatTime, formatDuration, formatDurationJson } from "@utils/formattingUtils";
import { parseDateValue } from "@utils/dateTimeUtils";
import { toValidNumber } from "@utils/toValidNumber";

const convertCellToText = (cell, rawValue) => {
  if (rawValue === undefined || rawValue === null) {
    rawValue = cell.value;
  }
  // Check for undefined/null explicitly (not falsy) to handle 0 and false values correctly
  if (rawValue === undefined || rawValue === null){
    return "-";
  } else if (isJson(rawValue)) {
    return formatDurationJson(rawValue);
  }

  switch (cell.type) {
    case 'html':
      return String(rawValue).replace(/\n/g, '<br>');
    case 'date':
      return formatDate(rawValue);
    case "datetime":
      return formatDateTime(rawValue);
    case "time":
      return formatTime(rawValue);
    case 'duration':
      // Early return for zero or falsy values to avoid unnecessary processing
      if (!rawValue || rawValue === 0 || (typeof rawValue === 'object' && rawValue !== null && !rawValue.hours && !rawValue.minutes)) {
        return '';
      }
      return formatDuration(rawValue);
    case 'boolean':
      return String(rawValue);
    case 'number': {
      return toValidNumber(rawValue);
    }
    case 'currency':
      return `$${Number(rawValue).toFixed(2)}`;
    case 'status':
      return rawValue;
    case 'string':
      return rawValue;
    default:
      return sanitizeHTML(String(rawValue));
  }
}
function isJson(object) {
  // if obj is string, parse it
  if (typeof object === 'string' && object.includes('{')) {
    try {
      JSON.parse(object);
      return true;
    } catch (e) {
      console.error('ReportUtils: Error parsing JSON string', {
        object: typeof object === 'string' ? object.substring(0, 100) : object,
        error: e.message,
      });
      return false;
    }
  } else if (typeof object === 'object' &&
    !Array.isArray(object) &&
    Object.prototype.toString.call(object) === '[object Object]') {
    return true;
  }
  return false;
}
const processApiData = (
  apiData,
  setStatusDefinitions,
  hasStatusDefinitions = false
) => {
  if (hasStatusDefinitions) {
    const statusDefs = apiData.status_definitions || {};
    setStatusDefinitions(statusDefs);
  } else {
    console.warn('[processApiData] hasStatusDefinitions is false, not setting statusDefinitions');
  }

  // Pre-compute column keys set for faster lookup
  const columnKeys = new Set(apiData?.columns?.map(col => col.key) || []);

  const gridColumns = apiData?.columns?.map((col) => ({
      ...col,
      field: col.key,
      headerName: col.display_name || col.headerName,
      type: col.type,
      hidden: col.hidden ?? false
    })) || [];

  // Optimize data filtering using Set lookup instead of nested loops
  const filteredData = apiData.data?.map((row) => {
    const filteredRow = {};
    // Use Set lookup for O(1) instead of O(n) forEach
    for (const key of columnKeys) {
      if (key in row) {
        filteredRow[key] = row[key];
      }
    }
    for (const key of Object.keys(row)) {
      if (key.startsWith('_')) {
        filteredRow[key] = row[key];
      }
    }
    return filteredRow;
  }) || [];

  const gridRows = filteredData.map((row, index) => ({
    id: index,
    ...row,
    attendance_date: row.attendance_date ? parseDateValue(row.attendance_date) : null,
  }));
  
  return { gridColumns, gridRows };
};

// Fetch report data
const fetchReportData = async (
  report,
  locationState,
  setRows,
  setColumns,
  setLoading,
  setInitialLoad,
  setStatusDefinitions,
  setSearchParams,
  hasStatusDefinitions = false
) => {
  try {
    setLoading(true);
    const { reportData, columns: stateColumns, filters: stateFilters, statusDefinitions: stateStatusDefinitions } = locationState || {};

    if (locationState && reportData && stateColumns) {
      const { gridColumns, gridRows } = processApiData(
        {
          columns: stateColumns,
          data: reportData,
          status_definitions: stateStatusDefinitions || {},
        },
        setStatusDefinitions,
        hasStatusDefinitions
      );
      
      // Batch column and row updates together to prevent partial renders
      // Check if setColumns is a combined function that accepts both columns and rows
      if (typeof setColumns === 'function' && setColumns.length === 2) {
        // Combined function that sets both columns and rows together
        setColumns(gridColumns, gridRows);
      } else {
        // Separate functions - batch them together using React's automatic batching
        setColumns(gridColumns);
        setRows(gridRows);
      }
      
      if (stateFilters) {
        writeFilterValuesToParams(stateFilters, setSearchParams);
      }
    }
  } catch (error) {
    console.error("Error in fetchReportData:", error);
    toast.error(error?.response?.data?.error || error?.message || "Failed to fetch report data. Please try again.");
  } finally {
    setLoading(false);
    setInitialLoad(false);
  }
};




export { convertCellToText, processApiData, fetchReportData };
