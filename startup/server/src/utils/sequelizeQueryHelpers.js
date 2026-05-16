// Helpers for raw sequelize.query output and parameterized SQL fragments.

/**
 * Normalize sequelize.query output into a flat array of rows. Different
 * dialects / query types return `[rows, metadata]`, `[rows]`, or a bare
 * object; callers just want rows.
 */
function rowsFromQueryResult(res) {
  if (!res) {
    return [];
  }
  if (Array.isArray(res)) {
    if (res.length > 0 && Array.isArray(res[0])) {
      return res[0];
    }
    return res;
  }
  return [res];
}

/**
 * Build a `:foo0, :foo1, …` placeholder list and matching replacements object
 * for an IN(...) clause. Values are coerced to strings — callers that need
 * other types should bind them themselves.
 */
function buildInListParams(values, baseName) {
  const placeholders = [];
  const replacements = {};
  values.forEach((v, i) => {
    const key = `${baseName}${i}`;
    placeholders.push(`:${key}`);
    replacements[key] = String(v);
  });
  return { listSql: placeholders.join(', '), replacements };
}

module.exports = {
  rowsFromQueryResult,
  buildInListParams
};
