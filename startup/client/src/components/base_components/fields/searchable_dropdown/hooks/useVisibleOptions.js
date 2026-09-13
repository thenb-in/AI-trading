import { useCallback, useMemo, useState } from 'react';
import { getLastChildValues, getVisibleNodes } from '@utils/treeSelect';

/**
 * What the open menu lists for the current search. Options that describe a
 * hierarchy (the Department filter) make it a tree, with its own collapse state
 * and the default ("All") option set apart above it; every other dropdown is a
 * flat list filtered by label.
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

  const filteredOptions = useMemo(() => {
    if (isTree) return [];
    const needle = searchTerm.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
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
