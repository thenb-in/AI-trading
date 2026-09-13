import { useEffect, useRef, useState } from 'react';

/**
 * The highlighted menu row and the keys that move and activate it. The hook
 * only counts rows; `onActivate(index)` maps an index back to whatever row
 * sits there (see getMenuRowLayout).
 */
const useKeyboardNav = ({
  isOpen,
  searchTerm,
  searchable,
  disabled,
  count,
  getSelectedIndex,
  listRef,
  inputRef,
  onActivate,
  onTab,
  openMenu,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Point the highlight at the current selection when opening, so Enter on a
  // freshly opened dropdown re-picks what's already there rather than row 0.
  // Deliberately keyed on `isOpen` alone — typing re-seeds it via searchTerm below.
  const getSelectedIndexRef = useRef(getSelectedIndex);
  getSelectedIndexRef.current = getSelectedIndex;
  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(Math.max(getSelectedIndexRef.current(), 0));
  }, [isOpen]);

  // Filtering changes the row set out from under the highlight.
  useEffect(() => setActiveIndex(0), [searchTerm]);

  // Follow the highlight when it moves past the scroll viewport.
  useEffect(() => {
    if (!isOpen) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, listRef]);

  // The typing target has to hold focus or the keydown handler never fires:
  // the inline search box when there is one, the list itself when there isn't.
  useEffect(() => {
    if (!isOpen) return;
    if (searchable) inputRef.current?.focus();
    else listRef.current?.focus();
  }, [isOpen, searchable, inputRef, listRef]);

  const handleMenuKeyDown = (event) => {
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
      case 'Enter':
        event.preventDefault();
        onActivate(activeIndex);
        break;
      case ' ':
        // Space types a space in the search box; only claim it when there isn't one.
        if (searchable) return;
        event.preventDefault();
        onActivate(activeIndex);
        break;
      case 'Tab':
        // Tabbing away is leaving the field; the caller decides whether that closes it.
        onTab?.();
        break;
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
  // the search box's onChange opens the menu the moment a character lands.
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

  return { activeIndex, handleMenuKeyDown, handleTriggerKeyDown, handleInputKeyDown };
};

export { useKeyboardNav };
