/**
 * Rows that nest inside each other -> OrgChart nodes that nest inside each other.
 *
 * `toNode(row, { id, children })` returns the card for one row. It is handed a
 * unique id and the nodes already built for that row's children, so a caller
 * writes only what its own card looks like — never the walk, the ids, or the
 * pruning.
 *
 * Returning null drops the row, and its children take its place. That is what
 * lets a branch nobody may see step aside without hiding the leaves under it.
 *
 *   buildNodes(departments, (department, { id, children }) => ({
 *     id,
 *     title: department.dept_name,
 *     children: [...children, ...positionCards(department)],
 *   }), { prefix: 'department' })
 */
const buildNodes = (rows = [], toNode, { idKey = 'id', childrenKey = 'children', prefix = 'node' } = {}) =>
  rows.flatMap((row) => {
    const id = `${prefix}-${row[idKey]}`;
    const children = buildNodes(row[childrenKey], toNode, { idKey, childrenKey, prefix: id });
    const node = toNode(row, { id, children });
    return node ? [node] : children;
  });

export { buildNodes };
