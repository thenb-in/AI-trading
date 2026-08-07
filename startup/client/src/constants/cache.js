// Client-side cache manager constants.

// Every key this app writes into sessionStorage carries this prefix, so a
// global bust never touches keys owned by other code on the same origin.
const CACHE_KEY_PREFIX = 'smCache:';

// Bump when the shape of a cached value changes. Entries written by an older
// build then read as misses instead of being handed to code that can't parse
// them — a deploy does not need users to clear their tab.
const CACHE_SCHEMA_VERSION = 1;

// Backing stores, chosen per entry:
//   memory  — module-level Map. Dies on page reload.
//   session — sessionStorage. Survives reload, dies when the tab closes.
const CACHE_STORE_MEMORY = 'memory';
const CACHE_STORE_SESSION = 'session';

// Entries older than this are refetched. Long enough that a work session
// reuses one load, short enough that a master edited elsewhere shows up
// without anyone reaching for the refresh button.
const CACHE_TTL_DEFAULT_MS = 30 * 60 * 1000;

// Namespace for filter dropdown option lists (employees, departments, cost
// centres, positions, users). The filter panel's refresh button busts this
// namespace, and useFilterDynamicOptions reloads when it hears that.
const CACHE_NS_FILTER_OPTIONS = 'filterOptions';

export {
  CACHE_KEY_PREFIX,
  CACHE_SCHEMA_VERSION,
  CACHE_STORE_MEMORY,
  CACHE_STORE_SESSION,
  CACHE_TTL_DEFAULT_MS,
  CACHE_NS_FILTER_OPTIONS
};
