import PropTypes from 'prop-types';
import { X, Plus, Loader2 } from 'lucide-react';
import { ShortcutHint } from '@startup/components/base_components/ShortcutHint';
import { SHORTCUTS } from '@startup/constants/shortcuts';
import { shortcutTitle } from '@utils/keyboardShortcut';
import { useShortcut } from '@startup/hooks/useShortcut';

/**
 * The two buttons at the foot of a modal: Cancel, and the one that goes ahead.
 *
 * A modal that owns a <form> passes `formId` instead of `onConfirm` — the
 * button then submits that form from outside it, so the browser still checks
 * required fields, and Save keeps its shortcut. `isBusy` holds both buttons
 * while the save runs and says so on the button.
 */
const MasterModalActions = ({
  onCancel,
  onConfirm,
  formId,
  confirmLabel = 'Save',
  confirmIcon,
  cancelLabel = 'Cancel',
  isBusy = false,
  busyLabel = 'Saving...'
}) => {
  const confirm = onConfirm ?? (() => document.getElementById(formId)?.requestSubmit());
  useShortcut(SHORTCUTS.SAVE, confirm);

  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        disabled={isBusy}
        title={shortcutTitle(cancelLabel, SHORTCUTS.CANCEL)}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <X className="w-4 h-4 inline mr-2" />
        {cancelLabel}
        <ShortcutHint shortcut={SHORTCUTS.CANCEL} />
      </button>
      <button
        type={formId ? 'submit' : 'button'}
        form={formId}
        onClick={onConfirm}
        disabled={isBusy}
        title={shortcutTitle(confirmLabel, SHORTCUTS.SAVE)}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isBusy
          ? <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
          : confirmIcon ?? <Plus className="w-4 h-4 inline mr-2" />}
        {isBusy ? busyLabel : confirmLabel}
        <ShortcutHint shortcut={SHORTCUTS.SAVE} />
      </button>
    </>
  );
};

MasterModalActions.propTypes = {
  onCancel: PropTypes.func.isRequired,
  /** What Save runs. A modal that owns a form gives `formId` instead. */
  onConfirm: PropTypes.func,
  /** The id of the form this footer submits, when the form is not around it. */
  formId: PropTypes.string,
  confirmLabel: PropTypes.string,
  confirmIcon: PropTypes.node,
  cancelLabel: PropTypes.string,
  isBusy: PropTypes.bool,
  busyLabel: PropTypes.string,
};

export { MasterModalActions };
