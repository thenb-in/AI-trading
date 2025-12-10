/**
 * Layout List component for rendering lists of layouts
 */

import PropTypes from "prop-types";
import { LayoutItem } from "./LayoutItem.jsx";

function LayoutList({
  layoutList,
  title,
  selectedLayoutId,
  onLoad,
  onDelete,
  onSetDefault,
}) {
  if (layoutList.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic mb-2">
        No {title.toLowerCase()} layouts
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="text-xs font-semibold mb-1.5 text-gray-700">
        {title} ({layoutList.length})
      </div>
      {layoutList.map((layout) => (
        <LayoutItem
          key={layout.id}
          layout={layout}
          isSelected={selectedLayoutId === layout.id}
          onLoad={onLoad}
          onDelete={onDelete}
          onSetDefault={onSetDefault}
        />
      ))}
    </div>
  );
}

LayoutList.propTypes = {
  layoutList: PropTypes.array.isRequired,
  title: PropTypes.string.isRequired,
  selectedLayoutId: PropTypes.number,
  onLoad: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onSetDefault: PropTypes.func.isRequired,
};

export { LayoutList };

