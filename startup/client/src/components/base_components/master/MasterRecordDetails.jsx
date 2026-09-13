import PropTypes from 'prop-types';
import { formatDateForDisplay, formatDateTimeForDisplay } from '@utils/dateTimeUtils';

// How a raw cell reads in the details view, by column type.
const FORMAT_BY_TYPE = {
  date: formatDateForDisplay,
  datetime: formatDateTimeForDisplay,
  boolean: (value) => (value ? 'Yes' : 'No'),
};

const displayValue = (column, row) => {
  if (typeof column.render === 'function') return column.render(row);
  const value = row[column.key || column.id];
  if (value == null || value === '') return '-';
  const format = FORMAT_BY_TYPE[column.format || column.type]
    ?? (typeof value === 'object' ? JSON.stringify : String);
  return format(value);
};

/**
 * What a row click opens on a master that has no form and no details view of
 * its own: every column of the row, label over value. Keeps "click a row to see
 * it" true for every master, read-only ones included.
 */
const MasterRecordDetails = ({ initialData, columns }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
    {columns.filter((column) => !column.hidden).map((column) => (
      <div key={column.key || column.id} className="min-w-0">
        <dt className="text-gray-500">{column.label || column.display_name || column.key || column.id}</dt>
        <dd className="text-gray-900 font-medium break-words">{displayValue(column, initialData)}</dd>
      </div>
    ))}
  </dl>
);

MasterRecordDetails.propTypes = {
  initialData: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
};

export { MasterRecordDetails };
