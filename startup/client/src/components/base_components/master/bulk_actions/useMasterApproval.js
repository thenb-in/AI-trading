import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useDataContext } from '@context/useDataContext';
import { hasPermission } from '@startup/hooks/hasPermission';
import { getApiErrorMessage } from '@utils/apiErrorMessage';
import { useBulkActions } from './useBulkActions';
import { DecisionRemarksModal } from './DecisionRemarksModal';

// A record waiting for somebody: 0 pending, 1 approved, 2 rejected — the codes every
// approving master in this app stores.
const isPendingByStatus = (row) => Number(row?.status) === 0;

const DECISIONS = {
  approve: { status: 1, label: 'Approve', past: 'approved' },
  reject: { status: 2, label: 'Reject', past: 'rejected' },
};

/**
 * Approve / reject for a master grid: the two row actions, the bulk toolbar and the
 * grid's selection, from one `approval` declaration:
 *
 *   updateStatus(id, status, { remarks, row }) — status 1 approve, 2 reject
 *   permissionKeys { approve, reject }
 *   noun            what a record is called in questions and toasts ('gate pass')
 *   isPending(row)  which rows can still be decided (default: status 0)
 *   remarks         true: every decision, single or bulk, asks for a required
 *                   comment (DecisionRemarksModal) instead of a yes/no confirm,
 *                   and hands it to updateStatus as `remarks`
 *   RemarksContext  a component, given { row }, the comment dialog shows above
 *                   the comment for a single decision (who asked, their reason)
 *   cancellable     true: a bulk run can be stopped part-way from the toolbar
 *
 * `refresh` reloads the grid after each decision (BaseMaster's is silent).
 * `dialog` is the comment dialog while one is open; render it next to the grid.
 */
const useMasterApproval = ({ approval, rows = [], refresh }) => {
  const { userData } = useDataContext();
  // The decision waiting on its comment: { verb, row } for one record, { verb, count } for a bulk run.
  const [asking, setAsking] = useState(null);
  const [isDeciding, setIsDeciding] = useState(false);

  const noun = approval?.noun || 'record';
  const isPending = approval?.isPending || isPendingByStatus;
  const canApprove = Boolean(approval) && hasPermission(approval.permissionKeys?.approve, userData);
  const canReject = Boolean(approval) && hasPermission(approval.permissionKeys?.reject, userData);

  const decide = useCallback(
    (verb, row, remarks) => approval.updateStatus(row.id, DECISIONS[verb].status, { remarks, row }),
    [approval]
  );

  const modes = useMemo(() => Object.fromEntries(Object.entries(DECISIONS).map(([verb, { past }]) => [verb, {
    run: async (row, ctx) => {
      await decide(verb, row, ctx?.remarks);
      return true;
    },
    isProcessable: isPending,
    verb,
    verbedPast: past,
    noun,
  }])), [decide, isPending, noun]);

  const reload = useCallback(() => (refresh ? refresh() : undefined), [refresh]);

  const bulk = useBulkActions({ rows, modes, cancellable: Boolean(approval?.cancellable), onAfter: reload });
  const { selectedIds, setSelectedIds, selectedRows, processingMode, process, cancel } = bulk;

  useEffect(() => {
    setSelectedIds([]);
  }, [rows, setSelectedIds]);

  // True when the record was decided, so a comment dialog stays open on a failure.
  const decideOne = useCallback(async (verb, row, remarks) => {
    try {
      await decide(verb, row, remarks);
      toast.success(`${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${row.id} ${DECISIONS[verb].past}`);
      await reload();
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Could not ${verb} ${noun} ${row.id}`));
      return false;
    }
  }, [decide, noun, reload]);

  const askOne = useCallback((verb) => (id, row) => {
    if (approval.remarks) {
      setAsking({ verb, row });
      return;
    }
    if (window.confirm(`${DECISIONS[verb].label} ${noun} ${id}?`)) decideOne(verb, row);
  }, [approval, noun, decideOne]);

  const runBulk = useCallback((verb) => {
    const scope = selectedRows.length > 0 ? selectedRows : rows;
    const eligible = scope.filter(isPending);
    if (eligible.length === 0) {
      toast.info(`No pending ${noun}(s) to ${verb}`);
      setSelectedIds([]);
      return;
    }
    if (approval.remarks) {
      setAsking({ verb, count: eligible.length });
      return;
    }
    if (window.confirm(`${DECISIONS[verb].label} ${eligible.length} ${noun}(s)?`)) process(verb);
  }, [approval, selectedRows, rows, isPending, noun, setSelectedIds, process]);

  const confirmRemarks = useCallback(async (remarks) => {
    setIsDeciding(true);
    const decided = asking.row
      ? await decideOne(asking.verb, asking.row, remarks)
      : await process(asking.verb, { remarks });
    setIsDeciding(false);
    if (decided !== false) setAsking(null);
  }, [asking, decideOne, process]);

  const closeRemarks = useCallback(() => setAsking(null), []);

  const approveOne = useMemo(() => askOne('approve'), [askOne]);
  const rejectOne = useMemo(() => askOne('reject'), [askOne]);
  const bulkApprove = useCallback(() => runBulk('approve'), [runBulk]);
  const bulkReject = useCallback(() => runBulk('reject'), [runBulk]);

  if (!approval) {
    return { actions: [], selectionProps: {}, bulkProps: null, dialog: null };
  }

  return {
    actions: [
      ...(canApprove ? [{ label: 'Approve', onClick: approveOne, type: 'primary', show: isPending }] : []),
      ...(canReject ? [{ label: 'Reject', onClick: rejectOne, type: 'danger', show: isPending }] : [])
    ],
    selectionProps: {
      enableRowSelection: canApprove || canReject,
      selectedRowIds: selectedIds,
      onSelectionChange: setSelectedIds
    },
    bulkProps: (canApprove || canReject)
      ? {
        selectedCount: selectedRows.length,
        processingMode,
        onApprove: canApprove ? bulkApprove : null,
        onReject: canReject ? bulkReject : null,
        onCancel: approval.cancellable ? cancel : null
      }
      : null,
    dialog: asking
      ? createElement(DecisionRemarksModal, {
        verb: asking.verb,
        noun,
        record: asking.row,
        count: asking.count,
        context: asking.row && approval.RemarksContext ? createElement(approval.RemarksContext, { row: asking.row }) : null,
        isBusy: isDeciding,
        onClose: closeRemarks,
        onConfirm: confirmRemarks,
      })
      : null
  };
};

export { useMasterApproval };
