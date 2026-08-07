import PropTypes from "prop-types";
import { SearchableDropdown } from "@startup/components/base_components/fields/SearchableDropdown";

const LAYOUT_TYPE_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
  { value: "temp", label: "Temporary" },
];

function SaveLayoutDialog({
  selectedLayout,
  newLayoutName,
  newLayoutType,
  includeFilters,
  saving,
  onNameChange,
  onTypeChange,
  onIncludeFiltersChange,
  onSave,
  onCancel,
}) {
  const getSaveButtonClasses = () => {
    const base = "flex-1 text-white border-none py-1 px-2 rounded border border-gray-200 cursor-pointer text-xs";
    if (saving) return `${base} bg-gray-300 text-gray-600 cursor-not-allowed`;
    return `${base} ${selectedLayout ? "bg-emerald-600" : "bg-blue-600"}`;
  };

  return (
    <div className="border-t border-gray-200 mt-4 pt-4">
      <div className="text-xs font-semibold mb-2">
        {selectedLayout ? "Update Layout" : "Save Layout"}
      </div>
      {selectedLayout && (
        <div className="bg-blue-50 border border-blue-300 rounded text-blue-800 text-xs mb-2 py-1 px-2">
          Updating: <strong>{selectedLayout.layout_name}</strong>
        </div>
      )}
      <input
        type="text"
        value={newLayoutName}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Layout name"
        className="w-full border border-gray-200 rounded text-xs box-border mb-2 py-1 px-2"
      />
      <div className="mb-2">
        <SearchableDropdown
          options={LAYOUT_TYPE_OPTIONS}
          selectedValues={newLayoutType}
          onChange={onTypeChange}
          placeholder="Layout type"
          multiple={false}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-700 mb-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={includeFilters}
          onChange={(e) => onIncludeFiltersChange(e.target.checked)}
        />
        Save per-column filters with this layout
      </label>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !newLayoutName.trim()}
          className={getSaveButtonClasses()}
        >
          {saving ? (selectedLayout ? "Updating..." : "Saving...") : (selectedLayout ? "Update" : "Save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="py-1 px-2 rounded border border-gray-200 bg-white cursor-pointer text-xs"
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
  includeFilters: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
  onNameChange: PropTypes.func.isRequired,
  onTypeChange: PropTypes.func.isRequired,
  onIncludeFiltersChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export { SaveLayoutDialog };
