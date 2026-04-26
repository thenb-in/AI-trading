/**
 * Layout Item component for individual layout rows
 */

import PropTypes from "prop-types";
import { CheckboxTypeField } from '@base_components/fields/CheckboxTypeField';
import { parseDateValue } from "@utils/startup/dateTimeUtils";

function LayoutItem({
  layout,
  isSelected,
  onLoad,
  onDelete,
  onSetDefault,
}) {
  return (
    <div className="flex items-center bg-gray-50 border border-gray-200 rounded gap-2 py-1 px-2 mb-1">
      <div className="flex-1 text-xs">
        <div className="font-medium flex items-center gap-1">
          {layout.layout_name}
          {layout.is_default && (
            <span className="bg-yellow-100 text-yellow-800 rounded font-semibold text-xs py-0.5 px-1">
              DEFAULT
            </span>
          )}
        </div>
        <div className="text-gray-500 text-xs">
          {layout.type} • {parseDateValue(layout.created_at)?.toLocaleDateString() ?? ""}
        </div>
      </div>
      <label
        className="flex items-center cursor-pointer text-xs gap-1"
        title={layout.is_default ? "Unset as default" : "Set as default"}
      >
        <CheckboxTypeField
          mode="bare"
          checked={layout.is_default || false}
          onChange={(e) => onSetDefault(layout, e.target.checked)}
          className="cursor-pointer"
        />
        <span className="text-gray-500">Default</span>
      </label>
      <button
        type="button"
        onClick={() => onLoad(layout)}
        className={`py-1 px-2 rounded cursor-pointer text-xs ${isSelected ? "bg-blue-100 border border-blue-500 font-semibold" : "bg-white border border-gray-200"}`}
        title="Load layout"
      >
        {isSelected ? "Active" : "Load"}
      </button>
      <button
        type="button"
        onClick={() => onDelete(layout.id)}
        className="text-red-600 py-1 px-2 rounded border border-gray-200 bg-white cursor-pointer text-xs"
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

