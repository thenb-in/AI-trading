import PropTypes from 'prop-types';
import { useRef } from 'react';
import { Save } from 'lucide-react';
import { ShortcutHint } from '@startup/components/base_components/ShortcutHint';
import { SHORTCUTS } from '@startup/constants/shortcuts';
import { shortcutTitle } from '@utils/keyboardShortcut';
import { useShortcut } from '@startup/hooks/useShortcut';

/**
 * FormModal's Cancel + Save footer. Save submits the form named by `formId`,
 * and shows a spinner with `savingLabel` while `isSaving`. A form's own buttons
 * land in the `actionsRef` slot, before Cancel; `canSubmit: false` hides Save.
 */
const FormFooter = ({ formId, onClose, isSaving, canSubmit, actionsRef, submitLabel, savingLabel }) => {
  const submitRef = useRef(null);

  // Clicking the button (rather than calling onSubmit) keeps the browser's own
  // required-field validation in play, exactly as a pointer click would.
  const submitViaShortcut = () => submitRef.current?.click();
  useShortcut(SHORTCUTS.SAVE, submitViaShortcut, { enabled: canSubmit && !isSaving });

  return (
    <div className="flex w-full flex-wrap justify-end gap-3 pt-4 border-t border-gray-200">
      <div ref={actionsRef} className="contents" />
      <button
        type="button"
        onClick={onClose}
        title={shortcutTitle('Cancel', SHORTCUTS.CANCEL)}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
      >
        Cancel
        <ShortcutHint shortcut={SHORTCUTS.CANCEL} />
      </button>
      {canSubmit && <button
        ref={submitRef}
        type="submit"
        form={formId}
        disabled={isSaving}
        title={shortcutTitle(submitLabel, SHORTCUTS.SAVE)}
        className="flex items-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {savingLabel}
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            {submitLabel}
            <ShortcutHint shortcut={SHORTCUTS.SAVE} />
          </>
        )}
      </button>}
    </div>
  );
};

FormFooter.propTypes = {
  formId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  isSaving: PropTypes.bool.isRequired,
  canSubmit: PropTypes.bool.isRequired,
  actionsRef: PropTypes.func.isRequired,
  submitLabel: PropTypes.string.isRequired,
  savingLabel: PropTypes.string.isRequired,
};

export { FormFooter };
