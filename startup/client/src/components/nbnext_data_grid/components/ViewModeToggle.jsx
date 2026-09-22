import PropTypes from "prop-types";
import { Columns3, LayoutGrid, Table as TableIcon } from "lucide-react";
import { TOOLBAR_BTN_CLASS } from "../utils/toolbarStyles.js";

const viewModeToggleStyle = { color: "var(--grid-toggle-fg)" };

// What each mode is called and drawn as, and what pressing the button moves to.
const MODES = {
  table: { label: "Table", icon: TableIcon },
  cards: { label: "Cards", icon: LayoutGrid },
  kanban: { label: "Board", icon: Columns3 },
};
const ORDER = ["table", "cards", "kanban"];

function ViewModeToggle({ viewMode, onCycle, availableModes = ORDER }) {
  const current = MODES[viewMode] ?? MODES.table;
  const shown = ORDER.filter((mode) => availableModes.includes(mode));
  const next = shown[(shown.indexOf(viewMode) + 1) % shown.length] ?? "table";
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={() => onCycle(availableModes)}
      className={TOOLBAR_BTN_CLASS}
      title={`View: ${current.label}. Click to switch to ${MODES[next].label}.`}
      aria-label="Switch grid view mode"
      style={viewModeToggleStyle}
    >
      <Icon size={14} strokeWidth={2} />
      <span className="hidden sm:inline">{current.label}</span>
    </button>
  );
}

ViewModeToggle.propTypes = {
  viewMode: PropTypes.oneOf(ORDER).isRequired,
  onCycle: PropTypes.func.isRequired,
  /** The modes this grid can show; a grid with no kanban field leaves "kanban" out. */
  availableModes: PropTypes.arrayOf(PropTypes.oneOf(ORDER)),
};

export { ViewModeToggle };
