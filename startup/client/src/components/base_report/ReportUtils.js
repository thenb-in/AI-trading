import { toast } from "react-toastify";
import { sanitizeHTML, formatDate, formatDateTime, formatTime, formatDuration, formatDurationJson } from "./reportFormatter.js";
// getStatusClass is imported but not currently used - reserved for future status styling functionality

/**
 * Default report API service interface.
 * Applications should provide their own implementation that matches this interface.
 * 
 * @interface ReportApiService
 * @property {Function} getReportData - Function that accepts (slug, filters) and returns a promise with { data: { columns, data, status_definitions } }
 */
const defaultReportApi = {
  async getReportData(slug, filters) {
    console.log('getReportData', slug, filters);
    throw new Error('Report API service not provided. Please pass a reportApi service to handleFiltersApply or implement getReportData in your API service.');
  }
};



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
    case 'number':
      // Handle 0 explicitly - it's a valid number value
      if (rawValue === 0) {
        return "0";
      }
      return Number(rawValue).toLocaleString();
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
    setStatusDefinitions(apiData.status_definitions || {});
  }

  // Pre-compute column keys set for faster lookup
  const columnKeys = new Set(apiData?.columns?.map(col => col.key) || []);

  const gridColumns = apiData?.columns?.map((col) => {
      const column = {
        field: col.key,
        headerName: col.display_name,
        type: col.type,
        hidden: col.hidden ?? false
      };
      return column;
    }) || [];

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

// Update search params with new filters
const updateSearchParams = (filters, setSearchParams) => {
  const newParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      if (Array.isArray(value)) {
        value
          .filter((v) => v !== null && v !== undefined && v !== "")
          .forEach((v) => newParams.append(key, v));
      } else {
        newParams.set(key, value);
      }
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
        updateSearchParams(stateFilters, setSearchParams);
      }
    }
  } catch (error) {
    console.error("Error in fetchReportData:", error);
    toast.error(error?.response?.data?.error || "Failed to fetch report data. Please try again.");
  } finally {
    setLoading(false);
    setInitialLoad(false);
  }
};

// Handle filter application
const handleFiltersApply = async (
  filters,
  report,
  setRows,
  setColumns,
  setLoading,
  setIsFiltering,
  setSearchParams,
  setStatusDefinitions,
  hasStatusDefinitions = false,
  reportApi = defaultReportApi,
) => {
  try {
    // Don't clear columns/rows separately - this causes partial renders
    // Instead, set loading state and let the new data replace them atomically
    setIsFiltering(true);
    setLoading(true);
    
    // Sanitize filters to remove undefined/null values
    const sanitizedFilters = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        if (Array.isArray(value)) {
          const validValues = value.filter((v) => v !== null && v !== undefined && v !== "");
          if (validValues.length > 0) {
            sanitizedFilters[key] = validValues;
          }
        } else {
          sanitizedFilters[key] = value;
        }
      }
    });

    updateSearchParams(sanitizedFilters, setSearchParams);
    
    // Call the report API service
    const response = await reportApi.getReportData(report.slug, sanitizedFilters);

    const { gridColumns, gridRows } = processApiData(response.data, setStatusDefinitions, hasStatusDefinitions);
    
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
    

    toast.success("Filters applied successfully!");
  } catch (error) {
    console.error("Error fetching report data:", error);
    toast.error(error?.response?.data?.message || error.message || "Failed to fetch report data. Please try again.");
  } finally {
    setLoading(false);
    setIsFiltering(false);
  }
};

export { convertCellToText, filterRelevantData, processApiData, getFiltersFromSearchParams, updateSearchParams, fetchReportData, handleFiltersApply };