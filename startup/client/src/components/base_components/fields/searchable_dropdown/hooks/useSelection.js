import { useCallback, useMemo } from 'react';
import { toggleNodeSelection } from '@utils/treeSelect';

/** `''`/null/undefined mean "nothing selected"; anything else is a single value. */
const toSelectionArray = (value) => {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null || value === '' ? [] : [value];
};

/**
 * The dropdown's value, held as a list whatever the mode. Single-select speaks
 * scalars, multi speaks arrays: inbound is normalised so a caller may pass
 * either, and every change goes out in the shape the mode implies — so
 * single-select callers never unwrap `values[0]` themselves.
 */
const useSelection = ({
  selectedValues,
  multiple,
  onChange,
  optionByValue,
  hasOptions,
  defaultOptionValue,
  loading,
  allowOptionsOutsideSelectBox,
}) => {
  const selected = useMemo(() => toSelectionArray(selectedValues), [selectedValues]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const emit = useCallback(
    (values) => onChange(multiple ? values : (values[0] ?? '')),
    [multiple, onChange]
  );

  // Sitting on the default ("All") is not a selection — clearing it round-trips
  // straight back to the default. The field renders it as placeholder text,
  // which also takes the remove affordances with it.
  const isOnlyDefaultSelected = selected.length === 1 && selected[0] === defaultOptionValue;

  // A value the field is holding that no option describes — a master that was
  // deleted, deactivated, or filtered out from under it. Chips/labels are built
  // from the options, so such a value renders as *nothing*: the field looks
  // empty while still submitting the stale value. Only judge this once there is
  // a list to judge against — one still loading has said nothing so far. Free
  // text has no list to be in, so it is judged even against an empty one.
  // Sitting on the default ("all") is not a value either; it may legitimately
  // have no row.
  const unknownSelections = useMemo(
    () => (loading || (!hasOptions && !allowOptionsOutsideSelectBox) || isOnlyDefaultSelected
      ? []
      : selected.filter((value) => !optionByValue.has(value))),
    [loading, hasOptions, allowOptionsOutsideSelectBox, isOnlyDefaultSelected, selected, optionByValue]
  );

  // A row click: replaces in single-select, toggles in multi.
  const pickValue = (value) => {
    if (!multiple) {
      emit([value]);
      return;
    }
    emit(selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  // Like a pick, but never takes away a value that is already there.
  const addValue = (value) => {
    if (!multiple) {
      emit([value]);
      return;
    }
    if (!selectedSet.has(value)) emit([...selected, value]);
  };

  const removeValue = (value) => emit(selected.filter((v) => v !== value));

  // A tree node carries its subtree with it, both on and off.
  const toggleTreeNode = (option) => emit(toggleNodeSelection(option, selected, optionByValue));

  const clearValues = () => emit([]);

  return {
    selected,
    selectedSet,
    isOnlyDefaultSelected,
    unknownSelections,
    pickValue,
    addValue,
    removeValue,
    toggleTreeNode,
    clearValues,
  };
};

export { useSelection };
