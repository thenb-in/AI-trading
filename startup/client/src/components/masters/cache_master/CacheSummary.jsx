import PropTypes from 'prop-types';
import { Database, HardDrive, Layers, Fingerprint } from 'lucide-react';
import { formatBytes } from '@utils/formattingUtils';

const Tile = ({ icon: Icon, label, value, hint }) => (
  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
      <Icon className="h-5 w-5 text-blue-600" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 truncate" title={hint || String(value)}>
        {value}
      </p>
    </div>
  </div>
);

Tile.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  hint: PropTypes.string
};

/** At-a-glance state of the cache: how much, of what kind, for whom. */
const CacheSummary = ({ totals, scope }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
    <Tile icon={Database} label="Entries" value={totals.entries} />
    <Tile icon={HardDrive} label="Total size" value={formatBytes(totals.bytes)} />
    <Tile
      icon={Layers}
      label="Namespaces"
      value={totals.namespaces}
      hint={`${totals.session} of ${totals.entries} entries survive a page refresh`}
    />
    <Tile
      icon={Fingerprint}
      label="Scope"
      value={scope || 'not signed in'}
      hint={scope ? 'user:company — everything is dropped when this changes' : undefined}
    />
  </div>
);

CacheSummary.propTypes = {
  totals: PropTypes.shape({
    entries: PropTypes.number.isRequired,
    bytes: PropTypes.number.isRequired,
    session: PropTypes.number.isRequired,
    namespaces: PropTypes.number.isRequired
  }).isRequired,
  scope: PropTypes.string
};

export { CacheSummary };
