// Client-side cache manager constants.

// Every key this app writes into sessionStorage or localStorage carries this
// prefix, so a global bust never touches keys owned by other code on the same origin.
const CACHE_KEY_PREFIX = 'smCache:';

// Bump when the shape of a cached value changes. Entries written by an older
// build then read as misses instead of being handed to code that can't parse
// them — a deploy does not need users to clear their tab.
const CACHE_SCHEMA_VERSION = 1;

// Backing stores, chosen per entry:
//   memory  — module-level Map. Dies on page reload.
//   session — sessionStorage. Survives reload, dies when the tab closes.
//   local   — localStorage. Survives closing the browser, shared by every tab.
//   db      — IndexedDB. Like local, with room for large lists.
const CACHE_STORE_MEMORY = 'memory';
const CACHE_STORE_SESSION = 'session';
const CACHE_STORE_LOCAL = 'local';
const CACHE_STORE_DB = 'db';

// Entries older than this are refetched. Long enough that a work session
// reuses one load, short enough that a master edited elsewhere shows up
// without anyone reaching for the refresh button.
const CACHE_TTL_DEFAULT_MS = 30 * 60 * 1000;

// Minimum pause before "clear cache and refresh" reloads, so the user sees the
// "Clearing cache…" toast instead of a page that just flickers.
const CACHE_CLEAR_RELOAD_DELAY_MS = 300;

export {
  CACHE_KEY_PREFIX,
  CACHE_SCHEMA_VERSION,
  CACHE_STORE_MEMORY,
  CACHE_STORE_SESSION,
  CACHE_STORE_LOCAL,
  CACHE_STORE_DB,
  CACHE_TTL_DEFAULT_MS,
  CACHE_CLEAR_RELOAD_DELAY_MS
};
