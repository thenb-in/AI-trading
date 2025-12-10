/**
 * Layout Actions component for action buttons section
 */

import PropTypes from "prop-types";

function LayoutActions({
  selectedLayout,
  onOpenSaveDialog,
  onClearSelection,
}) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      {selectedLayout && (
        <div className="py-1.5 px-2 mb-2 bg-green-50 border border-green-300 rounded text-[11px] text-green-800">
          Active: <strong>{selectedLayout.layout_name}</strong>
        </div>
      )}
      <button
        type="button"
        onClick={onOpenSaveDialog}
        className={`w-full py-1 px-2 rounded-md border-none cursor-pointer text-xs text-white ${
          selectedLayout ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {selectedLayout ? "Update Current Layout" : "Save Current Layout"}
      </button>
      {selectedLayout && (
        <button
          type="button"
          onClick={onClearSelection}
          className="w-full mt-1.5 py-1 px-2 rounded-md border border-gray-200 bg-white text-gray-500 cursor-pointer text-xs hover:bg-gray-50"
        >
          Clear Selection
        </button>
      )}
    </div>
  );
}

LayoutActions.propTypes = {
  selectedLayout: PropTypes.object,
  onOpenSaveDialog: PropTypes.func.isRequired,
  onClearSelection: PropTypes.func.isRequired,
};

export { LayoutActions };

