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

/**
 * `part` as a percentage of `whole`, to two decimals. Null when there is nothing
 * to divide by: "0% of a roster that does not exist" is not a reading, and a
 * report that printed it would rank its emptiest sites as its worst ones. A
 * caller that does want a zero says so with `?? 0`.
 */
const percentOf = (part, whole) => (whole > 0 ? Number(((part / whole) * 100).toFixed(2)) : null);

/**
 * Round a number the way the caller was configured to round it: 1 nearest, 2 up, 3 down,
 * 4 not at all. The mode travels as data (a column, a setting) rather than being decided in
 * code, so the same value rounds the same way everywhere it is read back -- a figure kept
 * exact for a calculation must not arrive rounded in the column that displays it.
 */
const applyRounding = (value, roundingType) => {
  const number = Number(value) || 0;
  switch (Number(roundingType)) {
  case 2: return Math.ceil(number);
  case 3: return Math.floor(number);
  case 4: return number;
  default: return Math.round(number); // 1 (nearest) and any unrecognised mode
  }
};

/**
 * The last ten digits of a phone number, with everything that is not a digit dropped.
 *
 * Ten because that is what an Indian subscriber number is: the same person's number arrives
 * as `+91 98765 43210`, `098765-43210` or `9876543210` depending on who typed it, and only
 * the last ten agree. Returns fewer than ten characters for anything shorter, so callers that
 * need a real number check the length.
 */
const lastTenDigits = (value) => String(value || '').replace(/\D/g, '').slice(-10);

module.exports = { normalizeIntegerIds, normalizeOptionalId, numberOrNull, percentOf, applyRounding, lastTenDigits };
