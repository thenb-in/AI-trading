/**
 * Helpers for hierarchical (parent/child) multi-selects — 
 */

const compareByLabel = (a, b) => String(a ?? '').localeCompare(String(b ?? ''));

/** Build depth-first tree options from flat rows. */
function buildTreeOptions(rows = [], { idKey = 'id', parentIdKey = 'parent_id', labelKey = 'name' } = {}) {
  const childrenOf = new Map();
  rows.forEach((row) => {
    const parent = row[parentIdKey];
    const key = parent == null ? null : String(parent);
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key).push(row);
  });

  const ids = new Set(rows.map((row) => String(row[idKey])));
  const children = (id) => [...(childrenOf.get(id) || [])].sort((a, b) => compareByLabel(a[labelKey], b[labelKey]));
  const descendantsOf = (id) =>
    children(id).flatMap((child) => [String(child[idKey]), ...descendantsOf(String(child[idKey]))]);

  const options = [];
  const walk = (row, depth, parentValue) => {
    const id = String(row[idKey]);
    const kids = children(id);
    options.push({
      value: id,
      label: String(row[labelKey] ?? ''),
      depth,
      parentValue,
      hasChildren: kids.length > 0,
      descendants: descendantsOf(id),
    });
    kids.forEach((child) => walk(child, depth + 1, id));
  };

  // A row whose parent isn't in the set (disabled/foreign) counts as a root.
  const roots = rows.filter((row) => {
    const parent = row[parentIdKey];
    return parent == null || !ids.has(String(parent));
  });
  [...roots].sort((a, b) => compareByLabel(a[labelKey], b[labelKey])).forEach((root) => walk(root, 0, null));
  return options;
}

/** Tri-state checkbox state of a node ({ checked, indeterminate }). */
function getCheckboxState(option, selected) {
  const { descendants = [] } = option;
  const self = selected.has(option.value);
  if (descendants.length === 0) return { checked: self, indeterminate: false };
  const picked = descendants.filter((id) => selected.has(id)).length;
  const checked = self && picked === descendants.length;
  return { checked, indeterminate: !checked && (self || picked > 0) };
}

/**
 * Select or deselect a node together with its whole subtree, and return the
 * next selection array. Invariant: a parent is kept only when its entire
 * subtree is selected — so deselecting drops the node's ancestors, and
 * selecting bubbles a parent in once all its descendants are selected.
 */
function toggleNodeSelection(option, selectedValues, optionByValue) {
  const selected = new Set(selectedValues);
  const subtree = [option.value, ...option.descendants];

  if (getCheckboxState(option, selected).checked) {
    subtree.forEach((value) => selected.delete(value));
    getAncestors(option, optionByValue).forEach((ancestor) => selected.delete(ancestor.value));
  } else {
    subtree.forEach((value) => selected.add(value));
    getAncestors(option, optionByValue).forEach((ancestor) => {
      if (ancestor.descendants.every((id) => selected.has(id))) selected.add(ancestor.value);
    });
  }
  return [...selected];
}

/**
 * The outer-most selected values: a value is dropped when its parent is also
 * selected, so a fully-selected subtree collapses to its top node. Used to show
 * one chip per selected branch instead of one per node.
 */
function getSelectedRoots(selectedValues, optionByValue) {
  const selected = new Set(selectedValues);
  return selectedValues.filter((value) => {
    const parent = optionByValue.get(value)?.parentValue;
    return !parent || !selected.has(parent);
  });
}

/** Values that are the last child of their parent — for "└" vs "├" connectors. */
function getLastChildValues(options) {
  const lastOf = new Map();
  options.forEach((option) => {
    if (option.parentValue) lastOf.set(option.parentValue, option.value);
  });
  return new Set(lastOf.values());
}

/**
 * The nodes to actually render. Searching keeps matches with their subtree (so
 * a matched parent reveals children) and ancestors (so a matched child shows
 * its path). Otherwise the subtree under a collapsed parent is hidden.
 */
function getVisibleNodes(options, { collapsed = new Set(), searchTerm = '' } = {}) {
  const term = searchTerm.trim().toLowerCase();
  if (term) {
    const optionByValue = new Map(options.map((option) => [option.value, option]));
    const keep = new Set();
    options.forEach((option) => {
      if (!option.label.toLowerCase().includes(term)) return;
      keep.add(option.value);
      option.descendants.forEach((id) => keep.add(id));
      getAncestors(option, optionByValue).forEach((ancestor) => keep.add(ancestor.value));
    });
    return options.filter((option) => keep.has(option.value));
  }

  const visible = [];
  let hideDeeperThan = Infinity;
  options.forEach((option) => {
    if (option.depth > hideDeeperThan) return;
    hideDeeperThan = collapsed.has(option.value) ? option.depth : Infinity;
    visible.push(option);
  });
  return visible;
}

// Walk a node's ancestor chain, nearest first.
function getAncestors(option, optionByValue) {
  const chain = [];
  let parent = option.parentValue;
  while (parent) {
    const ancestor = optionByValue.get(parent);
    if (!ancestor) break;
    chain.push(ancestor);
    parent = ancestor.parentValue;
  }
  return chain;
}

export { buildTreeOptions, getCheckboxState, toggleNodeSelection, getSelectedRoots, getLastChildValues, getVisibleNodes };
