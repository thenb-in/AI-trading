import { getDefaultSortFields } from "@startup/data/defaultSortFieldRegistry";

/**
 * Build the initial sort model for reports in the canonical array shape
 * `[{ field, sort }, ...]` understood by NbNextDataGrid (priority by index).
 *
 * Pass `fields` as an ordered list of either strings (defaults to ascending)
 * or `{ field, sort }` entries. Fields missing from `columns` are dropped, so
 * callers can include optional keys without checking for presence.
 *
 * If `fields` is omitted, falls back to the first present field from the
 * app-registered default sort fields (see defaultSortFieldRegistry).
 *
 * @param {Array} columns - column definitions, each with a `field`
 * @param {Array<string | {field: string, sort?: 'asc' | 'desc'}>} [fields]
 * @returns {Array<{field: string, sort: 'asc' | 'desc'}>}
 */
const getInitialSortModel = (columns, fields) => {
  if (!columns || columns.length === 0) return [];
  const fieldExists = (f) => columns.some((col) => col.field === f);

  if (fields === undefined) {
    const fallback = getDefaultSortFields().find(fieldExists);
    return fallback ? [{ field: fallback, sort: "asc" }] : [];
  }

  return fields
    .map((f) => (typeof f === "string" ? { field: f, sort: "asc" } : f))
    .filter((f) => f?.field && fieldExists(f.field));
};

export { getInitialSortModel };
