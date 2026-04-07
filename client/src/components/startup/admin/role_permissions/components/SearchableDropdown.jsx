import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, X ,Search} from 'lucide-react';
import { SearchTypeField } from '@base_components/fields/SearchTypeField';

function SearchableDropdown({
  options = [],
  selectedValues = [],
  onChange,
  placeholder = 'Select...',
  disabled = false,
  multiple = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (value) => {
    if (multiple) {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      onChange(newValues);
    } else {
      onChange([value]);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleRemove = (value, e) => {
    e.stopPropagation();
    const newValues = selectedValues.filter((v) => v !== value);
    onChange(newValues);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleInputChangeNoOp = useCallback(() => {
    // No-op handler for checkbox/radio - selection is handled by parent div onClick
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const getSelectedLabels = () => {
    return selectedValues
      .map((value) => options.find((opt) => opt.value === value)?.label)
      .filter(Boolean);
  };

  const selectedLabels = getSelectedLabels();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input/Display */}
      <div
        onClick={handleToggle}
        className={`w-full min-h-[38px] px-2 py-1.5 text-sm border rounded bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer ${
          disabled
            ? 'bg-gray-100 cursor-not-allowed opacity-60'
            : 'hover:border-gray-400'
        } ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}`}
      >
        <div className="flex items-center flex-wrap gap-1">
          {selectedLabels.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            <>
              {selectedLabels.map((label, index) => {
                const value = selectedValues[index];
                const handleRemoveClick = (e) => handleRemove(value, e);
                return (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                  >
                    {label}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={handleRemoveClick}
                        className="hover:bg-blue-100 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                );
              })}
              {selectedLabels.length > 0 && !disabled && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dropdown Icon */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <SearchTypeField
              icon={<Search className="w-4 h-4 text-gray-400" />}
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search..."
              autoFocus={true}
              className="w-full text-sm py-1.5"
            />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                const handleOptionClick = () => handleSelect(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={handleOptionClick}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                      isSelected ? 'bg-blue-100 font-medium' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type={multiple ? 'checkbox' : 'radio'}
                        checked={isSelected}
                        onChange={handleInputChangeNoOp}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span>{option.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

SearchableDropdown.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedValues: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  multiple: PropTypes.bool,
};

export { SearchableDropdown };

