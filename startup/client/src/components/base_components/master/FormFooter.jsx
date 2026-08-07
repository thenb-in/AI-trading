import PropTypes from 'prop-types';
import { useRef } from 'react';
import { Save } from 'lucide-react';
import { ShortcutHint } from '@startup/components/base_components/ShortcutHint';
import { SHORTCUTS } from '@startup/constants/shortcuts';
import { shortcutTitle } from '@utils/keyboardShortcut';
import { useShortcut } from '@startup/hooks/useShortcut';

const CheckmarkIcon = () => (
  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ICON_VARIANTS = {
  save: <Save className="h-4 w-4 mr-2" />,
  checkmark: <CheckmarkIcon />,
};

const SUBMIT_COLOR_CLASSES = {
  blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  indigo: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
};

/**
 * Standard "Cancel + Save" footer used by master forms (TerminalMasterForm, PositionMasterForm,
 * ContactMasterForm, ...). The submit button shows a spinner while `isLoading`, swaps the label
 * between `creatingLabel` / `updatingLabel` based on `isEditMode`, and uses the per-entity
 * `createLabel` / `updateLabel` for the idle state.
 */
const FormFooter = ({
  onClose,
  isLoading,
  isEditMode,
  createLabel,
  updateLabel,
  creatingLabel = 'Creating...',
  updatingLabel = 'Updating...',
  savingLabel,
  cancelLabel = 'Cancel',
  iconVariant = 'save',
  icon,
  submitDisabled = false,
  submitColor = 'blue',
  hideIcon = false,
}) => {
  const submitRef = useRef(null);
  const submitLabel = isEditMode ? updateLabel : createLabel;
  const canSubmit = !isLoading && !submitDisabled;

  // Clicking the button (rather than calling onSubmit) keeps the browser's own
  // required-field validation in play, exactly as a pointer click would.
  const submitViaShortcut = () => submitRef.current?.click();
  useShortcut(SHORTCUTS.SAVE, submitViaShortcut, { enabled: canSubmit });

  return (
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
      <button
        type="button"
        onClick={onClose}
        title={shortcutTitle(cancelLabel, SHORTCUTS.CANCEL)}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
      >
        {cancelLabel}
        <ShortcutHint shortcut={SHORTCUTS.CANCEL} />
      </button>
      <button
        ref={submitRef}
        type="submit"
        disabled={!canSubmit}
        title={shortcutTitle(submitLabel, SHORTCUTS.SAVE)}
        className={`flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${SUBMIT_COLOR_CLASSES[submitColor]}`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {savingLabel ?? (isEditMode ? updatingLabel : creatingLabel)}
          </>
        ) : (
          <>
            {!hideIcon && (icon ?? ICON_VARIANTS[iconVariant])}
            {submitLabel}
            <ShortcutHint shortcut={SHORTCUTS.SAVE} />
          </>
        )}
      </button>
    </div>
  );
};

FormFooter.propTypes = {
  onClose: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  isEditMode: PropTypes.bool,
  createLabel: PropTypes.string.isRequired,
  updateLabel: PropTypes.string.isRequired,
  creatingLabel: PropTypes.string,
  updatingLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  icon: PropTypes.node,
  iconVariant: PropTypes.oneOf(['save', 'checkmark']),
  submitDisabled: PropTypes.bool,
  submitColor: PropTypes.oneOf(['blue', 'indigo']),
  hideIcon: PropTypes.bool,
  savingLabel: PropTypes.string,
};

export { FormFooter };
