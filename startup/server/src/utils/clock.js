// Clock helpers: "what time is it" and coercion of date-ish values to epoch
// milliseconds / ISO strings.
//
// Split out of dateUtils.js, which is about parsing and business-day maths on
// dates the user supplies. These answer a different question — the current
// instant, and the machine-readable form of a moment — and are what the license
// engine and onboarding read. Keeping them apart also holds dateUtils under the
// max-lines limit.
const { MS_PER_DAY } = require('../constants/time');
const { normalizeToDate } = require('./dateUtils');

/** Date exactly one year from today — used as the default subscription expiry. */
function oneYearFromNow() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date;
}

/** Current time in epoch milliseconds. */
function nowMs() {
  return Date.now();
}

/** Current time as an ISO-8601 string. */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Coerce any date-ish value (Date, ISO string, epoch ms) to epoch
 * milliseconds. Returns NaN for invalid input.
 */
function toEpochMs(value) {
  return normalizeToDate(value).getTime();
}

/** ISO-8601 string for a date-ish value, or null if it can't be parsed. */
function toIso(value) {
  const date = normalizeToDate(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Whole days from now until `value` (rounded up), floored at 0. NaN input
 * yields 0.
 */
function daysUntil(value) {
  const ms = toEpochMs(value);
  if (Number.isNaN(ms)) {
    return 0;
  }
  return Math.max(0, Math.ceil((ms - nowMs()) / MS_PER_DAY));
}

module.exports = {
  oneYearFromNow,
  nowMs,
  nowIso,
  toEpochMs,
  toIso,
  daysUntil
};
