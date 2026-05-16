import PropTypes from 'prop-types';
import { formatCellValueForInsight } from "../utils/helpers.js";

// Known employee field keys that should be displayed as employee info
const EMPLOYEE_FIELDS = ['emp_code', 'employee_code', 'first_name', 'employee_name', 'department_name', 'employee_department', 'position_name', 'emp_type'];

const Summary = ({ summary = {}, columns = [], compact = false }) => {
  // Extract employee data and summary totals from unified summary prop
  const employeeData = {};
  const summaryTotals = {};

  // When `columns` is the effective per-tab column set (via useTabsState),
  // build a field-name lookup so we can drop summary totals that don't belong
  // to the currently-active tab. Without this, salary-side rollups would leak
  // into the Attendance tab's insights and vice versa.
  const columnKeySet =
    columns && columns.length > 0
      ? new Set(columns.map((c) => c.key || c.field).filter(Boolean))
      : null;

  // Separate employee fields from summary totals
  Object.keys(summary).forEach(key => {
    if (EMPLOYEE_FIELDS.includes(key)) {
      employeeData[key] = summary[key];
      return;
    }
    // Only keep numeric values. If we have a column set for the active view,
    // also drop anything not present in that set.
    const value = summary[key];
    if (value === null || value === undefined) return;
    const isNumeric =
      typeof value === 'number' ||
      (typeof value === 'string' && !isNaN(parseFloat(value)));
    if (!isNumeric) return;
    if (columnKeySet && !columnKeySet.has(key)) return;
    summaryTotals[key] = value;
  });
  
  // Check if we have employee data
  const hasEmployeeData = employeeData.emp_code || employeeData.employee_code;
  
  // Check if we have summary totals
  const hasSummaryTotals = Object.keys(summaryTotals).length > 0;
  
  // Don't render if no employee data and no summary totals
  if (!hasEmployeeData && !hasSummaryTotals) {
    return null;
  }

  // Get summary column display names from columns array
  const getSummaryDisplayName = (columnKey) => {
    const column = columns.find(col => (col.key || col.field) === columnKey);
    return column?.display_name || column?.headerName || columnKey;
  };

  /**
   * Format a summary total value using the same logic as the data grid when column def exists;
   * otherwise fall back to number formatting for numeric values.
   */
  const formatSummaryValue = (key, value) => {
    const column = columns.find(col => (col.key || col.field) === key);
    if (column?.type) {
      return formatCellValueForInsight(column, value);
    }
    if (value === null || value === undefined) return '0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  return (
    <div className={`${compact ? 'mb-0' : 'mb-6'} bg-white border border-emerald-200 rounded-lg shadow-sm`}>
      {/* Header */}
      <div className={`${compact ? 'px-4 py-3' : 'px-6 py-4'} border-b border-emerald-200 bg-emerald-50`}>
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-emerald-950">Summary</h3>
        </div>
      </div>

      {/* Content */}
      <div className={compact ? 'p-4' : 'p-6'}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Employee fields - only show if employee data exists */}
          {hasEmployeeData && (
            <>
              {/* Employee Code */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Employee Code</p>
                <p className="text-sm font-semibold text-gray-900">{employeeData.emp_code || employeeData.employee_code || ''}</p>
              </div>

              {/* Employee Name */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</p>
                <p className="text-sm font-semibold text-gray-900">
                  {employeeData.first_name || employeeData.employee_name || ''}
                </p>
              </div>

              {/* Department */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Department</p>
                <p className="text-sm font-semibold text-gray-900">
                  {employeeData.department_name || employeeData.employee_department || ''}
                </p>
              </div>

              {/* Position */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Position</p>
                <p className="text-sm font-semibold text-gray-900">
                  {employeeData.position_name || ''}
                </p>
              </div>

              {/* Employee Type */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Employee Type</p>
                <p className="text-sm font-semibold text-gray-900">
                  {employeeData.emp_type || ''}
                </p>
              </div>

              {/* Records Count */}
              {/* <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Records</p>
                <p className="text-sm font-semibold text-gray-900">{recordCount}</p>
              </div> */}
            </>
          )}

          {/* Summary totals - always show if they exist */}
          {hasSummaryTotals && Object.entries(summaryTotals).map(([key, value]) => (
            <div key={key}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {getSummaryDisplayName(key)}
              </p>
              <p className="text-sm font-semibold text-gray-900">{formatSummaryValue(key, value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Summary.propTypes = {
  summary: PropTypes.object,
  columns: PropTypes.array,
  compact: PropTypes.bool,
};

export { Summary };