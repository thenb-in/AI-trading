import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import { ChevronDown, X } from 'lucide-react';
import {
  getCheckboxState,
  toggleNodeSelection,
  getSelectedRoots,
  getLastChildValues,
  getVisibleNodes,
} from '@utils/treeSelect';
import { TreeOptionRow, TreeCheckbox } from './TreeOptionRow';

const MENU_GAP = 4;
// The menu is portalled, so it is free to be wider than whatever it hangs off.
// It has to be: a trigger sized to a table cell would otherwise truncate every
// option to a few characters, which is how two roles both end up reading
// "comp…". Tree menus need more room again for indented labels.
const MENU_MIN_WIDTH = 220;
const MENU_TREE_MIN_WIDTH = 250;
// Never wider than the viewport it has to sit in. Kept as a ratio because the
// menu is also given `maxWidth: 95vw` in CSS — the two must agree, or the
// clamped `left` would be computed from a width the menu never gets.
const MENU_MAX_VIEWPORT_RATIO = 0.95;
const MENU_MAX_HEIGHT = 320;
// Below this a flipped menu is more cramped than useful; it scrolls instead.
const MENU_MIN_HEIGHT = 140;

/** `''`/null/undefined mean "nothing selected"; anything else is a single value. */
const toSelectionArray = (value) => {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null || value === '' ? [] : [value];
};

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
}) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPos, setDropdownPos] = useState(null);
  const [menuHeight, setMenuHeight] = useState(0);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Single-select speaks scalars, multi speaks arrays. Normalize inbound so a
  // caller may pass either shape, and `emit` sends back the shape the mode
  // implies — so single-select callers never unwrap `values[0]` themselves.
  const selected = useMemo(() => toSelectionArray(selectedValues), [selectedValues]);
  const emit = useCallback(
    (values) => onChange(multiple ? values : (values[0] ?? '')),
    [multiple, onChange]
  );

  // Tree mode activates only when the options describe a hierarchy (the
  // Department filter). Every other dropdown keeps the flat rendering.
  const isTree = useMemo(() => options.some((o) => o.hasChildren), [options]);
  const optionByValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allTreeOption = useMemo(
    () => options.find((o) => o.value === defaultOptionValue) || null,
    [options, defaultOptionValue]
  );
  const treeNodes = useMemo(
    () => (isTree ? options.filter((o) => o.value !== defaultOptionValue) : []),
    [isTree, options, defaultOptionValue]
  );
  // Sitting on the default ("All") is not a selection — clearing it round-trips
  // straight back to the default. The field renders it as placeholder text
  // (see `fieldChips`), which also takes the remove affordances with it.
  const isOnlyDefaultSelected =
    selected.length === 1 && selected[0] === defaultOptionValue;
  // Nothing to pick from reads the same as unavailable, so mute the control.
  // It stays clickable though — opening it explains why via "No options found".
  // An empty list that is still loading is not "nothing to pick" yet, and
  // neither is one belonging to a dropdown that fetches on open (`onOpen`):
  // it has not been asked yet.
  const isEmpty = options.length === 0 && !loading && !onOpen;
  const isMuted = disabled || isEmpty;
  // A value the field is holding that no option describes — a master that was
  // deleted, deactivated, or filtered out from under it. Chips/labels are built
  // from the options, so such a value renders as *nothing*: the field looks
  // empty while still submitting the stale value. Only judge this once there is
  // a list to judge against — one still loading, or one that fetches on open
  // (`onOpen`) and hasn't been asked yet, has said nothing so far. Sitting on
  // the default ("all") is not a value either; it may legitimately have no row.
  const unknownSelections = useMemo(
    () => (loading || options.length === 0 || isOnlyDefaultSelected
      ? []
      : selected.filter((value) => !optionByValue.has(value))),
    [loading, options.length, isOnlyDefaultSelected, selected, optionByValue]
  );
  const hasUnknownSelection = !disabled && unknownSelections.length > 0;
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

  // Same for onOpen, so opening the menu never depends on the callback's
  // identity. Callers use it to fetch their options on first open.
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  // Closing always drops the search term: the field itself is the search box,
  // so a leftover term would sit in the closed control looking like a value.
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
    onCloseRef.current?.();
  }, []);

  // Whichever element the user actually types into — the inline search box when
  // searchable, the box itself when not. Keyboard dismissal and post-selection
  // both need to hand focus back to it.
  const focusField = useCallback(() => {
    (inputRef.current || triggerRef.current)?.focus();
  }, []);

  // Anchor the menu below the trigger, or above it when below can't fit and
  // above has more room. `maxHeight` is clamped to whichever side we picked so
  // the menu scrolls internally instead of running off-screen.
  const updatePosition = useCallback(() => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const spaceAbove = rect.top - MENU_GAP;
    const flip = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow;
    setDropdownPos({
      anchorTop: rect.top + window.scrollY,
      anchorBottom: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      flip,
      maxHeight: Math.max(
        MENU_MIN_HEIGHT,
        Math.min(MENU_MAX_HEIGHT, flip ? spaceAbove : spaceBelow)
      ),
    });
  }, []);

  // A flipped menu hangs off its own height, so it has to be measured. Doing it
  // in a layout effect means the corrected position lands before paint — the
  // maxHeight guess below is only what the very first frame is laid out with.
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const height = menuRef.current.offsetHeight;
    setMenuHeight((prev) => (prev === height ? prev : height));
  });

  // When mounted already-open (autoOpen), measure so the menu can render.
  useEffect(() => {
    if (autoOpen) {
      updatePosition();
    }
  }, [autoOpen, updatePosition]);

  // Close dropdown when clicking outside / pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        // An open menu owns this Escape. Enclosing dialogs also listen for it on
        // `document` (see useEscapeKey), and they registered first — so bubbling
        // would close the whole form and lose everything typed. Claim the key in
        // the capture phase, before it ever reaches those listeners.
        event.stopPropagation();
        closeMenu();
        // Escape is a keyboard dismissal, so put focus back where it started.
        focusField();
      }
    };

    // The menu is portalled to <body>, so as far as an enclosing dialog is
    // concerned a click on an option landed *outside* it — and dialogs that
    // dismiss on outside-mousedown would close, taking the form with them.
    // Keep the event from reaching those document-level listeners at all.
    const keepInsideMenu = (event) => event.stopPropagation();
    const menuEl = menuRef.current;

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown, true);
      menuEl?.addEventListener('mousedown', keepInsideMenu);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown, true);
      menuEl?.removeEventListener('mousedown', keepInsideMenu);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition, dropdownPos, closeMenu, focusField]);

  // Flat-mode filtered options
  const filteredOptions = useMemo(() => {
    const needle = searchTerm.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, searchTerm]);

  // The rows arrow keys walk, in render order. Tree mode puts the "All" row
  // first because it renders above the tree.
  const navigableOptions = useMemo(() => {
    if (!isTree) return filteredOptions;
    const head = !searchTerm && allTreeOption ? [allTreeOption] : [];
    return [...head, ...visibleTreeNodes];
  }, [isTree, filteredOptions, searchTerm, allTreeOption, visibleTreeNodes]);

  // Menu geometry. The floor is applied first and the viewport cap last, so on
  // a screen narrower than the floor the cap wins — and `left` below is clamped
  // against the width the menu will actually have, not the one it asked for.
  // `left` is a document coordinate (the menu is portalled onto body), hence
  // the scrollX terms.
  const menuWidth = dropdownPos
    ? Math.min(
      Math.max(dropdownPos.width, isTree ? MENU_TREE_MIN_WIDTH : MENU_MIN_WIDTH),
      window.innerWidth * MENU_MAX_VIEWPORT_RATIO
    )
    : 0;
  const menuLeft = dropdownPos
    ? Math.max(
      window.scrollX + MENU_GAP,
      Math.min(dropdownPos.left, window.scrollX + window.innerWidth - menuWidth - MENU_GAP)
    )
    : 0;

  // A list that is loading but already has rows (the "All X" placeholder, or a
  // stale list being refreshed) can't use the empty-state message, so it gets a
  // footer instead — otherwise the menu looks complete while more is coming.
  const hasVisibleOptions = isTree
    ? visibleTreeNodes.length > 0
    : filteredOptions.length > 0;

  const openMenu = useCallback(() => {
    updatePosition();
    onOpenRef.current?.();
    setIsOpen(true);
  }, [updatePosition]);

  const handleToggle = (event) => {
    // The chevron sits outside the field, so its click never reaches the field
    // handler — but stop it anyway for the non-searchable path where the whole
    // box is the toggle.
    event?.stopPropagation();
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

  const handleSelect = (value) => {
    if (multiple) {
      const newValues = selectedSet.has(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      emit(newValues);
      // Clicking a row blurred the inline search box; hand the caret back so
      // the next keystroke keeps filtering.
      focusField();
    } else {
      emit([value]);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // --- Tree handlers (all logic lives in @utils/tree) ---------------------

  const handleTreeSelect = useCallback(
    (option) => {
      emit(toggleNodeSelection(option, selected, optionByValue));
      focusField();
    },
    [emit, selected, optionByValue, focusField]
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
    emit(
      option
        ? toggleNodeSelection(option, selected, optionByValue)
        : selected.filter((v) => v !== value)
    );
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    emit([]);
  };

  const handleInputChangeNoOp = useCallback(() => {
    // No-op: selection is handled by the row onClick, not the checkbox.
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    // Typing into a closed field is a request to search it.
    if (!isOpen) openMenu();
  }, [isOpen, openMenu]);

  // --- Keyboard navigation ------------------------------------------------

  const selectOption = (option) =>
    (isTree ? handleTreeSelect(option) : handleSelect(option.value));

  // Point the highlight at the current selection when opening, so Enter on a
  // freshly opened dropdown re-picks what's already there rather than row 0.
  // Deliberately keyed on `isOpen` alone — typing re-seeds it via searchTerm below.
  const selectionSeedRef = useRef({ navigableOptions, selectedSet });
  selectionSeedRef.current = { navigableOptions, selectedSet };
  useEffect(() => {
    if (!isOpen) return;
    const seed = selectionSeedRef.current;
    const current = seed.navigableOptions.findIndex((o) => seed.selectedSet.has(o.value));
    setActiveIndex(current >= 0 ? current : 0);
  }, [isOpen]);

  // Filtering changes the row set out from under the highlight.
  useEffect(() => setActiveIndex(0), [searchTerm]);

  // Follow the highlight when it moves past the scroll viewport.
  useEffect(() => {
    if (!isOpen) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  // The typing target has to hold focus or the keydown handler never fires:
  // the inline search box when there is one, the list itself when there isn't.
  useEffect(() => {
    if (!isOpen) return;
    if (searchable) inputRef.current?.focus();
    else listRef.current?.focus();
  }, [isOpen, searchable]);

  const handleMenuKeyDown = (event) => {
    const count = navigableOptions.length;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!count) return;
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((prev) => (prev + delta + count) % count);
        break;
      }
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(Math.max(0, count - 1));
        break;
      case 'Enter': {
        event.preventDefault();
        const option = navigableOptions[activeIndex];
        if (option) selectOption(option);
        break;
      }
      case ' ': {
        // Space types a space in the search box; only claim it when there isn't one.
        if (searchable) return;
        event.preventDefault();
        const option = navigableOptions[activeIndex];
        if (option) selectOption(option);
        break;
      }
      default:
    }
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (isOpen) handleMenuKeyDown(event);
      else openMenu();
    }
  };

  // A closed field answers only the open keys — everything else is typing, and
  // `handleSearchChange` opens the menu the moment a character lands.
  const handleInputKeyDown = (event) => {
    if (isOpen) {
      handleMenuKeyDown(event);
      return;
    }
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu();
    }
  };

  // Chips: in tree mode collapse fully-selected subtrees to their top-most node.
  const displayedChips = useMemo(() => {
    const values = isTree
      ? getSelectedRoots(selected, optionByValue)
      : selected;
    // A value no option describes still has to be visible — dropping it left the
    // field looking empty while it was holding (and submitting) that value. Show
    // the raw value; the red border says it needs looking at.
    return values.map((value) => ({ value, label: optionByValue.get(value)?.label ?? value }));
  }, [isTree, selected, optionByValue]);

  // Sitting on the default ("All …") means nothing has actually been chosen, so
  // the field wears that label as its placeholder rather than as a live
  // selection — no chip, no dark text, nothing to clear.
  const fieldChips = isOnlyDefaultSelected ? [] : displayedChips;
  const emptyText = loading && options.length === 0 ? 'Loading…' : placeholder;
  const fieldPlaceholder = isOnlyDefaultSelected
    ? (optionByValue.get(defaultOptionValue)?.label ?? emptyText)
    : emptyText;
  const singleLabel = !multiple && fieldChips.length > 0 ? fieldChips[0].label : '';
  // Opening a searchable single-select empties the field for fresh entry, so a
  // new value is typed rather than deleted-then-typed. Nothing is committed by
  // that: the value is only demoted to the placeholder, and Escape — or closing
  // any other way without picking — promotes it straight back.
  const clearedForEntry = searchable && isOpen;
  const showSingleLabel = Boolean(singleLabel) && !searchTerm && !clearedForEntry;
  // Whatever the field is not already saying: the demoted value while open,
  // otherwise the empty-state text. Chips speak for themselves.
  const hasFieldText = showSingleLabel || (multiple && fieldChips.length > 0);
  const inputPlaceholder = hasFieldText ? '' : (singleLabel || fieldPlaceholder);
  // Only offer to clear what the field is actually showing — an ✕ beside a
  // field emptied for typing has nothing visible to act on.
  const showClear = !disabled && (multiple ? fieldChips.length > 0 : showSingleLabel);
  // Border states, most specific first: an open menu owns the field, then a
  // selection the list can't account for — a red outline, no icon or banner,
  // just enough to say "look at this one" — then the resting border. Hover
  // travels with each state, or the hover rule would repaint the red grey.
  const fieldBorderClass = isOpen
    ? 'border-blue-500 ring-1 ring-blue-500'
    : hasUnknownSelection
      ? 'border-red-500 hover:border-red-600'
      : `border-gray-300 ${disabled ? '' : 'hover:border-gray-400'}`;
  // Combobox semantics and the tab stop belong on whatever the user types into,
  // so they move onto the inline search box when there is one.
  const comboboxProps = {
    role: 'combobox',
    'aria-expanded': isOpen,
    'aria-haspopup': 'listbox',
    'aria-disabled': disabled,
    tabIndex: disabled ? -1 : 0,
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input/Display */}
      <div
        ref={triggerRef}
        {...(searchable ? {} : { ...comboboxProps, onKeyDown: handleTriggerKeyDown })}
        onClick={handleFieldClick}
        title={
          hasUnknownSelection
            ? 'Selected value not in the current list: ' + unknownSelections.join(', ')
            : undefined
        }
        className={`flex items-center w-full min-h-[38px] px-2 py-1.5 text-sm border rounded text-gray-900 focus-within:outline-none focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 ${
          isMuted ? 'bg-gray-100 opacity-60' : 'bg-white'
        } ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        } ${fieldBorderClass}`}
      >
        <div className="flex flex-1 min-w-0 items-center flex-wrap gap-1">
          {/* Single-select has exactly one value, so show it as plain text — the
              outer clear button is the only affordance needed. It steps aside
              once the field is open for entry, becoming its placeholder. */}
          {showSingleLabel && (
            <span className="flex-1 min-w-0 truncate text-gray-900">
              {singleLabel}
            </span>
          )}
          {multiple && fieldChips.map((chip) => {
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
          {/* The search box lives in the field rather than as a row inside the
              menu: same typing, one row less of vertical chrome. */}
          {searchable ? (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              disabled={disabled}
              onChange={handleSearchChange}
              onKeyDown={handleInputKeyDown}
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
              onClick={handleClearAll}
              className="ml-auto mr-5 shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Icon — the explicit open/close toggle, now that clicking the
          field places the caret in the inline search box instead. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onClick={handleToggle}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 disabled:pointer-events-none"
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu - rendered via portal so it appears above modals */}
      {isOpen && !disabled && dropdownPos && createPortal(
        <Box
          ref={menuRef}
          sx={{
            position: 'absolute',
            // Flipped menus hang off their own height; until measured, the
            // clamped maxHeight is the best available stand-in.
            top: dropdownPos.flip
              ? dropdownPos.anchorTop - (menuHeight || dropdownPos.maxHeight) - MENU_GAP
              : dropdownPos.anchorBottom + MENU_GAP,
            left: menuLeft,
            width: menuWidth,
            // Same cap as menuWidth, expressed from the same constant so the
            // two cannot drift; this one also covers a resize that lands
            // between updatePosition and paint.
            maxWidth: `${MENU_MAX_VIEWPORT_RATIO * 100}vw`,
            maxHeight: dropdownPos.maxHeight,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
          }}
          className="bg-white border border-gray-300 rounded shadow-lg overflow-hidden"
        >
          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            aria-multiselectable={multiple}
            tabIndex={-1}
            onKeyDown={searchable ? undefined : handleMenuKeyDown}
            className="flex-1 min-h-0 overflow-y-auto py-1 focus:outline-none"
          >
            {isTree ? (
              visibleTreeNodes.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  {loading ? 'Loading options…' : 'No options found'}
                </div>
              ) : (
                <>
                  {/* "All" sits apart from the tree as a global toggle. */}
                  {!searchTerm && allTreeOption && (
                    <>
                      <div
                        role="option"
                        aria-selected={selectedSet.has(defaultOptionValue)}
                        data-active={activeIndex === 0}
                        onClick={() => handleTreeSelect(allTreeOption)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer mx-1 rounded-sm hover:bg-blue-50 ${
                          selectedSet.has(defaultOptionValue)
                            ? 'text-blue-700 font-semibold'
                            : 'text-gray-700 font-medium'
                        } ${activeIndex === 0 ? 'ring-1 ring-inset ring-blue-400 bg-blue-50' : ''}`}
                      >
                        <TreeCheckbox
                          checked={selectedSet.has(defaultOptionValue)}
                          indeterminate={false}
                          onChange={handleInputChangeNoOp}
                        />
                        <span>{allTreeOption.label}</span>
                      </div>
                      <div className="my-1 border-t border-gray-100" />
                    </>
                  )}
                  {visibleTreeNodes.map((option, index) => {
                    const { checked, indeterminate } = getCheckboxState(option, selectedSet);
                    // The "All" row occupies index 0 when it renders.
                    const treeOffset = !searchTerm && allTreeOption ? 1 : 0;
                    return (
                      <TreeOptionRow
                        key={option.value}
                        option={option}
                        checked={checked}
                        indeterminate={indeterminate}
                        isActive={index + treeOffset === activeIndex}
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
                {loading ? 'Loading options…' : 'No options found'}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedSet.has(option.value);
                const isHighlight = !!option.highlight;
                const isActive = index === activeIndex;
                const handleOptionClick = () => handleSelect(option.value);
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    data-active={isActive}
                    onClick={handleOptionClick}
                    title={isHighlight ? 'Inactive' : undefined}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                      isSelected ? 'bg-blue-100 font-medium' : isHighlight ? 'bg-red-50' : ''
                    } ${isActive ? 'ring-1 ring-inset ring-blue-400 bg-blue-50' : ''}`}
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

            {loading && hasVisibleOptions && (
              <div className="px-3 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
                Loading options…
              </div>
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
};

export { SearchableDropdown };
