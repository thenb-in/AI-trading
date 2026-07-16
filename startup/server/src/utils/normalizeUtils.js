/**
 * Normalise raw id input into an array of integers.
 *
 * Accepts a single value, an array, or comma-separated string(s) — e.g.
 * `5`, `'5'`, `'5,6'`, `['5', '6,7']` — and returns `[5, 6, 7]`. Non-integer
 * parts are dropped.
 */
const normalizeIntegerIds = (rawValues) => {
  if (rawValues === undefined || rawValues === null) {
    return [];
  }
  const values = Array.isArray(rawValues) ? rawValues : [rawValues];
  return values
    .flatMap((value) => String(value).split(','))
    .map((value) => Number.parseInt(String(value).trim(), 10))
    .filter((value) => Number.isInteger(value));
};

/**
 * Normalise a single optional id into a positive integer, or null.
 *
 * Empty string / undefined / null and any non-positive / non-integer value all
 * collapse to null. Use for nullable foreign keys coming from forms or query
 * params (e.g. a parent id where "" means "no parent").
 */
const normalizeOptionalId = (rawValue) => {
  if (rawValue === '' || rawValue === undefined || rawValue === null) {
    return null;
  }
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Normalise a single optional numeric input into a number, or null.
 *
 */
const numberOrNull = (rawValue) => {
  if (rawValue === '' || rawValue === undefined || rawValue === null) {
    return null;
  }
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
};

module.exports = { normalizeIntegerIds, normalizeOptionalId, numberOrNull };
