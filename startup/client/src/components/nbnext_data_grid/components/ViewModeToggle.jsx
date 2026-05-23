import PropTypes from "prop-types";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { TOOLBAR_BTN_CLASS } from "../utils/toolbarStyles.js";

const viewModeToggleStyle = { color: "var(--grid-toggle-fg)" };

function ViewModeToggle({ viewMode, onCycle }) {
  const isCards = viewMode === "cards";
  const Icon = isCards ? TableIcon : LayoutGrid;
  const nextLabel = isCards ? "Table" : "Cards";

  return (
    <button
      type="button"
      onClick={onCycle}
      className={TOOLBAR_BTN_CLASS}
      title={`View: ${isCards ? "Cards" : "Table"}. Click to switch to ${nextLabel}.`}
      aria-label="Switch grid view mode"
      style={viewModeToggleStyle}
    >
      <Icon size={14} strokeWidth={2} />
      <span className="hidden sm:inline">{isCards ? "Cards" : "Table"}</span>
    </button>
  );
}

ViewModeToggle.propTypes = {
  viewMode: PropTypes.oneOf(["table", "cards"]).isRequired,
  onCycle: PropTypes.func.isRequired,
};

export { ViewModeToggle };
