// Helpers for raw sequelize.query output, parameterized SQL fragments and
// expressions the query builder has no shorthand for.

const { fn, col } = require('sequelize');

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

/**
 * The database-side twin of `lastTenDigits`: the last ten digits of a phone column, for
 * matching a stored number against one normalised in the application.
 *
 * Built with the query builder rather than written as SQL so it can go straight into a
 * `where`/`group`/`attributes`, and it is the expression a functional index on the same
 * column is declared with — so an index on it is still used.
 */
const lastTenDigitsOf = (column) => fn('right', fn('regexp_replace', col(column), '\\D', '', 'g'), 10);

module.exports = {
  rowsFromQueryResult,
  buildInListParams,
  lastTenDigitsOf
};
