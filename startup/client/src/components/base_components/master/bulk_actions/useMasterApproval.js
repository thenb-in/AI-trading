import { useCallback, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useDataContext } from '@context/useDataContext';
import { hasPermission } from '@startup/hooks/hasPermission';
import { useBulkActions } from './useBulkActions';

// A record waiting for somebody: 0 pending, 1 approved, 2 rejected — the codes every
// approving master in this app stores.
const isPendingByStatus = (row) => Number(row?.status) === 0;

/**
 * Approve / reject for a master grid: the two row actions, the bulk toolbar and the
 * grid's selection, from one declaration.
 */
const useMasterApproval = ({ approval, rows = [], refresh }) => {
  const { userData } = useDataContext();

  const noun = approval?.noun || 'record';
  const isPending = approval?.isPending || isPendingByStatus;
  const canApprove = Boolean(approval) && hasPermission(approval.permissionKeys?.approve, userData);
  const canReject = Boolean(approval) && hasPermission(approval.permissionKeys?.reject, userData);

  const runDecision = useCallback(async (row, status) => {
    await approval.updateStatus(row.id, status);
    return true;
  }, [approval]);

  const modes = useMemo(() => ({
    approve: {
      run: (row) => runDecision(row, 1),
      isProcessable: isPending,
      verb: 'approve',
      verbedPast: 'approved',
      noun
    },
    reject: {
      run: (row) => runDecision(row, 2),
      isProcessable: isPending,
      verb: 'reject',
      verbedPast: 'rejected',
      noun
    }
  }), [runDecision, isPending, noun]);


  const reload = useCallback(() => (refresh ? refresh() : undefined), [refresh]);

  const bulk = useBulkActions({ rows, modes, cancellable: false, onAfter: reload });
  const { selectedIds, setSelectedIds, selectedRows, processingMode, process } = bulk;

  useEffect(() => {
    setSelectedIds([]);
  }, [rows, setSelectedIds]);

  const decide = useCallback(async (id, status) => {
    const verb = status === 1 ? 'approve' : 'reject';
    if (!window.confirm(`${verb === 'approve' ? 'Approve' : 'Reject'} this ${noun}?`)) {
      return;
    }
    try {
      await approval.updateStatus(id, status);
      toast.success(`${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${verb}d`);
      await reload();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || `Could not ${verb} this ${noun}`);
    }
  }, [approval, noun, reload]);

  const approve = useCallback((id) => decide(id, 1), [decide]);
  const reject = useCallback((id) => decide(id, 2), [decide]);

  const runBulk = useCallback((mode) => {
    const scope = selectedRows.length > 0 ? selectedRows : rows;
    const eligible = scope.filter(isPending);
    if (eligible.length === 0) {
      toast.info(`No pending ${noun}(s) to ${mode}`);
      setSelectedIds([]);
      return;
    }
    if (!window.confirm(`${mode === 'approve' ? 'Approve' : 'Reject'} ${eligible.length} ${noun}(s)?`)) {
      return;
    }
    process(mode);
  }, [selectedRows, rows, isPending, noun, setSelectedIds, process]);

  const bulkApprove = useCallback(() => runBulk('approve'), [runBulk]);
  const bulkReject = useCallback(() => runBulk('reject'), [runBulk]);

  if (!approval) {
    return { actions: [], selectionProps: {}, bulkProps: null };
  }

  return {
    actions: [
      ...(canApprove ? [{ label: 'Approve', onClick: approve, type: 'primary', show: isPending }] : []),
      ...(canReject ? [{ label: 'Reject', onClick: reject, type: 'danger', show: isPending }] : [])
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
        onReject: canReject ? bulkReject : null
      }
      : null
  };
};

export { useMasterApproval };
