import PropTypes from 'prop-types';
import { parseDateValue } from '@utils/dateTimeUtils';
import { REPORT_RUN_STATUS, REPORT_RUN_STATUS_STYLE } from '@startup/constants/reportRuns';

const StatusChip = ({ status }) => (
  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${REPORT_RUN_STATUS_STYLE[status] || REPORT_RUN_STATUS_STYLE[REPORT_RUN_STATUS.QUEUED]}`}>
    {status}
  </span>
);

StatusChip.propTypes = {
  status: PropTypes.string,
};

// Filters render generically from whatever the report sent. The page has no
// per-report knowledge, so a new report shows up here correctly without anyone
// remembering to add its filter names.
const FilterChips = ({ filters }) => {
  const entries = Object.entries(filters || {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ''
  );
  if (entries.length === 0) {
    return <span className="text-gray-400 italic">No filters</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, value]) => (
        <span key={key} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
          {key.replace(/_/g, ' ')}: {Array.isArray(value) ? value.join(', ') : String(value)}
        </span>
      ))}
    </div>
  );
};

FilterChips.propTypes = {
  filters: PropTypes.object,
};

// How long the run actually took — the number that tells the user whether
// re-opening a saved run just saved them two minutes or two seconds.
const formatElapsed = (row) => {
  const startedAt = parseDateValue(row.startedAt);
  const finishedAt = parseDateValue(row.finishedAt);
  if (!startedAt || !finishedAt) {
    return '-';
  }
  const seconds = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const REPORT_RUN_COLUMNS = [
  { id: 'reportTitle', label: 'Report', type: 'text' },
  {
    id: 'status',
    label: 'Status',
    type: 'text',
    render: (row) => <StatusChip status={row.status} />,
    getExportValue: ({ row }) => row.status,
  },
  { id: 'rowCount', label: 'Rows', type: 'number' },
  {
    id: 'elapsed',
    label: 'Took',
    type: 'text',
    render: (row) => formatElapsed(row),
    getExportValue: ({ row }) => formatElapsed(row),
  },
  { id: 'createdAt', label: 'Run at', type: 'datetime' },
  {
    id: 'filters',
    label: 'Filters',
    type: 'text',
    render: (row) => <FilterChips filters={row.filters} />,
    getExportValue: ({ row }) => JSON.stringify(row.filters || {}),
  },
];

export { REPORT_RUN_COLUMNS };
