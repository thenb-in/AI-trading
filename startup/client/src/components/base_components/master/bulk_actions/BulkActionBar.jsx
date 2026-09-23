import PropTypes from 'prop-types';
import { CheckCheck, X } from 'lucide-react';

// The button says what pressing it will do. Nothing ticked means the whole
// list, which is how a queue is cleared at month end; tick some rows and it
// narrows to those, and says how many, so nobody decides more than they meant.
const defaultLabel = (verb, count) =>
  count > 0 ? `${verb} Selected (${count})` : `${verb} All`;

/**
 * Standard bulk-action toolbar for master tables: Approve / Reject buttons
 * with selection-count labels, plus a Cancel button when a bulk run is in
 * flight. Pure presentational — pair with `useBulkActions` (or any state
 * source) to wire it up.
 *
 * A button is offered only where its handler is, so whoever wires this up
 * decides by permission which decisions are on the bar: `useMasterApproval`
 * passes `onApprove` only to someone who may approve, and `onReject` only to
 * someone who may reject, so a user who holds one of the two sees one button.
 */
const BulkActionBar = ({
  visible = true,
  selectedCount = 0,
  processingMode = null,
  onApprove = null,
  onReject = null,
  onCancel = null,
  approveLabel,
  rejectLabel,
  disabled = false,
  className = '',
}) => {
  if (!visible) return null;
  if (!onApprove && !onReject) return null;

  const isProcessing = processingMode !== null;

  if (isProcessing) {
    const cancelText = `Cancel ${processingMode === 'approve' ? 'Approve' : processingMode === 'reject' ? 'Reject' : ''}`.trim();
    return (
      <div className={`mb-4 flex justify-end gap-2 ${className}`}>
        {typeof onCancel === 'function' ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors whitespace-nowrap"
          >
            {cancelText || 'Cancel'}
          </button>
        ) : (
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <span className="animate-spin">⏳</span>
            Processing...
          </span>
        )}
      </div>
    );
  }

  const approveText = approveLabel
    ? approveLabel(selectedCount)
    : defaultLabel('Approve', selectedCount);
  const rejectText = rejectLabel
    ? rejectLabel(selectedCount)
    : defaultLabel('Reject', selectedCount);

  return (
    <div className={`mb-4 flex justify-end gap-2 ${className}`}>
      {onApprove && (
        <button
          type="button"
          onClick={onApprove}
          disabled={disabled}
          className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors whitespace-nowrap"
        >
          <CheckCheck className="h-4 w-4 mr-2" />
          {approveText}
        </button>
      )}
      {onReject && (
        <button
          type="button"
          onClick={onReject}
          disabled={disabled}
          className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors whitespace-nowrap"
        >
          <X className="h-4 w-4 mr-2" />
          {rejectText}
        </button>
      )}
    </div>
  );
};

BulkActionBar.propTypes = {
  visible: PropTypes.bool,
  selectedCount: PropTypes.number,
  processingMode: PropTypes.oneOf(['approve', 'reject', null]),
  onApprove: PropTypes.func,
  onReject: PropTypes.func,
  onCancel: PropTypes.func,
  approveLabel: PropTypes.func,
  rejectLabel: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export { BulkActionBar };
