import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';
import { BaseModal } from './BaseModal';

/**
 * "Are you sure?" as one component: a BaseModal carrying a question, a Cancel,
 * and the one button that goes ahead.
 *
 * `tone` says how the action reads — `danger` for what cannot be undone,
 * `warning` for what takes something away, `primary` for the rest — and colours
 * the button and the icon together, so no screen picks its own reds.
 *
 * Anything the decision needs answering first (a role to approve someone with)
 * goes in as children, under the question. `confirmDisabled` holds the button
 * while such an answer is missing; `isBusy` holds it while the action runs.
 */
const TONES = {
  danger: { button: 'bg-red-600 hover:bg-red-700', icon: 'text-red-500' },
  warning: { button: 'bg-yellow-600 hover:bg-yellow-700', icon: 'text-yellow-500' },
  primary: { button: 'bg-blue-600 hover:bg-blue-700', icon: 'text-blue-500' },
  success: { button: 'bg-green-600 hover:bg-green-700', icon: 'text-green-600' }
};

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'danger',
  confirmDisabled = false,
  isBusy = false,
  busyText,
  children
}) => {
  const { button, icon } = TONES[tone] || TONES.danger;
  const blocked = confirmDisabled || isBusy;

  const heading = (
    <span className="flex items-center gap-2.5">
      <AlertTriangle className={icon} size={22} />
      <span className="text-lg font-bold">{title}</span>
    </span>
  );

  const actions = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={isBusy}
        className="px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50"
      >
        {cancelText}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={blocked}
        className={`px-4 py-2 rounded-md text-white transition-colors ${button} ${blocked ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isBusy ? busyText || confirmText : confirmText}
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={heading}
      maxWidth="xs"
      showAudit={false}
      actions={actions}
    >
      <p className="text-gray-700">{message}</p>
      {children}
    </BaseModal>
  );
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.node,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  tone: PropTypes.oneOf(['danger', 'warning', 'primary', 'success']),
  /** Holds the button while the decision is missing something it needs. */
  confirmDisabled: PropTypes.bool,
  /** Holds both buttons while the action runs. */
  isBusy: PropTypes.bool,
  busyText: PropTypes.string,
  /** What the decision needs answering first, under the question. */
  children: PropTypes.node
};

export { ConfirmModal };
