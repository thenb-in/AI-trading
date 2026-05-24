import PropTypes from "prop-types";

function LayoutActions({
  selectedLayout,
  dirty = false,
  onOpenSaveDialog,
  onClearSelection,
}) {
  return (
    <div className="border-t border-gray-200 mt-4 pt-4">
      {selectedLayout && (
        <div className="bg-green-50 border border-green-300 rounded text-green-800 text-xs font-medium mb-2 py-1 px-2 flex items-center justify-between gap-2">
          <span>
            Active: <strong>{selectedLayout.layout_name}</strong>
            {dirty && <span title="Unsaved manual changes"> *</span>}
          </span>
          {dirty && (
            <span className="text-amber-700 text-[10px] font-semibold">UNSAVED</span>
          )}
        </div>
      )}
      <button
        type="button"
        className={`w-full text-white border-none py-1 px-2 rounded border border-gray-200 cursor-pointer text-xs ${selectedLayout ? "bg-emerald-600" : "bg-blue-600"}`}
        onClick={onOpenSaveDialog}
      >
        {selectedLayout ? "Update Current Layout" : "Save Current Layout"}
      </button>
      {selectedLayout && (
        <button
          type="button"
          className="w-full bg-white text-gray-500 border border-gray-200 mt-1 py-1 px-2 rounded cursor-pointer text-xs"
          onClick={onClearSelection}
        >
          Clear Selection
        </button>
      )}
    </div>
  );
}

LayoutActions.propTypes = {
  selectedLayout: PropTypes.object,
  dirty: PropTypes.bool,
  onOpenSaveDialog: PropTypes.func.isRequired,
  onClearSelection: PropTypes.func.isRequired,
};

export { LayoutActions };
