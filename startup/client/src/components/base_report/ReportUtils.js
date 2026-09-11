import { toast } from "react-toastify";
import { reportApi } from "@app/services/api";
import { sanitizeHTML, formatDate, formatDateTime, formatTime, formatDuration, formatDurationJson } from "@utils/formattingUtils";
import { parseDateValue } from "@utils/dateTimeUtils";
import { toValidNumber } from "@utils/toValidNumber";
// getStatusClass is imported but not currently used - reserved for future status styling functionality
//
// Fetching and grid-application live in ./reportDataSources — handleFiltersApply,
// loadSavedReportRun and applyReportPayload are exported from there.

/**
 * Known employee field keys that should be displayed as employee info
 */
const EMPLOYEE_FIELDS = ['emp_code', 'employee_code', 'first_name', 'employee_name', 'department_name', 'employee_department', 'position_name', 'emp_type'];

/**
 * Extract employee details from a summary object
 * @param {Object} summary - Summary object that may contain employee fields and/or summary totals
 * @returns {Object} Object containing only employee-related fields
 */
const getEmployeeDetails = (summary = {}) => {
  if (!summary || typeof summary !== 'object') return {};
  
  const employeeDetails = {};
  EMPLOYEE_FIELDS.forEach(field => {
    if (summary[field] !== undefined && summary[field] !== null) {
      employeeDetails[field] = summary[field];
    }
  });
  
  return employeeDetails;
};
const normalizeEmployeeSummary = (summary) => {
  if (!summary || typeof summary !== 'object') return {};
  return {
    id:summary.id,
    emp_code: summary.emp_code || summary.employee_code || '',
    first_name: summary.first_name || summary.employee_name || '',
    department_name: summary.department_name || summary.employee_department || '',
    position_name: summary.position_name || '',
    emp_type: summary.emp_type || ''
  };
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

// Helper function to check if attendance is locked
const isAttendanceLocked = (row) => {
  // First check the is_lock flag (preferred method)
  if (row.manual_attendance_is_lock === true) {
    return true;
  }
  
  // Fallback: Check if status contains tick symbol (✓) - for backward compatibility
  const status = row.status;
  if (status) {
    const statusStr = typeof status === 'string' ? status : String(status);
    return statusStr.includes('✓');
  }
  
  return false;
};

// Handle status updates for editable reports
const handleStatusUpdate = async (employeeSummary, rowId, newStatus, field, rows, setRows, statusDefinitions) => {
  try {
    const row = rows.find((r) => r.id === rowId);
    if (!row) {
      toast.error("Error: Could not find attendance record.");
      return;
    }

    // Check if attendance is locked
    if (isAttendanceLocked(row)) {
      // Try to extract locked by user name from row data
      const lockedByUserName = row.manual_attendance_locked_by_user_name || 'Unknown User';
      toast.error(`Cannot update attendance status. This attendance cannot be changed because it was locked by ${lockedByUserName}.`);
      return;
    }

    await reportApi.updateAttendanceStatus({
      employee_code: row.employee_code || employeeSummary.emp_code,
      attendance_date:
        row?.attendance_date instanceof Date && !isNaN(row.attendance_date)
          ? row.attendance_date.toLocaleDateString('en-CA')
          : field.split('-').reverse().join('-'),  // field is of type dd-mm-yyyy, convert to yyyy-mm-dd
      status: newStatus,
      old_status: row.status,
    });

    // Format the new value as HTML with the correct color
    // Try to find status definition by abbreviation first, then by full name
    const statusDef = Object.values(statusDefinitions).find(def => def.abbr === newStatus) ||
                     Object.entries(statusDefinitions).find(([_fullName, def]) => def.abbr === newStatus || statusDefinitions[_fullName]?.abbr === newStatus)?.[1];
    
    // Add * symbol to indicate the attendance has been modified
    // Check if it's already locked (has ✓), if so, add * before ✓, otherwise just add *
    const isLocked = row.manual_attendance_is_lock === true;
    // Build symbol string: * for modified, ✓ for locked (both can appear together)
    let symbol = '*'; // Always add * when status is updated
    if (isLocked) {
      symbol += '✓'; // Add ✓ if locked
    }
    const statusWithSymbol = `${newStatus}${symbol}`;
    
    const formattedValue = statusDef
      ? `<span style='color: ${statusDef.color || "black"}'>${statusWithSymbol}</span>`
      : `<span style='color: black'>${statusWithSymbol}</span>`;

    setRows((prevRows) =>
      prevRows.map((r) =>
        r.id === rowId
          ? { 
              ...r, 
              [field]: formattedValue, // Update any field (status or HTML-type)
              manual_attendance_modified_by_id: true, // Mark as modified so * symbol persists
            }
          : r
      )
    );

    toast.success(`Attendance status updated to ${newStatus} successfully!`);
  } catch (error) {
    console.error("Error updating status:", error);
    
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to update attendance status. Please try again.";

    toast.error(errorMessage);
  }

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
  setEmployeeSummary
) => {
  try {
    setLoading(true);
    const { reportData, columns: stateColumns, filters: stateFilters, statusDefinitions: stateStatusDefinitions, employeeSummary: stateEmployeeSummary } = locationState || {};

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
      
      if (setEmployeeSummary && stateEmployeeSummary) {
        // Handle array response - take first employee if array, otherwise use the object directly
        const employeeData = Array.isArray(stateEmployeeSummary) ? stateEmployeeSummary[0] : stateEmployeeSummary;
        setEmployeeSummary(normalizeEmployeeSummary(employeeData));
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



// New function specifically for toggling is_attendance boolean field
const handleAttendanceToggle = async (rowData, rows, setRows, reportActionApi) => {
  try {
    const response = await reportActionApi.toggleAttendance(rowData.emp_code, rowData.punch_time);
    
    if (response.data.success) {
      toast.success(response.data.message || 'Attendance toggled successfully!');
      
      // Update the specific row using emp_code + punch_time as unique identifier
      setRows(prevRows => 
        prevRows.map(row => 
          (row.emp_code === rowData.emp_code && row.punch_time === rowData.punch_time) 
            ? { ...row, is_attendance: row.is_attendance === true ? false : true } 
            : row
        )
      );
      
      return true; // Success
    } else {
      toast.error(response.message || 'Failed to toggle attendance');
      return false; // Failed
    }
  } catch (error) {
    console.error('Error toggling attendance:', error);
    toast.error(error.response?.data?.error || error.message || 'Failed to toggle attendance');
    return false; // Error
  }
};



export { convertCellToText, filterRelevantData, processApiData, handleStatusUpdate, handleAttendanceToggle, getFiltersFromSearchParams, updateSearchParams, sanitizeFilters, fetchReportData, normalizeEmployeeSummary, getEmployeeDetails, applyDefaultFiltersToSearchParams };
