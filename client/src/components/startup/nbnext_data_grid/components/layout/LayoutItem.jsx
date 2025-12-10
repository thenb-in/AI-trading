/**
 * Layout Item component for individual layout rows
 */

import PropTypes from "prop-types";

function LayoutItem({
  layout,
  isSelected,
  onLoad,
  onDelete,
  onSetDefault,
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 mb-1 rounded bg-gray-50 border border-gray-200">
      <div className="flex-1 text-xs">
        <div className="font-medium flex items-center gap-1.5">
          {layout.layout_name}
          {layout.is_default && (
            <span className="py-0.5 px-1.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-semibold">
              DEFAULT
            </span>
          )}
        </div>
        <div className="text-[11px] text-gray-500">
          {layout.type} • {new Date(layout.created_at).toLocaleDateString()}
        </div>
      </div>
      <label
        className="flex items-center gap-1 text-[11px] cursor-pointer"
        title={layout.is_default ? "Unset as default" : "Set as default"}
      >
        <input
          type="checkbox"
          checked={layout.is_default || false}
          onChange={(e) => onSetDefault(layout, e.target.checked)}
          className="cursor-pointer"
        />
        <span className="text-gray-500">Default</span>
      </label>
      <button
        type="button"
        onClick={() => onLoad(layout)}
        className={`py-1 px-2 rounded-md border cursor-pointer text-xs ${
          isSelected
            ? "bg-blue-100 border-blue-500 font-semibold"
            : "bg-white border-gray-200 font-normal"
        }`}
        title="Load layout"
      >
        {isSelected ? "Active" : "Load"}
      </button>
      <button
        type="button"
        onClick={() => onDelete(layout.id)}
        className="py-1 px-2 rounded-md border border-gray-200 bg-white text-red-600 cursor-pointer text-xs hover:bg-red-50"
        title="Delete layout"
      >
        Delete
      </button>
    </div>
  );
}

LayoutItem.propTypes = {
  layout: PropTypes.object.isRequired,
  isSelected: PropTypes.bool.isRequired,
  onLoad: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onSetDefault: PropTypes.func.isRequired,
};

export { LayoutItem };

