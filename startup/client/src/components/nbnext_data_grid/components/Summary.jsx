import PropTypes from 'prop-types';
import { formatCellValueForInsight } from "../utils/helpers.js";
import {
  getSummaryHeaderFields,
  getSummaryHeaderFieldKeys,
} from "@startup/data/summaryFieldRegistry";

const Summary = ({ summary = {}, columns = [], compact = false }) => {
  // App-registered identity/header fields (e.g. employee code/name). The grid
  // itself stays domain-agnostic — see summaryFieldRegistry.
  const headerFields = getSummaryHeaderFields();
  const headerKeySet = getSummaryHeaderFieldKeys();

  const summaryTotals = {};

  // When `columns` is the effective per-tab column set (via useTabsState),
  // build a field-name lookup so we can drop summary totals that don't belong
  // to the currently-active tab. Without this, salary-side rollups would leak
  // into the Attendance tab's insights and vice versa.
  const columnKeySet =
    columns && columns.length > 0
      ? new Set(columns.map((c) => c.key || c.field).filter(Boolean))
      : null;

  // Separate header/identity fields from summary totals
  Object.keys(summary).forEach(key => {
    if (headerKeySet.has(key)) return;
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

  // Resolve each registered header field to its first present value. When any
  // header field is present, render every configured slot (empty allowed) so
  // the block keeps a stable column layout.
  const hasHeaderData = headerFields.some(({ keys }) =>
    (keys || []).some((k) => summary[k] !== undefined && summary[k] !== null && summary[k] !== '')
  );
  const headerEntries = hasHeaderData
    ? headerFields.map(({ keys, label }) => {
        const key = (keys || []).find(
          (k) => summary[k] !== undefined && summary[k] !== null && summary[k] !== ''
        );
        return { label, value: key ? summary[key] : '' };
      })
    : [];

  // Check if we have summary totals
  const hasSummaryTotals = Object.keys(summaryTotals).length > 0;

  // Don't render if no header data and no summary totals
  if (!hasHeaderData && !hasSummaryTotals) {
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
          {/* Header/identity fields - only show if header data exists */}
          {hasHeaderData &&
            headerEntries.map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-900">{value}</p>
              </div>
            ))}

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