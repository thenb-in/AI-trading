import { useState } from 'react';
import PropTypes from 'prop-types';
import { ConfirmModal } from '../master_modal/ConfirmModal';

/**
 * The comment an approve or reject needs before it goes ahead — for one record,
 * or one comment shared by every record of a bulk run. `context` is what the
 * decider should see first (who asked, and why); the comment is required.
 */
const DecisionRemarksModal = ({ verb, noun, record, count, context, isBusy, onClose, onConfirm }) => {
  const [remarks, setRemarks] = useState('');
  const trimmed = remarks.trim();
  const label = `${verb.charAt(0).toUpperCase()}${verb.slice(1)}`;
  const subject = record ? `${noun} ${record.id}` : `${count} ${noun}(s)`;

  const handleChange = (event) => setRemarks(event.target.value);
  const handleConfirm = () => onConfirm(trimmed);
  const handleClose = () => {
    if (!isBusy) onClose();
  };

  return (
    <ConfirmModal
      isOpen
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={`${label} ${subject}`}
      message={record
        ? `Add your comment to ${verb} ${subject}. It is stored with the ${noun}.`
        : `Add one comment to ${verb} ${subject}. It is stored on each of them.`}
      confirmText={label}
      busyText="Processing…"
      tone={verb === 'reject' ? 'danger' : 'success'}
      confirmDisabled={!trimmed}
      isBusy={isBusy}
    >
      {context}
      <label htmlFor="decision-remarks" className="mt-4 mb-1 block text-sm font-medium">
        Comment <span className="text-red-600">*</span>
      </label>
      <textarea
        id="decision-remarks"
        value={remarks}
        onChange={handleChange}
        placeholder={`Why ${verb} ${subject} (required)`}
        rows={4}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm box-border"
      />
    </ConfirmModal>
  );
};

DecisionRemarksModal.propTypes = {
  verb: PropTypes.oneOf(['approve', 'reject']).isRequired,
  noun: PropTypes.string.isRequired,
  /** The one record decided; left out for a bulk run. */
  record: PropTypes.object,
  /** How many records a bulk run decides. */
  count: PropTypes.number,
  /** What the decider sees above the comment (approval.RemarksContext). */
  context: PropTypes.node,
  isBusy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export { DecisionRemarksModal };
