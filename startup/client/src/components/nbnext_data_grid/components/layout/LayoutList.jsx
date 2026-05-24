import PropTypes from "prop-types";
import { LayoutItem } from "./LayoutItem.jsx";

function LayoutList({
  layoutList,
  title,
  selectedLayoutId,
  activeLayoutId = null,
  dirty = false,
  onLoad,
  onDelete,
  onSetDefault,
}) {
  if (layoutList.length === 0) {
    return (
      <div className="text-xs text-gray-600 italic mb-2">
        No {title.toLowerCase()} layouts
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-gray-700 mb-1">
        {title} ({layoutList.length})
      </div>
      {layoutList.map((layout) => (
        <LayoutItem
          key={layout.id}
          layout={layout}
          isSelected={selectedLayoutId === layout.id}
          isActive={activeLayoutId === layout.id}
          dirty={dirty}
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
  activeLayoutId: PropTypes.number,
  dirty: PropTypes.bool,
  onLoad: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onSetDefault: PropTypes.func.isRequired,
};

export { LayoutList };
