import { useCallback, useMemo, useState } from 'react';
import { getLastChildValues, getVisibleNodes } from '@utils/treeSelect';

// A flat menu draws at most this many rows: a long list is narrowed by typing,
// not scrolled — drawing thousands of rows is what freezes an older machine.
const MENU_ROW_CAP = 25;

/**
 * What the open menu lists for the current search. Options that describe a
 * hierarchy (the Department filter) make it a tree, with its own collapse state
 * and the default ("All") option set apart above it; every other dropdown is a
 * flat list filtered by label, capped at MENU_ROW_CAP rows.
 */
const useVisibleOptions = ({ options, searchTerm, defaultOptionValue }) => {
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
    const needle = searchTerm.toLowerCase();
    // Labels that start with the term come before those that merely contain it,
    // so the rows the cap keeps are the likeliest picks. With no term every
    // label "starts with" it, and the list keeps its own order.
    const starting = [];
    const containing = [];
    options.forEach((option) => {
      const label = option.label.toLowerCase();
      if (label.startsWith(needle)) starting.push(option);
      else if (label.includes(needle)) containing.push(option);
    });
    const matches = [...starting, ...containing];
    return {
      filteredOptions: matches.slice(0, MENU_ROW_CAP),
      hiddenMatchCount: Math.max(matches.length - MENU_ROW_CAP, 0),
    };
  }, [isTree, options, searchTerm]);

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
