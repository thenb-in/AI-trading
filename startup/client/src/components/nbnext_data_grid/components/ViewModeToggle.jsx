import PropTypes from "prop-types";
import { ChevronDown, Columns3, LayoutGrid, Table as TableIcon } from "lucide-react";
import { TOOLBAR_BTN_CLASS } from "../utils/toolbarStyles.js";

const viewModeToggleStyle = { color: "var(--grid-toggle-fg)" };

// What each view is called and drawn as.
const MODES = {
  table: { label: "Table", icon: TableIcon },
  cards: { label: "Cards", icon: LayoutGrid },
  kanban: { label: "Board", icon: Columns3 },
};
const ORDER = ["table", "cards", "kanban"];

/**
 * Which way the rows are read. With two views the button is the whole control:
 * it says where it will take you, and there is nowhere else to go. Past two,
 * stepping through the views to reach the one you want is the long way round,
 * so they are offered as a list and picked outright.
 */
function ViewModeToggle({ viewMode, onCycle, onSelect = null, availableModes = ORDER }) {
  const current = MODES[viewMode] ?? MODES.table;
  const shown = ORDER.filter((mode) => availableModes.includes(mode));
  const Icon = current.icon;

  if (shown.length > 2 && typeof onSelect === "function") {
    return (
      <div className="relative inline-flex">
        <Icon
          size={14}
          strokeWidth={2}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={viewModeToggleStyle}
        />
        {/* eslint-disable-next-line custom/use-searchable-dropdown -- a three-view toolbar picker, not a field: SearchableDropdown is a full-width form control. */}
        <select
          value={viewMode}
          onChange={(event) => onSelect(event.target.value)}
          className={`${TOOLBAR_BTN_CLASS} appearance-none pl-8 pr-8`}
          title={`View: ${current.label}`}
          aria-label="Grid view mode"
          style={viewModeToggleStyle}
        >
          {shown.map((mode) => (
            <option key={mode} value={mode}>
              {MODES[mode].label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
          style={viewModeToggleStyle}
        />
      </div>
    );
  }

  const next = shown[(shown.indexOf(viewMode) + 1) % shown.length] ?? "table";

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
  /** Steps to the next view; the control where only two are on offer. */
  onCycle: PropTypes.func.isRequired,
  /** Picks a view outright; the control where more than two are on offer. */
  onSelect: PropTypes.func,
  /** The views this grid can show; a grid with no kanban field leaves "kanban" out. */
  availableModes: PropTypes.arrayOf(PropTypes.oneOf(ORDER)),
};

export { ViewModeToggle };
