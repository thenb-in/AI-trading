import { toast } from 'react-toastify';

/**
 * Do the same thing to many rows: ask once, run one at a time, report once.
 *
 */
const confirmAndRunOnEachRow = async ({
  rows,
  run,
  confirmMessage,
  doneVerb,
  noun,
  failMessage
}) => {
  const nothingHappened = { ok: 0, failed: 0, lastError: '', ran: false };

  // Step 1 — nothing to do: no rows, so no question and no toast.
  if (!Array.isArray(rows) || rows.length === 0) {
    return nothingHappened;
  }

  // Step 2 — ask the user once, for the whole batch, not per row.
  if (confirmMessage && !window.confirm(confirmMessage)) {
    return nothingHappened;
  }

  // Step 3 — run the rows one after another (never all at once, so the server is
  // not hit with the whole grid in parallel), and keep score while going.
  let ok = 0;
  let failed = 0;
  let lastError = '';
  for (const row of rows) {
    const result = await run(row);
    if (result?.ok) {
      ok += 1;
    } else if (!result?.skipped) {
      failed += 1;
      if (result?.error) {
        lastError = String(result.error);
      }
    }
  }

  // Step 4 — one summary toast for the batch: what got done, and what did not.
  if (ok > 0) {
    const tail = failed > 0 ? `. ${failed} could not be ${doneVerb.toLowerCase()}.` : '.';
    toast.success(`${doneVerb} ${ok} ${noun}${ok === 1 ? '' : 's'}${tail}`);
  }
  if (failed > 0 && ok === 0) {
    toast.error(lastError || failMessage);
  }

  // Step 5 — hand the score back, for callers with something left to do afterwards
  // (refreshing a lock-status map, say).
  return { ok, failed, lastError, ran: true };
};

export { confirmAndRunOnEachRow };
