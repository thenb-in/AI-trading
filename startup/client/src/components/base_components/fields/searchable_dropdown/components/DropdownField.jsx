import PropTypes from 'prop-types';
import { ChevronDown, X } from 'lucide-react';
import { useFieldDisplay } from '../hooks/useFieldDisplay';
import { SelectionChips } from './SelectionChips';

/**
 * What sits on the form: the picked value (plain text for single-select, chips
 * for multiple), the inline search box, the clear button and the chevron.
 */
function DropdownField({
  isMuted,
  wrapLabel,
  triggerRef,
  inputRef,
  onFieldClick,
  onToggle,
  onTriggerKeyDown,
  onInputKeyDown,
  onSearchChange,
  onRemove,
  onClearAll,
  ...state
}) {
  const { multiple, searchable, disabled, isOpen, searchTerm } = state;
  const {
    fieldChips, fieldPlaceholder, singleLabel, showSingleLabel, inputPlaceholder, showClear, borderClass, title,
  } = useFieldDisplay(state);

  // Combobox semantics and the tab stop belong on whatever the user types into,
  // so they move onto the inline search box when there is one.
  const comboboxProps = {
    role: 'combobox',
    'aria-expanded': isOpen,
    'aria-haspopup': 'listbox',
    'aria-disabled': disabled,
    tabIndex: disabled ? -1 : 0,
  };

  // Single-select has a full row for one value, so wrapping beats clipping.
  const shouldWrapLabel = wrapLabel || !multiple;

  return (
    <>
      <div
        ref={triggerRef}
        {...(searchable ? {} : { ...comboboxProps, onKeyDown: onTriggerKeyDown })}
        onClick={onFieldClick}
        title={title}
        className={`flex items-center w-full min-h-[38px] px-2 py-1.5 text-sm border rounded text-gray-900 focus-within:outline-none focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 ${
          isMuted ? 'bg-gray-100 opacity-60' : 'bg-white'
        } ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        } ${borderClass}`}
      >
        <div className={`flex flex-1 min-w-0 flex-wrap gap-1 ${shouldWrapLabel ? 'items-start' : 'items-center'}`}>
          {/* Single-select has exactly one value, so show it as plain text — the
              outer clear button is the only affordance needed. It steps aside
              once the field is open for entry, becoming its placeholder. */}
          {showSingleLabel && (
            <span
              className={`flex-1 min-w-0 text-gray-900 ${
                shouldWrapLabel ? 'break-words whitespace-normal' : 'truncate'
              }`}
            >
              {singleLabel}
            </span>
          )}
          {multiple && <SelectionChips chips={fieldChips} disabled={disabled} onRemove={onRemove} />}
          {/* The search box lives in the field rather than as a row inside the
              menu: same typing, one row less of vertical chrome. */}
          {searchable ? (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              disabled={disabled}
              onChange={onSearchChange}
              onKeyDown={onInputKeyDown}
              placeholder={inputPlaceholder}
              aria-autocomplete="list"
              {...comboboxProps}
              className={`cursor-text border-0 bg-transparent p-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed ${
                showSingleLabel ? 'w-3 shrink-0' : 'flex-1 w-0 min-w-[3rem]'
              }`}
            />
          ) : (
            fieldChips.length === 0 && (
              <span className="text-gray-400">{fieldPlaceholder}</span>
            )
          )}
          {showClear && (
            <button
              type="button"
              onClick={onClearAll}
              className="ml-auto mr-5 shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* The explicit open/close toggle, since clicking the field places the
          caret in the inline search box instead. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onClick={onToggle}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 disabled:pointer-events-none"
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>
    </>
  );
}

const refPropType = PropTypes.shape({ current: PropTypes.any });

DropdownField.propTypes = {
  isMuted: PropTypes.bool.isRequired,
  wrapLabel: PropTypes.bool.isRequired,
  triggerRef: refPropType.isRequired,
  inputRef: refPropType.isRequired,
  onFieldClick: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onTriggerKeyDown: PropTypes.func.isRequired,
  onInputKeyDown: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
  // Read by useFieldDisplay.
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  optionByValue: PropTypes.instanceOf(Map).isRequired,
  isTree: PropTypes.bool.isRequired,
  multiple: PropTypes.bool.isRequired,
  searchable: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  hasOptions: PropTypes.bool.isRequired,
  placeholder: PropTypes.string.isRequired,
  defaultOptionValue: PropTypes.string.isRequired,
  isOnlyDefaultSelected: PropTypes.bool.isRequired,
  searchTerm: PropTypes.string.isRequired,
  unknownSelections: PropTypes.arrayOf(PropTypes.string).isRequired,
  allowOptionsOutsideSelectBox: PropTypes.bool.isRequired,
};

export { DropdownField };
