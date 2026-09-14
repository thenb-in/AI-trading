import PropTypes from 'prop-types';
import { formatBytes } from '@utils/formattingUtils';
import { humanizeDuration } from '@utils/dateTimeUtils';
import { CACHE_STORE_MEMORY } from '@startup/constants/cache';

const STATUS_STYLES = {
  Fresh: 'bg-green-100 text-green-800',
  Expired: 'bg-amber-100 text-amber-800',
  'Other session': 'bg-gray-200 text-gray-700'
};

/**
 * Why an entry would or wouldn't be served on the next read. "Other session"
 * is an entry left by a different login — unreadable, and dropped the moment
 * that identity changes again.
 */
const entryStatus = (row) => {
  if (row.usable) return 'Fresh';
  if (row.expiresAt && row.expiresAt <= Date.now()) return 'Expired';
  return 'Other session';
};

const Pill = ({ label, className }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
    {label}
  </span>
);

Pill.propTypes = {
  label: PropTypes.string.isRequired,
  className: PropTypes.string
};

const secondsBetween = (from, to) => Math.max(0, Math.round((to - from) / 1000));

// Relative times are read from the clock inside each cell rather than from a
// prop, so the column list stays referentially stable and a ticking parent
// re-renders cells without rebuilding the grid's column model.
const buildCacheColumns = () => [
  {
    key: 'key',
    label: 'Key',
    type: 'string',
    render: (row) => <span className="font-mono text-xs break-all">{row.key}</span>
  },
  { key: 'namespace', label: 'Namespace', type: 'string' },
  {
    key: 'store',
    label: 'Store',
    type: 'string',
    render: (row) =>
      row.store === CACHE_STORE_MEMORY ? (
        <Pill label="memory" className="bg-purple-100 text-purple-800" />
      ) : (
        <Pill
          label={row.persisted ? row.store : `${row.store} (memory only)`}
          className={row.persisted ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}
        />
      )
  },
  {
    key: 'bytes',
    label: 'Size',
    type: 'number',
    render: (row) => formatBytes(row.bytes)
  },
  {
    key: 'savedAt',
    label: 'Age',
    type: 'number',
    render: (row) =>
      row.savedAt
        ? humanizeDuration(secondsBetween(row.savedAt, Date.now()), { unit: 'second', emptyLabel: 'just now' })
        : '—'
  },
  {
    key: 'expiresAt',
    label: 'Expires in',
    type: 'number',
    render: (row) => {
      if (!row.expiresAt) return 'never';
      const remaining = secondsBetween(Date.now(), row.expiresAt);
      if (!remaining) return 'expired';
      return humanizeDuration(remaining, { unit: 'second', emptyLabel: '< 1 sec' });
    }
  },
  {
    key: 'status',
    label: 'Status',
    type: 'string',
    render: (row) => {
      const status = entryStatus(row);
      return <Pill label={status} className={STATUS_STYLES[status]} />;
    }
  }
];

export { buildCacheColumns };
