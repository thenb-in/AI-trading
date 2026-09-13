import { useMemo } from 'react';
import { getSelectedRoots } from '@utils/treeSelect';

/**
 * How the field reads: the chips or label it shows, what its placeholder says,
 * whether it offers to clear, and how its border looks.
 */
const useFieldDisplay = ({
  selected,
  optionByValue,
  isTree,
  multiple,
  searchable,
  disabled,
  isOpen,
  loading,
  hasOptions,
  placeholder,
  defaultOptionValue,
  isOnlyDefaultSelected,
  searchTerm,
  unknownSelections,
  allowOptionsOutsideSelectBox,
}) => {
  // Chips: in tree mode collapse fully-selected subtrees to their top-most node.
  const displayedChips = useMemo(() => {
    const values = isTree ? getSelectedRoots(selected, optionByValue) : selected;
    // A value no option describes still has to be visible — dropping it left the
    // field looking empty while it was holding (and submitting) that value. Show
    // the raw value; the red border says it needs looking at.
    return values.map((value) => ({ value, label: optionByValue.get(value)?.label ?? value }));
  }, [isTree, selected, optionByValue]);

  // Sitting on the default ("All …") means nothing has actually been chosen, so
  // the field wears that label as its placeholder rather than as a live
  // selection — no chip, no dark text, nothing to clear.
  const fieldChips = isOnlyDefaultSelected ? [] : displayedChips;
  const emptyText = loading && !hasOptions ? 'Loading…' : placeholder;
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
  const hasUnknownSelection = !disabled && unknownSelections.length > 0;
  const borderClass = isOpen
    ? 'border-blue-500 ring-1 ring-blue-500'
    : hasUnknownSelection
      ? 'border-red-500 hover:border-red-600'
      : `border-gray-300 ${disabled ? '' : 'hover:border-gray-400'}`;
  const title = hasUnknownSelection
    ? `${allowOptionsOutsideSelectBox ? 'Free text, not in the list' : 'Selected value not in the current list'}: ${unknownSelections.join(', ')}`
    : undefined;

  return { fieldChips, fieldPlaceholder, singleLabel, showSingleLabel, inputPlaceholder, showClear, borderClass, title };
};

export { useFieldDisplay };
