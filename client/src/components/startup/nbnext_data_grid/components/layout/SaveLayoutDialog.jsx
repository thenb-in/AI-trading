/**
 * Save Layout Dialog component for saving/updating layouts
 */

import PropTypes from "prop-types";

function SaveLayoutDialog({
  selectedLayout,
  newLayoutName,
  newLayoutType,
  saving,
  onNameChange,
  onTypeChange,
  onSave,
  onCancel,
}) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <div className="text-xs font-semibold mb-2">
        {selectedLayout ? "Update Layout" : "Save Layout"}
      </div>
      {selectedLayout && (
        <div className="py-1.5 px-2 mb-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800">
          Updating: <strong>{selectedLayout.layout_name}</strong>
        </div>
      )}
      <input
        type="text"
        value={newLayoutName}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Layout name"
        className="w-full py-1.5 px-2 mb-2 border border-gray-200 rounded text-xs box-border"
      />
      <select
        value={newLayoutType}
        onChange={(e) => onTypeChange(e.target.value)}
        className="w-full py-1.5 px-2 mb-2 border border-gray-200 rounded text-xs box-border bg-white cursor-pointer"
      >
        <option value="private">Private</option>
        <option value="public">Public</option>
        <option value="temp">Temporary</option>
      </select>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !newLayoutName.trim()}
          className={`flex-1 py-1 px-2 rounded-md border-none text-xs ${
            saving
              ? "bg-gray-200 text-gray-600 cursor-not-allowed"
              : selectedLayout
                ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          } disabled:bg-gray-200 disabled:text-gray-600 disabled:cursor-not-allowed`}
        >
          {saving ? (selectedLayout ? "Updating..." : "Saving...") : (selectedLayout ? "Update" : "Save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="py-1 px-2 rounded-md border border-gray-200 bg-white cursor-pointer text-xs hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

SaveLayoutDialog.propTypes = {
  selectedLayout: PropTypes.object,
  newLayoutName: PropTypes.string.isRequired,
  newLayoutType: PropTypes.string.isRequired,
  saving: PropTypes.bool.isRequired,
  onNameChange: PropTypes.func.isRequired,
  onTypeChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export { SaveLayoutDialog };

