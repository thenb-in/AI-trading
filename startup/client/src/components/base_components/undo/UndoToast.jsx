import { useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { Undo2 } from 'lucide-react';
import { undoService } from '@startup/services/undoService';

/**
 * The success notification for a write, with the take-it-back built in.
 *
 * The moment a mistake is noticed is the moment the confirmation appears —
 * "marked present" is exactly when the wrong name or date registers. So the
 * toast carries all of it: what happened, who and when it happened to, and the
 * way back. The detail line is what makes it checkable at a glance; "Attendance
 * updated" alone gives the user nothing to spot an error in.
 */
const UNDO_TOAST_DURATION_MS = 15000;

const UndoToastBody = ({ message, detail, batchId, onUndone, closeToast }) => {
  const [isUndoing, setIsUndoing] = useState(false);

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      const response = await undoService.undoBatch(batchId);
      if (response.data?.success) {
        toast.success(response.data.message || 'Undone');
        if (onUndone) await onUndone();
      } else {
        toast.error(response.data?.message || 'Could not undo');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not undo');
    } finally {
      setIsUndoing(false);
      if (closeToast) closeToast();
    }
  };

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm">{message}</div>
        {detail && <div className="text-xs opacity-75 mt-0.5 truncate">{detail}</div>}
      </div>
      <button
        type="button"
        onClick={handleUndo}
        disabled={isUndoing}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-60 whitespace-nowrap flex-shrink-0"
      >
        <Undo2 className="h-3 w-3" />
        {isUndoing ? 'Undoing…' : 'Undo'}
      </button>
    </div>
  );
};

UndoToastBody.propTypes = {
  message: PropTypes.string.isRequired,
  detail: PropTypes.string,
  batchId: PropTypes.string.isRequired,
  onUndone: PropTypes.func,
  closeToast: PropTypes.func
};

/**
 * @param {string} message What just happened, e.g. "Marked Present".
 * @param {string} [detail] Who and when — the part the user scans for a mistake.
 * @param {string} batchId Batch returned by runAsBatch.
 * @param {Function} [onUndone] Refresh callback once the undo lands.
 */
const showUndoToast = ({ message, detail, batchId, onUndone }) => {
  if (!batchId) {
    toast.success(message);
    return;
  }

  toast.success(
    ({ closeToast }) => (
      <UndoToastBody
        message={message}
        detail={detail}
        batchId={batchId}
        onUndone={onUndone}
        closeToast={closeToast}
      />
    ),
    { autoClose: UNDO_TOAST_DURATION_MS, closeOnClick: false }
  );
};

export { showUndoToast, UNDO_TOAST_DURATION_MS };
