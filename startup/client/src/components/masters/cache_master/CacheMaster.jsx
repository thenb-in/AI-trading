import { useEffect, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { BaseMaster } from '@startup/components/base_components/master';
import { formatBytes } from '@utils/formattingUtils';
import {
  cacheBust,
  cacheBustAll,
  cacheBustNamespace,
  cacheEntries,
  cacheReady,
  getCacheScope,
  subscribeToCacheBust
} from '@services/cacheManager';
import { buildCacheColumns } from './cacheColumns';
import { CacheSummary } from './CacheSummary';

// The page reads the browser's own cache and never calls the server, so there
// is no permission to check — anyone who can be shown a stale value must be
// able to drop it.
const PERMISSION_KEYS = {};

const CACHE_COLUMNS = buildCacheColumns();

const loadEntries = async () => {
  await cacheReady();
  return cacheEntries();
};

// The same key can sit in both stores, so the store is part of what makes an
// entry one row — and what lets Previous/Next tell entries apart.
const extractResponse = (entries) => ({
  rows: entries.map((entry) => ({ ...entry, id: `${entry.store}:${entry.key}` })),
  columns: CACHE_COLUMNS,
});

const summarise = (rows) => ({
  entries: rows.length,
  bytes: rows.reduce((sum, row) => sum + (row.bytes || 0), 0),
  persisted: rows.filter((row) => row.persisted).length,
  namespaces: new Set(rows.map((row) => row.namespace)).size
});

// Keys are long and truncated in their cell, and copying one is half the
// reason this page gets opened.
const copyKey = async (_id, row) => {
  try {
    await navigator.clipboard.writeText(row.key);
    toast.success(`Copied ${row.key}`);
  } catch (error) {
    toast.error(`Could not copy ${row.key}: ${error.message}`);
  }
};

const dropEntry = (_id, row) => {
  cacheBust(row.key);
  toast.success(`Dropped ${row.key}`);
};

const dropNamespace = (_id, row) => {
  cacheBustNamespace(row.namespace);
  toast.success(`Dropped everything under ${row.namespace}`);
};

const extraActions = ({ rows }) => {
  // How many entries share each namespace, so a row can say whether dropping
  // its whole namespace would take anything else with it.
  const namespaceCounts = new Map();
  rows.forEach((row) => namespaceCounts.set(row.namespace, (namespaceCounts.get(row.namespace) || 0) + 1));

  return [
    { label: 'Copy key', icon: <Copy className="w-4 h-4" />, onClick: copyKey, type: 'default' },
    { label: 'Drop', icon: <Trash2 className="w-4 h-4" />, onClick: dropEntry, type: 'danger' },
    {
      // Dropping a namespace that holds only this entry is "Drop" under a
      // scarier name, so the button appears only where it does more, and says
      // how much more.
      label: (row) => `Drop namespace (${namespaceCounts.get(row.namespace)})`,
      show: (row) => namespaceCounts.get(row.namespace) > 1,
      onClick: dropNamespace,
      type: 'default'
    }
  ];
};

const renderSummary = ({ rows }) => <CacheSummary totals={summarise(rows)} scope={getCacheScope()} />;

const renderDropAll = ({ rows }) => {
  const handleDropAll = () => {
    if (!window.confirm(`Drop all ${rows.length} cached entries? They will be refetched on demand.`)) return;
    cacheBustAll();
    toast.success('Cache cleared');
  };
  return (
    <button
      type="button"
      onClick={handleDropAll}
      disabled={!rows.length}
      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors whitespace-nowrap"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Drop all ({formatBytes(summarise(rows).bytes)})
    </button>
  );
};

/**
 * Read-only window onto the client-side cache manager, plus the three ways to
 * bust it: one entry, one namespace, everything.
 *
 * Metadata only — sizes, ages and expiry, never the cached payload. Anything
 * dropped here is refetched by whoever needs it next, so the page is safe to
 * hand to support: the worst outcome is a slower next page load.
 */
const CacheMaster = () => {
  // Only there to re-render, so the age and expiry cells re-read the clock.
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((count) => count + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <BaseMaster
      title="Cache Manager"
      description="Everything this tab can read from its cache — in memory, sessionStorage, localStorage or IndexedDB: users, roles, permissions, filter lists and anything else ApiService caches. Click a row to see an entry; copy its key or drop it to force a fresh load."
      searchPlaceholder="Search by key, namespace or store..."
      modalEditTitle="Cache Entry"
      baseMasterContainerWidth="max-w-8xl"
      permissionKeys={PERMISSION_KEYS}
      loadRows={loadEntries}
      extractResponse={extractResponse}
      // Busts happen elsewhere too — the filter panel's refresh button, a
      // company switch — so the table follows the cache rather than a manual refresh.
      subscribeToRefresh={subscribeToCacheBust}
      headerContent={renderSummary}
      extraHeaderActions={renderDropAll}
      extraActions={extraActions}
      hideConstantColumns={false}
      showGridExport={false}
    />
  );
};

export { CacheMaster };
