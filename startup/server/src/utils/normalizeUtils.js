const { VALIDATION_EMAIL_REGEX } = require('../constants/auth');

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

/** True when nothing was entered: an empty string, null or undefined. 0 and false are values. */
const isEmptyValue = (rawValue) => rawValue === '' || rawValue === undefined || rawValue === null;

/**
 * Normalise a single optional numeric input into a number, or null.
 *
 */
const numberOrNull = (rawValue) => {
  if (isEmptyValue(rawValue)) {
    return null;
  }
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
};

/** A whole number of 1 or more, or null when the input is empty or anything else. */
const positiveIntegerOrNull = (rawValue) => {
  const parsed = numberOrNull(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Normalise a single optional id into a positive integer, or null.
 *
 * Empty string / undefined / null and any non-positive / non-integer value all
 * collapse to null. Use for nullable foreign keys coming from forms or query
 * params (e.g. a parent id where "" means "no parent").
 */
const normalizeOptionalId = (rawValue) => positiveIntegerOrNull(rawValue);

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
 * A trimmed, lower-cased email address, or null when it is not one.
 *
 * Null rather than the raw string because callers use it to decide whether they
 * can deliver at all: a recipient list holds phone numbers beside addresses, and
 * mail has to pick out only the ones it can send to.
 */
const normalizeEmail = (value) => {
  const trimmed = String(value ?? '').trim().toLowerCase();
  return VALIDATION_EMAIL_REGEX.test(trimmed) ? trimmed : null;
};

/**
 * A phone number as digits only, or null when there are no digits in it.
 *
 * The twin of `normalizeEmail`, and null for the same reason: a recipient list holds phone
 * numbers beside addresses, so a sender uses this to find out whether it can deliver at all.
 * Digits only because that is what the providers accept — `+91 98765-43210` is rejected.
 */
const normalizePhone = (value) => String(value ?? '').replace(/\D/g, '') || null;

/**
 * The last ten digits of a phone number, with everything that is not a digit dropped.
 *
 * Ten because that is what an Indian subscriber number is: the same person's number arrives
 * as `+91 98765 43210`, `098765-43210` or `9876543210` depending on who typed it, and only
 * the last ten agree. Returns fewer than ten characters for anything shorter, so callers that
 * need a real number check the length.
 */
/**
 * Text with its layout taken out: one line, single spaces, blank lines dropped and
 * the breaks kept as a separator rather than lost.
 *
 * For the places that carry a value rather than a document -- a WhatsApp template
 * parameter, which Meta refuses outright if it holds a newline, a tab or more than
 * four spaces; a column in an export; a log line that must stay one line to be
 * greppable. The separator is the caller's, because " | " reads well in a message
 * and badly in a sentence.
 */
const singleLine = (value, separator = ' | ') =>
  String(value ?? '')
    .replace(/[\t ]+/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(separator);

const lastTenDigits = (value) => String(value || '').replace(/\D/g, '').slice(-10);

module.exports = {
  normalizeIntegerIds,
  normalizeOptionalId,
  isEmptyValue,
  numberOrNull,
  positiveIntegerOrNull,
  percentOf,
  applyRounding,
  normalizeEmail,
  normalizePhone,
  singleLine,
  lastTenDigits
};
