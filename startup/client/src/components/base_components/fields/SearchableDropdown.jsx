import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import { ChevronDown, X, Search } from 'lucide-react';
import {
  getCheckboxState,
  toggleNodeSelection,
  getSelectedRoots,
  getLastChildValues,
  getVisibleNodes,
} from '@utils/treeSelect';
import { TreeOptionRow, TreeCheckbox } from './TreeOptionRow';

function SearchableDropdown({
  options = [],
  selectedValues = [],
  onChange,
  placeholder = 'Select...',
  disabled = false,
  multiple = true,
  searchable = true,
  autoOpen = false,
  onClose,
}) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPos, setDropdownPos] = useState(null);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  // Tree mode activates only when the options describe a hierarchy (the
  // Department filter). Every other dropdown keeps the flat rendering.
  const isTree = useMemo(() => options.some((o) => o.hasChildren), [options]);
  const optionByValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const allTreeOption = useMemo(
    () => options.find((o) => o.value === 'all') || null,
    [options]
  );
  const treeNodes = useMemo(
    () => (isTree ? options.filter((o) => o.value !== 'all') : []),
    [isTree, options]
  );
  const lastChildSet = useMemo(() => getLastChildValues(treeNodes), [treeNodes]);
  const visibleTreeNodes = useMemo(
    () => (isTree ? getVisibleNodes(treeNodes, { collapsed, searchTerm }) : []),
    [isTree, treeNodes, collapsed, searchTerm]
  );

  // Keep latest onClose without re-subscribing the listeners on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const updatePosition = useCallback(() => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  // When mounted already-open (autoOpen), measure so the menu can render.
  useEffect(() => {
    if (autoOpen) {
      updatePosition();
    }
  }, [autoOpen, updatePosition]);

  // Close dropdown when clicking outside / pressing Escape
  useEffect(() => {
    const close = () => {
      setIsOpen(false);
      setSearchTerm('');
      onCloseRef.current?.();
    };
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        close();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Flat-mode filtered options
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) updatePosition();
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

  // --- Tree handlers (all logic lives in @utils/tree) ---------------------

  const handleTreeSelect = useCallback(
    (option) => onChange(toggleNodeSelection(option, selectedValues, optionByValue)),
    [onChange, selectedValues, optionByValue]
  );

  const toggleCollapse = useCallback((value, e) => {
    e.stopPropagation();
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const handleRemove = (value, e) => {
    e.stopPropagation();
    const option = isTree ? optionByValue.get(value) : null;
    // A chip is an already-selected node, so toggling removes it and its subtree.
    onChange(
      option
        ? toggleNodeSelection(option, selectedValues, optionByValue)
        : selectedValues.filter((v) => v !== value)
    );
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleInputChangeNoOp = useCallback(() => {
    // No-op: selection is handled by the row onClick, not the checkbox.
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Chips: in tree mode collapse fully-selected subtrees to their top-most node.
  const displayedChips = useMemo(() => {
    const values = isTree
      ? getSelectedRoots(selectedValues, optionByValue)
      : selectedValues;
    return values
      .map((value) => ({ value, label: optionByValue.get(value)?.label }))
      .filter((chip) => chip.label);
  }, [isTree, selectedValues, optionByValue]);

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
          {displayedChips.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            <>
              {displayedChips.map((chip) => {
                const handleRemoveClick = (e) => handleRemove(chip.value, e);
                return (
                  <span
                    key={chip.value}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                  >
                    {chip.label}
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
              {displayedChips.length > 0 && !disabled && (
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

      {/* Dropdown Menu - rendered via portal so it appears above modals */}
      {isOpen && !disabled && dropdownPos && createPortal(
        <Box
          ref={menuRef}
          sx={{
            position: 'absolute',
            top: dropdownPos.top + 4,
            left: dropdownPos.left,
            // Widen tree menus for long, indented labels (e.g. department names).
            width: isTree ? Math.max(dropdownPos.width, 250) : dropdownPos.width,
            maxWidth: '95vw',
            zIndex: 9999,
          }}
          className="bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-hidden"
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search..."
                  className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto max-h-64 py-1">
            {isTree ? (
              visibleTreeNodes.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  No options found
                </div>
              ) : (
                <>
                  {/* "All" sits apart from the tree as a global toggle. */}
                  {!searchTerm && allTreeOption && (
                    <>
                      <div
                        onClick={() => handleTreeSelect(allTreeOption)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer mx-1 rounded-sm hover:bg-blue-50 ${
                          selectedSet.has('all')
                            ? 'text-blue-700 font-semibold'
                            : 'text-gray-700 font-medium'
                        }`}
                      >
                        <TreeCheckbox
                          checked={selectedSet.has('all')}
                          indeterminate={false}
                          onChange={handleInputChangeNoOp}
                        />
                        <span>{allTreeOption.label}</span>
                      </div>
                      <div className="my-1 border-t border-gray-100" />
                    </>
                  )}
                  {visibleTreeNodes.map((option) => {
                    const { checked, indeterminate } = getCheckboxState(option, selectedSet);
                    return (
                      <TreeOptionRow
                        key={option.value}
                        option={option}
                        checked={checked}
                        indeterminate={indeterminate}
                        isCollapsed={collapsed.has(option.value)}
                        isLastChild={lastChildSet.has(option.value)}
                        showChevron={option.hasChildren && !searchTerm}
                        showConnectors={(option.depth || 0) > 0 && !searchTerm}
                        onSelect={() => handleTreeSelect(option)}
                        onToggleCollapse={(e) => toggleCollapse(option.value, e)}
                      />
                    );
                  })}
                </>
              )
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                const isHighlight = !!option.highlight;
                const handleOptionClick = () => handleSelect(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={handleOptionClick}
                    title={isHighlight ? 'Inactive' : undefined}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                      isSelected ? 'bg-blue-100 font-medium' : isHighlight ? 'bg-red-50' : ''
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
        </Box>,
        document.body
      )}
    </div>
  );
}

SearchableDropdown.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      highlight: PropTypes.bool,
      is_active: PropTypes.bool,
      depth: PropTypes.number,
      hasChildren: PropTypes.bool,
      parentValue: PropTypes.string,
      descendants: PropTypes.arrayOf(PropTypes.string),
    })
  ).isRequired,
  selectedValues: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  multiple: PropTypes.bool,
  searchable: PropTypes.bool,
  autoOpen: PropTypes.bool,
  onClose: PropTypes.func,
};

export { SearchableDropdown };
