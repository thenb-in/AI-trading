import { useCallback, useMemo, useState } from 'react';
import { getLastChildValues, getVisibleNodes } from '@utils/treeSelect';
import { matchRank } from '../utils/optionMatch';

// A flat menu draws at most this many rows: a long list is narrowed by typing,
// not scrolled — drawing thousands of rows is what freezes an older machine.
const MENU_ROW_CAP = 25;

/**
 * What the open menu lists for the current search. Options that describe a
 * hierarchy (a geography filter) make it a tree, with its own collapse state
 * and the default ("All") option set apart above it; every other dropdown is a
 * flat list capped at MENU_ROW_CAP rows, ranked by how well each option's
 * `searchKeys` (or label) match the term. `filter` leaves options out of a flat
 * menu without dropping them from the dropdown, so a picked one keeps its label.
 */
const useVisibleOptions = ({ options, searchTerm, defaultOptionValue, filter }) => {
  const [collapsed, setCollapsed] = useState(() => new Set());

  const isTree = useMemo(() => options.some((o) => o.hasChildren), [options]);
  const allTreeOption = useMemo(
    () => options.find((o) => o.value === defaultOptionValue) || null,
    [options, defaultOptionValue]
  );
  const treeNodes = useMemo(
    () => (isTree ? options.filter((o) => o.value !== defaultOptionValue) : []),
    [isTree, options, defaultOptionValue]
  );
  const lastChildSet = useMemo(() => getLastChildValues(treeNodes), [treeNodes]);
  const visibleTreeNodes = useMemo(
    () => (isTree ? getVisibleNodes(treeNodes, { collapsed, searchTerm }) : []),
    [isTree, treeNodes, collapsed, searchTerm]
  );

  const { filteredOptions, hiddenMatchCount } = useMemo(() => {
    if (isTree) return { filteredOptions: [], hiddenMatchCount: 0 };
    const needle = searchTerm.trim().toLowerCase();
    const allowed = filter ? options.filter(filter) : options;
    // With no term the list keeps its own order; with one, the best matches come
    // first (see matchRank) — so the rows the cap keeps are the likeliest picks.
    const matches = needle
      ? allowed
        .map((option) => ({ option, rank: matchRank(option, needle) }))
        .filter(({ rank }) => rank !== null)
        .sort((x, y) => x.rank - y.rank)
        .map(({ option }) => option)
      : allowed;
    return {
      filteredOptions: matches.slice(0, MENU_ROW_CAP),
      hiddenMatchCount: Math.max(matches.length - MENU_ROW_CAP, 0),
    };
  }, [isTree, options, searchTerm, filter]);

  // The rows arrow keys walk, in render order. Tree mode puts the "All" row
  // first because it renders above the tree.
  const navigableOptions = useMemo(() => {
    if (!isTree) return filteredOptions;
    const head = !searchTerm && allTreeOption ? [allTreeOption] : [];
    return [...head, ...visibleTreeNodes];
  }, [isTree, filteredOptions, searchTerm, allTreeOption, visibleTreeNodes]);

  const toggleCollapse = useCallback((value, e) => {
    e.stopPropagation();
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  return {
    isTree,
    filteredOptions,
    // Matches past the cap, which typing more would bring into view.
    hiddenMatchCount,
    allTreeOption,
    visibleTreeNodes,
    lastChildSet,
    collapsed,
    toggleCollapse,
    navigableOptions,
    // "All" alone is not something to show: the tree counts its nodes only.
    hasVisibleOptions: isTree ? visibleTreeNodes.length > 0 : filteredOptions.length > 0,
  };
};

export { useVisibleOptions };
