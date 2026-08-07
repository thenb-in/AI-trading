import PropTypes from 'prop-types';
import { X, Plus } from 'lucide-react';
import { ShortcutHint } from '@startup/components/base_components/ShortcutHint';
import { SHORTCUTS } from '@startup/constants/shortcuts';
import { shortcutTitle } from '@utils/keyboardShortcut';
import { useShortcut } from '@startup/hooks/useShortcut';

const MasterModalActions = ({ onCancel, onConfirm, confirmLabel = 'Save', confirmIcon, cancelLabel = 'Cancel' }) => {
  useShortcut(SHORTCUTS.SAVE, onConfirm);

  return (
    <>
      <button
        onClick={onCancel}
        title={shortcutTitle(cancelLabel, SHORTCUTS.CANCEL)}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <X className="w-4 h-4 inline mr-2" />
        {cancelLabel}
        <ShortcutHint shortcut={SHORTCUTS.CANCEL} />
      </button>
      <button
        onClick={onConfirm}
        title={shortcutTitle(confirmLabel, SHORTCUTS.SAVE)}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        {confirmIcon ?? <Plus className="w-4 h-4 inline mr-2" />}
        {confirmLabel}
        <ShortcutHint shortcut={SHORTCUTS.SAVE} />
      </button>
    </>
  );
};

MasterModalActions.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  confirmLabel: PropTypes.string,
  confirmIcon: PropTypes.node,
  cancelLabel: PropTypes.string,
};

export { MasterModalActions };
