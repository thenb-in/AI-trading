/**
 * Tags the requests of one user gesture with a shared id.
 *
 * A gesture the user thinks of as one action is often many requests — importing
 * a month of attendance POSTs once per row. Without a shared tag the server's
 * activity log records 200 unrelated creations, and "undo the last thing" can
 * only mean the 200th row. `runAsBatch` gives every request inside it the same
 * `x-batch-id`, so the whole gesture is one undoable unit.
 *
 * Writes made outside a batch still get their own id (see axiosConfig), so a
 * single Add is undoable on its own.
 *
 * Nesting is reused rather than re-tagged; two independent batches running
 * concurrently would collapse into one, which is why bulk runners await their
 * work inside a single runAsBatch rather than firing batches in parallel.
 */

let currentBatchId = null;

const newBatchId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getCurrentBatchId = () => currentBatchId;

/**
 * Run `fn` with every write inside it sharing one batch id.
 * @param {(batchId: string) => Promise<T>} fn
 * @returns {Promise<{ result: T, batchId: string }>}
 */
const runAsBatch = async (fn) => {
  if (currentBatchId) {
    return { result: await fn(currentBatchId), batchId: currentBatchId };
  }

  const batchId = newBatchId();
  currentBatchId = batchId;
  try {
    return { result: await fn(batchId), batchId };
  } finally {
    currentBatchId = null;
  }
};

export { runAsBatch, getCurrentBatchId, newBatchId };
