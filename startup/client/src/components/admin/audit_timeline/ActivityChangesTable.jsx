import PropTypes from 'prop-types';

const formatValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const ActivityChangesTable = ({ changes, title = 'Changed Fields' }) => {
  if (!changes || typeof changes !== 'object' || Object.keys(changes).length === 0) {
    return <div className="text-gray-500 text-sm">No field-level changes recorded.</div>;
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">{title}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-gray-600">Field</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">Before</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600">After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Object.entries(changes).map(([field, change]) => (
              <tr key={field}>
                <td className="px-2 py-2 font-medium text-gray-800">{field}</td>
                <td className="px-2 py-2 text-gray-600">{formatValue(change?.before)}</td>
                <td className="px-2 py-2 text-gray-900 font-medium">{formatValue(change?.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

ActivityChangesTable.propTypes = {
  changes: PropTypes.object,
  title: PropTypes.string,
};

export { ActivityChangesTable };

