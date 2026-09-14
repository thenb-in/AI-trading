import {
  CACHE_KEY_PREFIX,
  CACHE_SCHEMA_VERSION,
  CACHE_STORE_DB,
  CACHE_STORE_LOCAL,
  CACHE_STORE_MEMORY,
  CACHE_STORE_SESSION,
  CACHE_TTL_DEFAULT_MS
} from '@startup/constants/cache';

/**
 * Generic client-side cache manager.
 *
 * Four backing stores, picked per entry via `store`. Every feature below —
 * TTL, scope, expire, bust, the cache master page — works the same on each;
 * they differ only in where the entry is kept, and so what it outlives:
 *   - CACHE_STORE_MEMORY  — nowhere else. Dies on page reload.
 *   - CACHE_STORE_SESSION — sessionStorage. Survives reload, dies when the tab
 *                           closes. About 5 MB for the whole origin.
 *   - CACHE_STORE_LOCAL   — localStorage. Survives closing the browser and is
 *                           shared by every tab. Also about 5 MB.
 *   - CACHE_STORE_DB      — IndexedDB. Outlives the browser like local, but has
 *                           room for large lists and stores them without a
 *                           JSON round trip.
 *
 * Persisted entries are mirrored in memory, so a big payload is parsed once
 * per page load. A store that is unavailable or full leaves the entry in
 * memory only: it serves this page load and just doesn't survive a reload.
 *
 * IndexedDB is asynchronous, so its entries are read into memory once as the
 * page loads — await cacheReady() before a first read.
 *
 * Every entry carries a schema version, a TTL and the identity it was loaded
 * for (see setCacheScope), so a stale shape, an expired entry, or another
 * user's data can never be served.
 *
 * Reading and refreshing is ApiService's job (see `request`): it asks for an
 * entry, fetches when it is missing or expired, and falls back to the old copy
 * when that fetch fails. This module only stores, expires and drops.
 *
 * Keys are `namespace:rest` (e.g. `filterOptions:deptEmp`). The namespace is
 * what cacheBustNamespace() and bust subscribers work on.
 */

// `${store}:${key}` -> envelope. Persisted entries live here too, as the mirror.
const memory = new Map();
const listeners = new Set();

// Whose data is currently cached. Null until the user is known.
let scopeId = null;

const slotOf = (key, store) => `${store}:${key}`;
const storageKeyOf = (key) => `${CACHE_KEY_PREFIX}${key}`;
const namespaceOf = (key) => String(key).split(':')[0];

// sessionStorage or localStorage. Either throws on access in some privacy
// modes; probe once and leave that store memory-only rather than guarding
// every call site.
const webStorage = (getStorage) => {
  let storage;
  try {
    storage = getStorage();
    const probeKey = `${CACHE_KEY_PREFIX}probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
  } catch {
    return null;
  }
  const remove = (key) => storage.removeItem(storageKeyOf(key));
  return {
    keys: () => Object.keys(storage)
      .filter((storageKey) => storageKey.startsWith(CACHE_KEY_PREFIX))
      .map((storageKey) => storageKey.slice(CACHE_KEY_PREFIX.length)),
    // Throws on a value that isn't JSON — a half-written one or a foreign writer's.
    read: (key) => {
      const raw = storage.getItem(storageKeyOf(key));
      return raw ? JSON.parse(raw) : undefined;
    },
    write: (key, envelope) => {
      try {
        storage.setItem(storageKeyOf(key), JSON.stringify(envelope));
      } catch {
        // Quota exceeded, or a payload JSON can't represent. The memory copy
        // still serves this page load; only surviving a reload is lost.
        remove(key);
      }
    },
    remove,
  };
};

// IndexedDB, behind the same synchronous shape as Web Storage: what the
// database holds is read into `held` once as the page loads, and every write
// is sent off in order and reflected in `held` when it lands.
const indexedDbStorage = () => {
  const held = new Map();
  let database = null;

  const loaded = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open('smCache', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('entries');
      request.onerror = () => resolve();
      request.onsuccess = () => {
        database = request.result;
        const cursorRequest = database.transaction('entries').objectStore('entries').openCursor();
        cursorRequest.onerror = () => resolve();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) {
            resolve();
            return;
          }
          held.set(cursor.key, cursor.value);
          cursor.continue();
        };
      };
    } catch {
      // No IndexedDB here (some privacy modes): the store stays memory-only.
      resolve();
    }
  });

  const change = (apply, onDone, onFail) => loaded.then(() => {
    if (!database) return;
    try {
      const transaction = database.transaction('entries', 'readwrite');
      transaction.oncomplete = onDone;
      transaction.onabort = onFail;
      apply(transaction.objectStore('entries'));
    } catch {
      // A payload structured clone can't copy.
      onFail();
    }
  });

  // Out of `held` straight away, so nothing reads it back into memory while
  // the delete is still on its way.
  const remove = (key) => {
    held.delete(key);
    change((entries) => entries.delete(key), () => held.delete(key), () => held.delete(key));
  };

  return {
    ready: loaded,
    keys: () => [...held.keys()],
    read: (key) => held.get(key),
    // Over quota or uncloneable: dropped, as Web Storage does, so an older
    // copy can't outlive the one that failed to save.
    write: (key, envelope) => change((entries) => entries.put(envelope, key), () => held.set(key, envelope), () => remove(key)),
    remove,
  };
};

const persistentStores = {
  [CACHE_STORE_SESSION]: webStorage(() => window.sessionStorage),
  [CACHE_STORE_LOCAL]: webStorage(() => window.localStorage),
  [CACHE_STORE_DB]: indexedDbStorage(),
};

const ALL_STORES = [CACHE_STORE_MEMORY, ...Object.keys(persistentStores)];

// Only the stores this browser actually lets us write to.
const eachPersistentStore = (visit) => Object.entries(persistentStores)
  .filter(([, backing]) => backing)
  .forEach(([store, backing]) => visit(store, backing));

const readEnvelope = (key, store) => {
  const mirrored = memory.get(slotOf(key, store));
  if (mirrored) return mirrored;
  const backing = persistentStores[store];
  if (!backing) return undefined;
  try {
    const envelope = backing.read(key);
    if (envelope) memory.set(slotOf(key, store), envelope);
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
  persistentStores[store]?.remove(key);
};

const notify = (namespace) => listeners.forEach((listener) => listener(namespace));

/** Resolves once every store can be read — IndexedDB loads asynchronously. */
const cacheReady = () => persistentStores[CACHE_STORE_DB].ready;

/** True when `key` holds a value that is present, in-scope and unexpired. */
const cacheHas = (key, { store = CACHE_STORE_MEMORY } = {}) => isUsable(readEnvelope(key, store));

/** The cached value, or undefined on a miss. */
const cacheGet = (key, { store = CACHE_STORE_MEMORY } = {}) => {
  const envelope = readEnvelope(key, store);
  return isUsable(envelope) ? envelope.data : undefined;
};

/**
 * The entry under `key` for the current identity, expired or not — `fresh`
 * says which. Undefined when nothing is held. An expired copy is what a reader
 * falls back on when fetching a new one fails.
 */
const cacheRead = (key, { store = CACHE_STORE_MEMORY } = {}) => {
  const envelope = readEnvelope(key, store);
  if (!envelope || envelope.version !== CACHE_SCHEMA_VERSION || envelope.scope !== scopeId) {
    return undefined;
  }
  return { data: envelope.data, fresh: isUsable(envelope) };
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
  persistentStores[store]?.write(key, envelope);
  return data;
};

/** Drop one key from every store and tell subscribers its namespace changed. */
const cacheBust = (key) => {
  ALL_STORES.forEach((store) => dropSlot(key, store));
  notify(namespaceOf(key));
};

/** Drop every key under `namespace` (e.g. all filter option lists). */
const cacheBustNamespace = (namespace) => {
  const prefix = `${namespace}:`;
  memory.forEach((_, slot) => {
    const key = slot.slice(slot.indexOf(':') + 1);
    if (key.startsWith(prefix)) memory.delete(slot);
  });
  eachPersistentStore((_, backing) => {
    backing.keys().filter((key) => key.startsWith(prefix)).forEach((key) => backing.remove(key));
  });
  notify(namespace);
};

/** Drop everything this manager owns. Subscribers hear a null namespace. */
const cacheBustAll = () => {
  memory.clear();
  eachPersistentStore((_, backing) => backing.keys().forEach((key) => backing.remove(key)));
  notify(null);
};

const expiredCopy = (envelope) => ({ ...envelope, savedAt: 0 });

/**
 * Mark every key under `namespace` out of date without dropping it. The next
 * read fetches a new copy and still has this one to fall back on if that
 * fetch fails — which dropping would throw away.
 */
const cacheExpireNamespace = (namespace) => {
  const prefix = `${namespace}:`;
  memory.forEach((envelope, slot) => {
    if (slot.slice(slot.indexOf(':') + 1).startsWith(prefix)) memory.set(slot, expiredCopy(envelope));
  });
  eachPersistentStore((_, backing) => {
    backing.keys().filter((key) => key.startsWith(prefix)).forEach((key) => {
      try {
        backing.write(key, expiredCopy(backing.read(key)));
      } catch {
        // Unreadable: drop it, so it can never pass as fresh.
        backing.remove(key);
      }
    });
  });
  notify(namespace);
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
 * `persisted` distinguishes an entry its store actually holds (survives a
 * reload) from one that only lives in memory, which is what a persisted entry
 * degrades to when its store is unavailable or full.
 */
const cacheEntries = () => {
  const rows = new Map();

  memory.forEach((envelope, slot) => {
    const separator = slot.indexOf(':');
    const store = slot.slice(0, separator);
    rows.set(slot, describeEntry(slot.slice(separator + 1), store, envelope, false));
  });

  eachPersistentStore((store, backing) => {
    backing.keys().forEach((key) => {
      const slot = slotOf(key, store);
      const mirrored = rows.get(slot);
      if (mirrored) {
        mirrored.persisted = true;
        return;
      }
      try {
        rows.set(slot, describeEntry(key, store, backing.read(key), true));
      } catch {
        // Unreadable entry — a half-written value or one from a foreign writer.
        // Surface it so it can be dropped from the page rather than hiding it.
        rows.set(slot, describeEntry(key, store, {}, true));
      }
    });
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
 * looks like, and dropping the cache there would defeat the persisted stores.
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
  cacheReady,
  cacheHas,
  cacheGet,
  cacheRead,
  cacheSet,
  cacheBust,
  cacheBustNamespace,
  cacheBustAll,
  cacheExpireNamespace,
  cacheEntries,
  getCacheScope,
  subscribeToCacheBust,
  setCacheScope
};
