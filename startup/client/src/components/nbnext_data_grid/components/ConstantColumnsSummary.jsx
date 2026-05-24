import PropTypes from 'prop-types';
import { formatCellValueForInsight } from "../utils/helpers.js";

/**
 * Displays a summary of columns where all rows have the same value.
 * Uses the same column formatter as the grid (see formatCellValueForInsight in utils/helpers.js).
 */
function ConstantColumnsSummary({ constantColumns, compact = false }) {
  if (!constantColumns || constantColumns.size === 0) {
    return null;
  }

  // Filter out action columns as an extra safety measure
  const nonActionColumns = Array.from(constantColumns.entries()).filter(([field, { type }]) => {
    return type !== 'action' && field !== 'actions' && !field.includes('_action');
  });

  if (nonActionColumns.length === 0) {
    return null;
  }

  return (
    <div className={`${compact ? 'mb-0' : 'mb-4'} bg-blue-50 border border-blue-200 rounded-lg shadow-sm`}>
      <div className={`${compact ? 'px-4 py-2.5' : 'px-4 py-3'} border-b border-blue-200 bg-blue-100`}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-sm font-medium text-blue-900">Common Values</h4>
          <span className="text-xs text-blue-600">({nonActionColumns.length} column{nonActionColumns.length !== 1 ? 's' : ''} with identical values)</span>
        </div>
      </div>
      <div className={compact ? 'p-3' : 'p-4'}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {nonActionColumns.map(([field, { displayName, value, type, renderCell }]) => (
            <div key={field} className="flex flex-col">
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">
                {displayName}
              </p>
              <p className="text-sm font-semibold text-blue-900 break-words">
                {typeof renderCell === 'function'
                  ? renderCell({ row: { [field]: value }, field })
                  : formatCellValueForInsight({ type }, value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

ConstantColumnsSummary.propTypes = {
  constantColumns: PropTypes.instanceOf(Map),
  compact: PropTypes.bool,
};

export { ConstantColumnsSummary };
