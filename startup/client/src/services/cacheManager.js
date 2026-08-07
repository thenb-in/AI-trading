import {
  CACHE_KEY_PREFIX,
  CACHE_SCHEMA_VERSION,
  CACHE_STORE_MEMORY,
  CACHE_STORE_SESSION,
  CACHE_TTL_DEFAULT_MS
} from '@startup/constants/cache';

/**
 * Generic client-side cache manager.
 *
 * Two backing stores, picked per entry via `store`:
 *   - CACHE_STORE_MEMORY  — dies on page reload. For data that must not
 *                           outlive the current page load.
 *   - CACHE_STORE_SESSION — sessionStorage, mirrored in memory so a big
 *                           payload is JSON-parsed once per page load.
 *                           Survives reload, dies when the tab closes.
 *
 * Every entry carries a schema version, a TTL and the identity it was loaded
 * for (see setCacheScope), so a stale shape, an expired entry, or another
 * user's data can never be served.
 *
 * Most callers only need cacheRemember(): read-through with in-flight
 * de-duplication, so N components mounting at once cause one request.
 *
 * Keys are `namespace:rest` (e.g. `filterOptions:deptEmp`). The namespace is
 * what cacheBustNamespace() and bust subscribers work on.
 */

// `${store}:${key}` -> envelope. Session entries live here too, as the mirror.
const memory = new Map();
// `${store}:${key}` -> in-flight promise, so concurrent readers share one load.
const inflight = new Map();
const listeners = new Set();

// Whose data is currently cached. Null until the user is known.
let scopeId = null;
// Bumped by every bust. A load that started before the bust must not write
// its now-stale answer into the cache.
let bustEpoch = 0;

const slotOf = (key, store) => `${store}:${key}`;
const storageKeyOf = (key) => `${CACHE_KEY_PREFIX}${key}`;
const namespaceOf = (key) => String(key).split(':')[0];

// sessionStorage throws on access in some privacy modes; probe once and fall
// back to memory-only rather than guarding every call site.
const sessionStore = (() => {
  try {
    const probeKey = `${CACHE_KEY_PREFIX}probe`;
    window.sessionStorage.setItem(probeKey, '1');
    window.sessionStorage.removeItem(probeKey);
    return window.sessionStorage;
  } catch {
    return null;
  }
})();

const sessionKeys = () =>
  sessionStore ? Object.keys(sessionStore).filter((k) => k.startsWith(CACHE_KEY_PREFIX)) : [];

const readEnvelope = (key, store) => {
  const mirrored = memory.get(slotOf(key, store));
  if (mirrored) return mirrored;
  if (store !== CACHE_STORE_SESSION || !sessionStore) return undefined;
  try {
    const raw = sessionStore.getItem(storageKeyOf(key));
    if (!raw) return undefined;
    const envelope = JSON.parse(raw);
    memory.set(slotOf(key, store), envelope);
    return envelope;
  } catch {
    return undefined;
  }
};

const isUsable = (envelope) =>
  !!envelope &&
  envelope.version === CACHE_SCHEMA_VERSION &&
  envelope.scope === scopeId &&
  (!envelope.ttlMs || Date.now() - envelope.savedAt < envelope.ttlMs);

const dropSlot = (key, store) => {
  memory.delete(slotOf(key, store));
  if (store === CACHE_STORE_SESSION && sessionStore) {
    sessionStore.removeItem(storageKeyOf(key));
  }
};

const notify = (namespace) => {
  bustEpoch += 1;
  listeners.forEach((listener) => listener(namespace));
};

/** True when `key` holds a value that is present, in-scope and unexpired. */
const cacheHas = (key, { store = CACHE_STORE_MEMORY } = {}) => isUsable(readEnvelope(key, store));

/** The cached value, or undefined on a miss. */
const cacheGet = (key, { store = CACHE_STORE_MEMORY } = {}) => {
  const envelope = readEnvelope(key, store);
  return isUsable(envelope) ? envelope.data : undefined;
};

/** Store `data` under `key`. Returns `data` so it can be used inline. */
const cacheSet = (key, data, { store = CACHE_STORE_MEMORY, ttlMs = CACHE_TTL_DEFAULT_MS } = {}) => {
  const envelope = {
    version: CACHE_SCHEMA_VERSION,
    scope: scopeId,
    savedAt: Date.now(),
    ttlMs,
    data
  };
  memory.set(slotOf(key, store), envelope);
  if (store === CACHE_STORE_SESSION && sessionStore) {
    try {
      sessionStore.setItem(storageKeyOf(key), JSON.stringify(envelope));
    } catch {
      // Quota exceeded, or a payload JSON can't represent. The memory copy
      // above still serves this page load; only surviving a reload is lost.
      sessionStore.removeItem(storageKeyOf(key));
    }
  }
  return data;
};

/** Drop one key from both stores and tell subscribers its namespace changed. */
const cacheBust = (key) => {
  dropSlot(key, CACHE_STORE_MEMORY);
  dropSlot(key, CACHE_STORE_SESSION);
  notify(namespaceOf(key));
};

/** Drop every key under `namespace` (e.g. all filter option lists). */
const cacheBustNamespace = (namespace) => {
  const prefix = `${namespace}:`;
  memory.forEach((_, slot) => {
    const key = slot.slice(slot.indexOf(':') + 1);
    if (key.startsWith(prefix)) memory.delete(slot);
  });
  sessionKeys()
    .filter((k) => k.startsWith(`${CACHE_KEY_PREFIX}${prefix}`))
    .forEach((k) => sessionStore.removeItem(k));
  notify(namespace);
};

/** Drop everything this manager owns. Subscribers hear a null namespace. */
const cacheBustAll = () => {
  memory.clear();
  sessionKeys().forEach((k) => sessionStore.removeItem(k));
  notify(null);
};

/**
 * Read-through cache. Returns the cached value when there is one, otherwise
 * awaits `loader()` and stores the result. Concurrent callers for the same
 * key share a single in-flight request.
 *
 * @param {string} key       `namespace:rest`
 * @param {() => Promise<any>} loader  Runs only on a miss. Rejections are not
 *                                     cached — a failed load retries next time.
 * @param {{ store?: string, ttlMs?: number, force?: boolean }} options
 *        `force` skips the cached value and any in-flight load, and is what
 *        the filter panel's refresh button ultimately triggers.
 */
const cacheRemember = (
  key,
  loader,
  { store = CACHE_STORE_MEMORY, ttlMs = CACHE_TTL_DEFAULT_MS, force = false } = {}
) => {
  const slot = slotOf(key, store);

  if (force) {
    inflight.delete(slot);
  } else {
    const envelope = readEnvelope(key, store);
    if (isUsable(envelope)) return Promise.resolve(envelope.data);
    const running = inflight.get(slot);
    if (running) return running;
  }

  const epoch = bustEpoch;
  const promise = Promise.resolve()
    .then(loader)
    .then((data) => {
      // A bust landed while this was in flight, so the answer is already
      // stale. Hand it to the caller that asked, but don't cache it.
      if (epoch === bustEpoch) cacheSet(key, data, { store, ttlMs });
      return data;
    })
    .finally(() => {
      // Only clear our own registration — a forced reload may have replaced it.
      if (inflight.get(slot) === promise) inflight.delete(slot);
    });

  inflight.set(slot, promise);
  return promise;
};

// Rough serialised size of a payload. Only ever called from the cache master
// page, so the stringify cost is paid when someone asks to see it.
const approximateBytes = (data) => {
  try {
    return JSON.stringify(data)?.length ?? 0;
  } catch {
    return null;
  }
};

const describeEntry = (key, store, envelope, persisted) => ({
  id: slotOf(key, store),
  key,
  namespace: namespaceOf(key),
  store,
  persisted,
  scope: envelope.scope ?? null,
  savedAt: envelope.savedAt ?? null,
  ttlMs: envelope.ttlMs ?? null,
  expiresAt: envelope.savedAt && envelope.ttlMs ? envelope.savedAt + envelope.ttlMs : null,
  usable: isUsable(envelope),
  bytes: approximateBytes(envelope.data)
});

/**
 * Every entry currently held, as plain rows — what the cache master page
 * renders. Metadata only: no cached payload is handed out.
 *
 * `persisted` distinguishes an entry sessionStorage actually holds (survives a
 * reload) from one that only lives in memory, which is what a session entry
 * degrades to when storage is unavailable or full.
 */
const cacheEntries = () => {
  const rows = new Map();

  memory.forEach((envelope, slot) => {
    const separator = slot.indexOf(':');
    const store = slot.slice(0, separator);
    rows.set(slot, describeEntry(slot.slice(separator + 1), store, envelope, false));
  });

  sessionKeys().forEach((storageKey) => {
    const key = storageKey.slice(CACHE_KEY_PREFIX.length);
    const slot = slotOf(key, CACHE_STORE_SESSION);
    const mirrored = rows.get(slot);
    if (mirrored) {
      mirrored.persisted = true;
      return;
    }
    try {
      rows.set(slot, describeEntry(key, CACHE_STORE_SESSION, JSON.parse(sessionStore.getItem(storageKey)), true));
    } catch {
      // Unreadable entry — a half-written value or one from a foreign writer.
      // Surface it so it can be dropped from the page rather than hiding it.
      rows.set(slot, describeEntry(key, CACHE_STORE_SESSION, {}, true));
    }
  });

  return [...rows.values()];
};

/** The identity the cache is currently bound to, or null when logged out. */
const getCacheScope = () => scopeId;

/**
 * Listen for busts. The listener gets the busted namespace, or null when
 * everything was dropped. Returns an unsubscribe function.
 */
const subscribeToCacheBust = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Bind the cache to an identity — pass null when nobody is logged in.
 *
 * Moving between two known identities (log out, switch company) drops
 * everything, so one user's roster can never be served to the next. Moving
 * from "unknown" to an identity does not bust: that is what a page reload
 * looks like, and dropping the cache there would defeat session storage.
 * Entries from another identity stay unusable regardless, because `scope`
 * is checked on every read.
 */
const setCacheScope = (nextScope) => {
  const normalised = nextScope == null ? null : String(nextScope);
  if (normalised === scopeId) return;
  const hadScope = scopeId !== null;
  scopeId = normalised;
  if (hadScope) cacheBustAll();
};

export {
  cacheHas,
  cacheGet,
  cacheSet,
  cacheBust,
  cacheBustNamespace,
  cacheBustAll,
  cacheRemember,
  cacheEntries,
  getCacheScope,
  subscribeToCacheBust,
  setCacheScope
};
