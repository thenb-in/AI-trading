import { toast } from "react-toastify";
import { getReportApi } from "@startup/data/reportApiRegistry";
import { sanitizeHTML, formatDate, formatDateTime, formatTime, formatDuration, formatDurationJson } from "@utils/formattingUtils";
import { parseDateValue } from "@utils/dateTimeUtils";
import { toValidNumber } from "@utils/toValidNumber";
import { runReportViaSocket } from "@startup/socket";

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
      rawValue = rawValue.replace(/\n/g, '<br>');
      return rawValue;
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
// Utility function for filtering data (optimized with Set lookup)
const filterRelevantData = (data, columns) => {
  if (!data || !columns || data.length === 0 || columns.length === 0) {
    return [];
  }
  
  // Pre-compute column keys set for O(1) lookup
  const columnKeys = new Set(columns.map(col => col.key));
  
  return data.map((row) => {
    const filteredRow = {};
    // Use Set iteration for better performance
    for (const key of columnKeys) {
      if (key in row) {
        filteredRow[key] = row[key];
      }
    }
    return filteredRow;
  });
};

// Process API data into grid columns and rows
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
    return filteredRow;
  }) || [];

  const gridRows = filteredData.map((row, index) => ({
    id: index,
    ...row,
    attendance_date: row.attendance_date ? parseDateValue(row.attendance_date) : null,
  }));
  
  return { gridColumns, gridRows };
};

// Get filters from search params
const getFiltersFromSearchParams = (searchParams) => {
  const filters = {};
  for (const [key, value] of searchParams.entries()) {
    if (value) {
      filters[key] = filters[key]
        ? Array.isArray(filters[key])
          ? [...filters[key], value]
          : [filters[key], value]
        : value;
    }
  }
  return filters;
};

// Seed missing search params from a report's default filters (used on mount).
const applyDefaultFiltersToSearchParams = (defaultFilters, searchParams, setSearchParams) => {
  if (!defaultFilters || !Object.keys(defaultFilters).length) return;
  const nextParams = new URLSearchParams(searchParams);
  let needsUpdate = false;
  Object.entries(defaultFilters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (!nextParams.has(key)) {
      nextParams.set(key, String(value));
      needsUpdate = true;
    }
  });
  if (needsUpdate) setSearchParams(nextParams, { replace: true });
};


const sanitizeFilters = (filters) => {
  const sanitized = {};
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value)) {
      const valid = value.filter((v) => v !== null && v !== undefined && v !== "");
      if (valid.length > 0) sanitized[key] = valid;
    } else {
      sanitized[key] = value;
    }
  });
  return sanitized;
};

// Update search params with new filters
const updateSearchParams = (filters, setSearchParams) => {
  const newParams = new URLSearchParams();
  Object.entries(sanitizeFilters(filters)).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => newParams.append(key, v));
    } else {
      newParams.set(key, value);
    }
  });
  setSearchParams(newParams);
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
  hasStatusDefinitions = false,
  setSummary
) => {
  try {
    setLoading(true);
    const { reportData, columns: stateColumns, filters: stateFilters, statusDefinitions: stateStatusDefinitions, summary: stateSummary } = locationState || {};

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
      
      if (setSummary && stateSummary) {
        // Handle array response - take the first entry if an array, otherwise use
        // the object directly. The caller owns any domain-specific normalization.
        const summaryData = Array.isArray(stateSummary) ? stateSummary[0] : stateSummary;
        setSummary(summaryData);
      }
      if (stateFilters) {
        updateSearchParams(stateFilters, setSearchParams);
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

// Socket RPC path — routes the report through the dedicated runner server.
// Returns the normalised { apiData, successMessage } shape the shared
// post-processing in handleFiltersApply consumes.
const runReportViaReportRunner = async (reportKey, sanitizedFilters) => {
  const envelope = await runReportViaSocket({ reportKey, filters: sanitizedFilters });
  return {
    apiData: envelope?.data ?? envelope,
    successMessage: 'Report ready',
  };
};

// HTTP path — runs the report on the app server directly via reportApi.
// Same return shape as runReportViaReportRunner so handleFiltersApply stays
// oblivious to transport.
const runReportOnMainServer = async (report, sanitizedFilters) => {
  const response = await getReportApi().getReportData(report.slug, sanitizedFilters);
  return {
    apiData: response.data.data,
    successMessage: response.data.message || 'Filters applied successfully!',
  };
};

// Apply filters and load report data into the grid.
//
// `transport` picks which path runs the query:
//   'runner' → runReportViaReportRunner  (socket → dedicated runner process)
//   'http'   → runReportOnMainServer     (REST → app server, default)
//
// `applyData` lets a caller own how the fetched payload maps onto the grid —
// pass it when the response isn't the standard single `{ data, columns }`
// shape (e.g. multi-section reports). When omitted, the default
// processApiData → setColumns/setRows path runs. Everything else (sanitize,
// URL sync, transport, loading flags, toasts) stays shared.
const handleFiltersApply = async ({
  filters,
  report,
  setRows,
  setColumns,
  setLoading,
  setIsFiltering,
  setSearchParams,
  setStatusDefinitions,
  hasStatusDefinitions = false,
  setOriginalColumns = null,
  transport = 'http',
  applyData = null,
}) => {
  try {
    setIsFiltering(true);
    setLoading(true);

    const sanitizedFilters = sanitizeFilters(filters);

    updateSearchParams(sanitizedFilters, setSearchParams);

    const { apiData, successMessage } = transport === 'runner'
      ? await runReportViaReportRunner(report.slug, sanitizedFilters)
      : await runReportOnMainServer(report, sanitizedFilters);

    if (applyData) {
      applyData(apiData);
    } else {
      if (setOriginalColumns && apiData?.columns) setOriginalColumns(apiData.columns);

      const { gridColumns, gridRows } = processApiData(apiData, setStatusDefinitions, hasStatusDefinitions);

      // Batch column and row updates together to prevent partial renders.
      // setColumns can be an arity-2 (cols, rows) combined setter from the caller.
      if (typeof setColumns === 'function' && setColumns.length === 2) {
        setColumns(gridColumns, gridRows);
      } else {
        setColumns(gridColumns);
        setRows(gridRows);
      }
    }

    toast.success(successMessage);
  } catch (error) {
    console.error('Error applying filters:', error);
    toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch report data. Please try again.');
  } finally {
    setLoading(false);
    setIsFiltering(false);
  }
};


export { convertCellToText, filterRelevantData, processApiData, getFiltersFromSearchParams, updateSearchParams, sanitizeFilters, fetchReportData, handleFiltersApply, applyDefaultFiltersToSearchParams };
