import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { MasterHeader } from '@startup/components/base_components/master/master_header/MasterHeader';
import { MasterSearch } from '@startup/components/base_components/master/MasterSearch';
import { MasterTable } from '@startup/components/base_components/master/master_table/MasterTable';
import { useDataContext } from '@context/useDataContext';
import { formatBytes } from '@utils/formattingUtils';
import {
  cacheBust,
  cacheBustAll,
  cacheBustNamespace,
  cacheEntries,
  getCacheScope,
  subscribeToCacheBust
} from '@services/cacheManager';
import { CACHE_STORE_SESSION } from '@startup/constants/cache';
import { buildCacheColumns } from './cacheColumns';
import { CacheSummary } from './CacheSummary';

const SEARCH_KEYS = ['key', 'namespace', 'store'];

/**
 * Read-only window onto the client-side cache manager, plus the three ways to
 * bust it: one entry, one namespace, everything.
 *
 * Metadata only — sizes, ages and expiry, never the cached payload. Anything
 * dropped here is refetched by whoever needs it next, so the page is safe to
 * hand to support: the worst outcome is a slower next page load.
 */
const CacheMaster = () => {
  const dataContext = useDataContext();
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Only there to re-render, so the age and expiry cells re-read the clock.
  const [, setTick] = useState(0);

  const reload = useCallback(() => setRows(cacheEntries()), []);

  useEffect(reload, [reload]);

  // Busts happen elsewhere too — the filter panel's refresh button, a company
  // switch — so the table follows the cache rather than a manual refresh.
  useEffect(() => subscribeToCacheBust(reload), [reload]);

  useEffect(() => {
    const timer = setInterval(() => setTick((count) => count + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => SEARCH_KEYS.some((key) => String(row[key] || '').toLowerCase().includes(query)));
  }, [rows, searchQuery]);

  const columns = useMemo(() => buildCacheColumns(), []);

  // How many entries share each namespace, so a row can say whether dropping
  // its whole namespace would take anything else with it.
  const namespaceCounts = useMemo(() => {
    const counts = new Map();
    rows.forEach((row) => counts.set(row.namespace, (counts.get(row.namespace) || 0) + 1));
    return counts;
  }, [rows]);

  const totals = useMemo(
    () => ({
      entries: rows.length,
      bytes: rows.reduce((sum, row) => sum + (row.bytes || 0), 0),
      session: rows.filter((row) => row.store === CACHE_STORE_SESSION).length,
      namespaces: new Set(rows.map((row) => row.namespace)).size
    }),
    [rows]
  );

  const handleDropEntry = (_id, row) => {
    cacheBust(row.key);
    toast.success(`Dropped ${row.key}`);
  };

  const handleDropNamespace = (_id, row) => {
    cacheBustNamespace(row.namespace);
    toast.success(`Dropped everything under ${row.namespace}`);
  };

  // Keys are long and truncated in their cell, and copying one is half the
  // reason this page gets opened — so a click anywhere on the row copies it.
  const handleCopyKey = async (row) => {
    try {
      await navigator.clipboard.writeText(row.key);
      toast.success(`Copied ${row.key}`);
    } catch (error) {
      toast.error(`Could not copy ${row.key}: ${error.message}`);
    }
  };

  const handleDropAll = () => {
    if (!rows.length) return;
    if (!window.confirm(`Drop all ${rows.length} cached entries? They will be refetched on demand.`)) return;
    cacheBustAll();
    toast.success('Cache cleared');
  };

  const actions = [
    {
      label: 'Drop',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDropEntry,
      type: 'danger'
    },
    {
      // Dropping a namespace that holds only this entry is "Drop" under a
      // scarier name, so the button appears only where it does more, and says
      // how much more.
      label: (row) => `Drop namespace (${namespaceCounts.get(row.namespace)})`,
      show: (row) => namespaceCounts.get(row.namespace) > 1,
      onClick: handleDropNamespace,
      type: 'default'
    }
  ];

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-8xl mx-auto">
      <MasterHeader
        title="Cache Manager"
        description="Everything the browser is holding for this tab — users, roles, permissions, filter lists and anything else ApiService caches. Click a row to copy its key; drop an entry to force a fresh load."
        onRefresh={reload}
        userData={dataContext.userData}
        showBack={true}
        backUrl="/admin/master"
      />

      <CacheSummary totals={totals} scope={getCacheScope()} />

      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <MasterSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by key, namespace or store..."
        />
        <button
          type="button"
          onClick={handleDropAll}
          disabled={!rows.length}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors whitespace-nowrap"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Drop all ({formatBytes(totals.bytes)})
        </button>
      </div>

      <MasterTable
        columns={columns}
        data={filteredRows}
        loading={false}
        actions={actions}
        rowClickEnabled
        onRowClick={handleCopyKey}
        emptyMessage="Nothing cached yet — open a report or a master and come back."
        hideConstantColumns={false}
        showGridExport={false}
      />
    </div>
  );
};

export { CacheMaster };
