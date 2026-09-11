/** Generic helpers for arrays of plain objects. */

/**
 * rows + a field name (or a key function) -> Map of key to the rows having it.
 * groupBy([{ t: 'a' }, { t: 'b' }, { t: 'a' }], 't')
 *   -> Map { 'a' => [{ t: 'a' }, { t: 'a' }], 'b' => [{ t: 'b' }] }
 */
const groupBy = (rows, key) => {
  const keyOf = typeof key === 'function' ? key : (row) => row[key];
  const groups = new Map();

  for (const row of rows) {
    const group = groups.get(keyOf(row));
    if (group) {
      group.push(row);
      continue;
    }
    groups.set(keyOf(row), [row]);
  }

  return groups;
};

module.exports = { groupBy };
