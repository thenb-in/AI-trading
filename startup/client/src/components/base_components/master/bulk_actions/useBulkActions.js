import { useState, useRef, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const defaultMessage = (mode, succeeded, failed) => {
  const verb = mode?.verb || 'process';
  const verbedPast = mode?.verbedPast || `${verb}ed`;
  const noun = mode?.noun || 'record';
  if (succeeded > 0) {
    const tail = failed > 0 ? `, ${failed} failed` : '';
    return { type: 'success', text: `${capitalize(verbedPast)} ${succeeded} ${noun}(s)${tail}` };
  }
  if (failed > 0) {
    return { type: 'error', text: `Failed to ${verb} ${failed} ${noun}(s)` };
  }
  return null;
};

/**
 * Bulk approve / reject (or any per-row action) state machine for master tables.
 *
 * Owns selection state and the iteration loop. The caller decides UI (typically
 * via <BulkActionBar/>) and any pre-step (e.g. a remarks modal). When ready,
 * the caller invokes `process(mode, ctx?)` and the hook walks the eligible rows,
 * calling `mode.run(row, ctx)` per row with cancellation + summary toast.
 *
 * Selection survives across renders; it's reset after a successful bulk run and
 * by the consumer's effect on filter / data refresh.
 *
 * Why not own the confirmation step here: some masters need a remarks modal
 * before kicking off (e.g. a remarks-required action). The caller controls the trigger
 * and just calls `process(mode, ctx)` once preconditions are satisfied.
 */
const useBulkActions = ({
  rows = [],
  modes = {},
  cancellable = true,
  onAfter = null,
  getRowId = (row) => row?.id,
}) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [processingMode, setProcessingMode] = useState(null);
  const cancelRef = useRef(false);

  const selectedRows = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const idSet = new Set(selectedIds);
    return rows.filter((row) => idSet.has(getRowId(row)));
  }, [rows, selectedIds, getRowId]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const process = useCallback(
    async (modeKey, ctx = null) => {
      const mode = modes[modeKey];
      if (!mode || typeof mode.run !== 'function') {
        return { ranOnEmpty: true, succeeded: 0, failed: 0 };
      }

      const isProcessable = typeof mode.isProcessable === 'function' ? mode.isProcessable : () => true;
      const scopeRows = selectedIds.length > 0 ? selectedRows : rows;
      const targetRows = scopeRows.filter(isProcessable);

      if (targetRows.length === 0) {
        const inSelection = selectedIds.length > 0;
        const verb = mode.verb || modeKey;
        const noun = mode.noun || 'record';
        toast.info(
          inSelection
            ? `No ${noun}(s) in selection are eligible to ${verb}`
            : `No ${noun}(s) to ${verb}`
        );
        return { ranOnEmpty: true, succeeded: 0, failed: 0 };
      }

      setProcessingMode(modeKey);
      cancelRef.current = false;
      let succeeded = 0;
      let failed = 0;

      for (const row of targetRows) {
        if (cancellable && cancelRef.current) {
          toast.info(`${capitalize(mode.verb || modeKey)} cancelled`);
          break;
        }
        try {
          const result = await mode.run(row, ctx);
          // Treat undefined/true as success; explicit false as failure. Anything
          // shaped like an axios response is unwrapped via .data.success.
          let ok = true;
          if (result === false) ok = false;
          else if (result && typeof result === 'object' && 'data' in result) {
            ok = Boolean(result.data?.success);
          }
          if (ok) succeeded++;
          else failed++;
        } catch (err) {
          failed++;
          // Surface the first error so the user has a clue; the summary toast
          // still fires after the loop finishes.
          if (failed === 1) {
            const msg = err?.response?.data?.message || err?.message;
            if (msg) toast.error(msg);
          }
        }
      }

      setProcessingMode(null);
      setSelectedIds([]);

      const summary = defaultMessage(mode, succeeded, failed);
      if (summary) {
        toast[summary.type](summary.text);
      }

      if (typeof onAfter === 'function') {
        try {
          await onAfter(modeKey, { succeeded, failed });
        } catch (err) {
          console.error('useBulkActions onAfter failed:', err);
        }
      }

      return { ranOnEmpty: false, succeeded, failed };
    },
    [modes, rows, selectedIds, selectedRows, cancellable, onAfter]
  );

  return {
    selectedIds,
    setSelectedIds,
    selectedRows,
    processingMode,
    isProcessing: processingMode !== null,
    process,
    cancel,
  };
};

export { useBulkActions };
