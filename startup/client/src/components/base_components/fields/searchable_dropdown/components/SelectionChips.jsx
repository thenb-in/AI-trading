import PropTypes from 'prop-types';
import { X } from 'lucide-react';

/** One chip per picked value in a multi-select, each removable unless disabled. */
function SelectionChips({ chips, disabled, onRemove }) {
  return chips.map((chip) => (
    <span
      key={chip.value}
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
    >
      {chip.label}
      {!disabled && (
        <button
          type="button"
          onClick={(e) => onRemove(chip.value, e)}
          className="hover:bg-blue-100 rounded p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  ));
}

SelectionChips.propTypes = {
  chips: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  disabled: PropTypes.bool.isRequired,
  /** (value, event) */
  onRemove: PropTypes.func.isRequired,
};

export { SelectionChips };
