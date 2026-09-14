import { useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useAnchoredPosition } from '@/hooks/useAnchoredPosition';
import { useClickOutsideToClose } from '@/hooks/useClickOutsideToClose';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useMenuOpenState } from './searchable_dropdown/hooks/useMenuOpenState';
import { useSelection } from './searchable_dropdown/hooks/useSelection';
import { useVisibleOptions } from './searchable_dropdown/hooks/useVisibleOptions';
import { useFreeText } from './searchable_dropdown/hooks/useFreeText';
import { useCreateOption } from './searchable_dropdown/hooks/useCreateOption';
import { useKeyboardNav } from './searchable_dropdown/hooks/useKeyboardNav';
import { getMenuRowLayout } from './searchable_dropdown/utils/menuRows';
import { DropdownField } from './searchable_dropdown/components/DropdownField';
import { DropdownMenu } from './searchable_dropdown/components/DropdownMenu';
import { FlatOptionList } from './searchable_dropdown/components/FlatOptionList';
import { TreeOptionList } from './searchable_dropdown/components/TreeOptionList';
import { NavigateButton } from './searchable_dropdown/components/NavigateButton';

// The menu is free to be wider than the field it hangs off, and has to be: a
// field sized to a table cell would otherwise truncate every option to a few
// characters, which is how two roles both end up reading "comp…". Tree menus
// need more room again for indented labels.
const MENU_MIN_WIDTH = 220;
const MENU_TREE_MIN_WIDTH = 250;

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
  onOpen,
  defaultOptionValue = 'all',
  loading = false,
  // Offer an "Add new" row at the foot of the menu, so a value that doesn't
  // exist yet can be created without leaving the form.
  onCreateOption = null,
  // What the dropdown is picking ("Role", "Subscription"). Enough on its own
  // to phrase the create row — callers only reach for createOptionLabel when
  // they want wording this can't produce.
  optionName = null,
  createOptionLabel = null,
  // Let a long label wrap instead of being clipped to an ellipsis. Defaults on
  // for single-select, where there is a whole row to spend on one value.
  wrapLabel = false,
  // Render a jump-to-record affordance beside the field once something is
  // picked. The caller decides where it goes.
  onNavigate = null,
  // Typed text is a value too: offered as an "Accept" row, and kept when the
  // field is left without picking. Such a value wears the red border.
  allowOptionsOutsideSelectBox = false,
}) {
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const { isOpen, searchTerm, setSearchTerm, openMenu, closeMenu, closeAfterPick, commitOnLeaveRef } =
    useMenuOpenState({ autoOpen, onOpen, onClose });

  const optionByValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const hasOptions = options.length > 0;

  const {
    selected, selectedSet, isOnlyDefaultSelected, unknownSelections,
    pickValue, addValue, removeValue, toggleTreeNode, clearValues,
  } = useSelection({
    selectedValues, multiple, onChange, optionByValue, hasOptions, defaultOptionValue, loading, allowOptionsOutsideSelectBox,
  });

  const {
    isTree, filteredOptions, hiddenMatchCount, allTreeOption, visibleTreeNodes, lastChildSet,
    collapsed, toggleCollapse, navigableOptions, hasVisibleOptions,
  } = useVisibleOptions({ options, searchTerm, defaultOptionValue });

  const { acceptText, commitTypedText } = useFreeText({
    enabled: allowOptionsOutsideSelectBox, isTree, searchTerm, options, addValue,
  });
  commitOnLeaveRef.current = commitTypedText;

  const { createOptionText, createFromSearch } = useCreateOption({
    onCreateOption, createOptionLabel, optionName, searchTerm, closeAfterPick,
  });

  // Nothing to pick from reads the same as unavailable, so mute the control.
  // It stays clickable though — opening it explains why via "No options found".
  // An empty list that is still loading is not "nothing to pick" yet, neither
  // is one belonging to a dropdown that fetches on open (`onOpen`), and free
  // text always has something to pick.
  const isEmpty = !hasOptions && !loading && !onOpen && !allowOptionsOutsideSelectBox;

  // Whichever element the user actually types into — the inline search box when
  // searchable, the box itself when not. Keyboard dismissal and post-selection
  // both need to hand focus back to it.
  const focusField = useCallback(() => {
    (inputRef.current || triggerRef.current).focus();
  }, []);

  const cancelMenu = useCallback(() => {
    closeMenu({ keepTyped: false });
    focusField();
  }, [closeMenu, focusField]);

  // An open menu owns Escape: an enclosing dialog listens for it too, and
  // would otherwise close the whole form and lose everything typed.
  useEscapeKey(cancelMenu, isOpen, { capture: true });
  useClickOutsideToClose(dropdownRef, isOpen, closeMenu, menuRef);
  const menuSx = useAnchoredPosition({
    anchorRef: dropdownRef,
    menuRef,
    isOpen,
    minWidth: isTree ? MENU_TREE_MIN_WIDTH : MENU_MIN_WIDTH,
  });

  // --- Handlers -----------------------------------------------------------

  const handleToggle = (event) => {
    // The chevron sits outside the field, so its click never reaches the field
    // handler — but stop it anyway for the non-searchable path where the whole
    // box is the toggle.
    event.stopPropagation();
    if (disabled) return;
    if (isOpen) {
      closeMenu();
      return;
    }
    openMenu();
    focusField();
  };

  // With the search box inline, clicking the field means "put the caret here",
  // never "close" — the chevron is the explicit toggle. Without a search box
  // there is no caret to place, so the field stays a plain toggle.
  const handleFieldClick = (event) => {
    if (!searchable) {
      handleToggle(event);
      return;
    }
    if (disabled) return;
    if (!isOpen) openMenu();
    focusField();
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    // Typing into a closed field is a request to search it.
    if (!isOpen) openMenu();
  };

  const handleSelect = (value) => {
    pickValue(value);
    if (!multiple) {
      closeAfterPick();
      return;
    }
    // The term that found this row is spent — left behind, leaving the field
    // would commit it as free text as well.
    if (allowOptionsOutsideSelectBox) setSearchTerm('');
    // Clicking a row blurred the inline search box; hand the caret back so the
    // next keystroke keeps filtering.
    focusField();
  };

  const handleTreeSelect = (option) => {
    toggleTreeNode(option);
    focusField();
  };

  const handleAccept = () => {
    commitTypedText();
    if (!multiple) {
      closeAfterPick();
      return;
    }
    setSearchTerm('');
    focusField();
  };

  const handleRemove = (value, event) => {
    event.stopPropagation();
    // A chip in a tree is an already-selected node, so toggling it removes its
    // subtree too. A value no node describes is simply dropped.
    const node = isTree ? optionByValue.get(value) : null;
    if (node) toggleTreeNode(node);
    else removeValue(value);
  };

  const handleClearAll = (event) => {
    event.stopPropagation();
    clearValues();
  };

  // --- Keyboard navigation ------------------------------------------------

  const rows = getMenuRowLayout({
    hasAcceptRow: acceptText !== '',
    optionCount: navigableOptions.length,
    hasCreateRow: Boolean(createOptionText),
  });

  const activateRow = (index) => {
    if (rows.isAcceptRow(index)) {
      handleAccept();
      return;
    }
    if (rows.isCreateRow(index)) {
      createFromSearch();
      return;
    }
    // Enter on an empty menu lands past every row.
    const option = navigableOptions[index - rows.optionOffset];
    if (!option) return;
    if (isTree) handleTreeSelect(option);
    else handleSelect(option.value);
  };

  const { activeIndex, handleMenuKeyDown, handleTriggerKeyDown, handleInputKeyDown } = useKeyboardNav({
    isOpen,
    searchTerm,
    searchable,
    disabled,
    count: rows.count,
    getSelectedIndex: () => navigableOptions.findIndex((option) => selectedSet.has(option.value)),
    listRef,
    inputRef,
    onActivate: activateRow,
    // Tabbing away is leaving the field, which keeps what was typed.
    onTab: allowOptionsOutsideSelectBox ? closeMenu : undefined,
    openMenu,
  });

  // --- Render -------------------------------------------------------------

  const navigateValue = !multiple && selected.length > 0 ? selected[0] : null;
  const showNavigateButton = typeof onNavigate === 'function' && navigateValue !== null && !disabled;

  const field = (
    <div
      className={showNavigateButton ? 'relative flex-1 min-w-0' : 'relative'}
      ref={dropdownRef}
    >
      <DropdownField
        isMuted={disabled || isEmpty}
        wrapLabel={wrapLabel}
        triggerRef={triggerRef}
        inputRef={inputRef}
        onFieldClick={handleFieldClick}
        onToggle={handleToggle}
        onTriggerKeyDown={handleTriggerKeyDown}
        onInputKeyDown={handleInputKeyDown}
        onSearchChange={handleSearchChange}
        onRemove={handleRemove}
        onClearAll={handleClearAll}
        selected={selected}
        optionByValue={optionByValue}
        isTree={isTree}
        multiple={multiple}
        searchable={searchable}
        disabled={disabled}
        isOpen={isOpen}
        loading={loading}
        hasOptions={hasOptions}
        placeholder={placeholder}
        defaultOptionValue={defaultOptionValue}
        isOnlyDefaultSelected={isOnlyDefaultSelected}
        searchTerm={searchTerm}
        unknownSelections={unknownSelections}
        allowOptionsOutsideSelectBox={allowOptionsOutsideSelectBox}
      />

      {isOpen && !disabled && menuSx && (
        <DropdownMenu
          menuRef={menuRef}
          listRef={listRef}
          sx={menuSx}
          multiple={multiple}
          onKeyDown={searchable ? undefined : handleMenuKeyDown}
          hasVisibleOptions={hasVisibleOptions}
          hiddenCount={hiddenMatchCount}
          loading={loading}
          acceptText={acceptText}
          isAcceptRowActive={rows.isAcceptRow(activeIndex)}
          onAccept={handleAccept}
          createOptionText={createOptionText}
          isCreateRowActive={rows.isCreateRow(activeIndex)}
          onCreate={createFromSearch}
        >
          {isTree ? (
            <TreeOptionList
              nodes={visibleTreeNodes}
              allOption={allTreeOption}
              selectedSet={selectedSet}
              activeIndex={activeIndex}
              collapsed={collapsed}
              lastChildSet={lastChildSet}
              isSearching={searchTerm !== ''}
              onSelect={handleTreeSelect}
              onToggleCollapse={toggleCollapse}
            />
          ) : (
            <FlatOptionList
              options={filteredOptions}
              selectedSet={selectedSet}
              multiple={multiple}
              activeIndex={activeIndex}
              indexOffset={rows.optionOffset}
              onSelect={handleSelect}
            />
          )}
        </DropdownMenu>
      )}
    </div>
  );

  if (!showNavigateButton) return field;

  return (
    <div className="flex items-center gap-1">
      {field}
      <NavigateButton value={navigateValue} onNavigate={onNavigate} />
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
  // Array for `multiple`; a plain scalar (or '' for none) for single-select.
  selectedValues: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string,
  ]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  multiple: PropTypes.bool,
  searchable: PropTypes.bool,
  autoOpen: PropTypes.bool,
  onClose: PropTypes.func,
  // Fired every time the menu opens. Supplying it also means "options may
  // arrive later", so an empty list is not treated as nothing to pick.
  onOpen: PropTypes.func,
  defaultOptionValue: PropTypes.string,
  // Options are still being fetched — suppresses the empty-list muting.
  loading: PropTypes.bool,
  // Called with the trimmed search term when the create row is activated.
  onCreateOption: PropTypes.func,
  // What is being picked ("Role"). Phrases the create row on its own.
  optionName: PropTypes.string,
  // Label for that row: a string, or a fn of the search term. Defaults to
  // "Add new".
  createOptionLabel: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  // Wrap long labels instead of truncating (implied by single-select).
  wrapLabel: PropTypes.bool,
  // Called with the selected value when the jump-to-record button is clicked.
  onNavigate: PropTypes.func,
  // Typed text is a value: an "Accept" row offers it, and leaving the field
  // (click outside, Tab, chevron) keeps it. Escape cancels. Flat lists only.
  allowOptionsOutsideSelectBox: PropTypes.bool,
};

export { SearchableDropdown };
