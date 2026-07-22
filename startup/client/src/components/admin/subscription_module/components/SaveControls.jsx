import PropTypes from 'prop-types';
import { Loader2, Save, Undo2 } from 'lucide-react';

function SaveControls({ isDirty, dirtyCount, isSaving, onDiscard, onSave, showSavedHint = false }) {
  return (
    <div className="flex items-center gap-2">
      {isDirty ? (
        <span className="text-xs text-amber-700 font-medium whitespace-nowrap">
          {dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}
        </span>
      ) : (
        showSavedHint && <span className="text-xs text-blue-700 whitespace-nowrap">All changes saved</span>
      )}
      <button
        onClick={onDiscard}
        disabled={!isDirty || isSaving}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Undo2 className="w-3.5 h-3.5" />
        Discard
      </button>
      <button
        onClick={onSave}
        disabled={!isDirty || isSaving}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save Changes
      </button>
    </div>
  );
}

SaveControls.propTypes = {
  isDirty: PropTypes.bool.isRequired,
  dirtyCount: PropTypes.number.isRequired,
  isSaving: PropTypes.bool.isRequired,
  onDiscard: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  showSavedHint: PropTypes.bool,
};

export { SaveControls };
