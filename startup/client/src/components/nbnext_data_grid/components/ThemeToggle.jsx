import PropTypes from "prop-types";
import { Palette } from "lucide-react";
import { TOOLBAR_BTN_CLASS } from "../utils/toolbarStyles.js";

const themeToggleStyle = { color: "var(--grid-toggle-fg)" };

function ThemeToggle({ themeLabel, onCycle }) {
  return (
    <button
      type="button"
      onClick={onCycle}
      className={TOOLBAR_BTN_CLASS}
      title={`Theme: ${themeLabel}. Click to switch.`}
      aria-label="Switch grid theme"
      style={themeToggleStyle}
    >
      <Palette size={14} strokeWidth={2} />
      <span>{themeLabel}</span>
    </button>
  );
}

ThemeToggle.propTypes = {
  themeLabel: PropTypes.string.isRequired,
  onCycle: PropTypes.func.isRequired,
};

export { ThemeToggle };
