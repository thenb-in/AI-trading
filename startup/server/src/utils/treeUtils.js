/** Generic helpers for flat rows that point at a parent row. */

/**
 * flat rows with a parent_id -> top-level rows, each with its children inside.
 * buildTree([{ id: 1 }, { id: 2, parent_id: 1 }])
 *   -> [{ id: 1, children: [{ id: 2, parent_id: 1, children: [] }] }]
 */
const buildTree = (rows, { idKey = 'id', parentKey = 'parent_id', childrenKey = 'children' } = {}) => {
  const nodes = rows.map((row) => ({ ...row, [childrenKey]: [] }));
  const byId = new Map(nodes.map((node) => [String(node[idKey]), node]));
  const roots = [];

  for (const node of nodes) {
    const parent = byId.get(String(node[parentKey]));
    if (parent && parent !== node) {
      parent[childrenKey].push(node);
      continue;
    }
    roots.push(node);
  }

  return roots;
};

/** Map of parent id → child ids. */
const childrenByParent = (rows, { idKey, parentIdKey }) => {
  const map = new Map();
  rows.forEach((row) => {
    const parent = row[parentIdKey];
    if (parent === null) {
      return;
    }
    const key = Number(parent);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(Number(row[idKey]));
  });
  return map;
};

/**
 * root id(s) + flat rows -> those ids plus every descendant id, any depth.
 * collectDescendantIds(1, [{ id: 1 }, { id: 2, parent_id: 1 }, { id: 3, parent_id: 2 }])
 *   -> [1, 2, 3]
 */
const collectDescendantIds = (rootIds, rows = [], { idKey = 'id', parentIdKey = 'parent_id' } = {}) => {
  const children = childrenByParent(rows, { idKey, parentIdKey });
  const result = new Set();
  const stack = (Array.isArray(rootIds) ? rootIds : [rootIds]).map(Number).filter(Number.isInteger);

  stack.forEach((id) => result.add(id));
  while (stack.length) {
    (children.get(stack.pop()) || []).forEach((childId) => {
      if (!result.has(childId)) {
        result.add(childId);
        stack.push(childId);
      }
    });
  }
  return [...result];
};

/**
 * True if making `newParentId` the parent of `nodeId` would create a cycle —
 * i.e. the new parent is the node itself or sits inside the node's subtree.
 */
const wouldCreateCycle = (nodeId, newParentId, rows = [], opts = {}) =>
  collectDescendantIds(Number(nodeId), rows, opts).includes(Number(newParentId));

module.exports = {
  buildTree,
  collectDescendantIds,
  wouldCreateCycle
};
