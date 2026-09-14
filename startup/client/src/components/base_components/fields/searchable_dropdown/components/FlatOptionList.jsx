import PropTypes from 'prop-types';
import { ignoreCheckboxChange } from '../utils/menuRows';

/**
 * Plain options: a checkbox row each for multiple, a radio row for single. A
 * row shows its label, or what `renderOption(option)` draws for it.
 */
function FlatOptionList({ options, selectedSet, multiple, activeIndex, onSelect, renderOption }) {
  return options.map((option, index) => {
    const isSelected = selectedSet.has(option.value);
    const isHighlight = Boolean(option.highlight);
    // Rows above the options (the accept row) push their indexes down.
    const isActive = index === activeIndex;
    return (
      <div
        key={option.value}
        role="option"
        aria-selected={isSelected}
        data-active={isActive}
        onClick={() => onSelect(option.value)}
        title={isHighlight ? 'Inactive' : undefined}
        className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
          isSelected ? 'bg-blue-100 font-medium' : isHighlight ? 'bg-red-50' : ''
        } ${isActive ? 'ring-1 ring-inset ring-blue-400 bg-blue-50' : ''}`}
      >
        <div className="flex items-center gap-2">
          <input
            type={multiple ? 'checkbox' : 'radio'}
            checked={isSelected}
            onChange={ignoreCheckboxChange}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div className="min-w-0 flex-1">{renderOption ? renderOption(option) : option.label}</div>
        </div>
      </div>
    );
  });
}

FlatOptionList.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    highlight: PropTypes.bool,
  })).isRequired,
  selectedSet: PropTypes.instanceOf(Set).isRequired,
  multiple: PropTypes.bool.isRequired,
  activeIndex: PropTypes.number.isRequired,
  /** (value) */
  onSelect: PropTypes.func.isRequired,
  /** (option) => node drawn in place of the label. */
  renderOption: PropTypes.func,
};

export { FlatOptionList };
