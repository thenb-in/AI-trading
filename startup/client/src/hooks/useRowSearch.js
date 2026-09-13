import { useMemo } from 'react';

// JSON-shaped cells (e.g. a stored filter set) stringify to "[object Object]"
// and would never match, so serialise them instead of coercing.
const searchableText = (value) => (
  value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
);

/**
 * The rows a search query matches. A row matches when any of its searched fields
 * contains the query, case-insensitively: every column the grid shows, plus
 * `searchKeys` — row fields worth finding a record by that the grid does not show
 * (an address, a contact person, the record id).
 *
 * @param {Object[]} rows
 * @param {string} query
 * @param {Object} options
 * @param {Object[]} [options.columns] - grid columns; server columns name their field `key`, client ones `id`
 * @param {string[]} [options.searchKeys] - extra row fields to search
 */
const useRowSearch = (rows, query, { columns = [], searchKeys = [] } = {}) => useMemo(() => {
  if (!query) return rows;
  const keys = [...columns.map((c) => c.key || c.id), ...searchKeys];
  const q = query.toLowerCase();
  return rows.filter((row) => keys.some((k) => searchableText(row?.[k]).toLowerCase().includes(q)));
}, [rows, query, columns, searchKeys]);

export { useRowSearch };
