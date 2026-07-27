const { parse, parseISO } = require('date-fns');
const logger = require('../../logger');
const { TIME_ZONE, DEFAULT_DATE_FORMAT } = require('../constants/auth');
const { MS_PER_DAY } = require('../constants/time');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDate(date, format_str) {
  if (!date) {
    return null;
  }
  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  if (format_str === undefined) {
    format_str = DEFAULT_DATE_FORMAT;
  }

  // Zero-padded dd-MM-yyyy in target timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const day = parts.find(p => p.type === 'day').value;
  const month = parts.find(p => p.type === 'month').value;
  const year = parts.find(p => p.type === 'year').value;
  return `${day}-${month}-${year}`;
}

function buildParseDateErrorMessage(dateStr) {
  const trimmed = String(dateStr).trim();
  return `[parseDate] Invalid date format: ${trimmed}. Expected yyyy-MM-dd, yyyy-M-d, ISO datetime, d MMM yyyy, dd-MM-yyyy, dd/MM/yyyy, d/M/yyyy, dd.MM.yyyy, or d.M.yyyy`;
}

// Run `parseFn(input)` and, if it returns a valid Date, snap it to the
// local calendar day (so UTC-shifted inputs don't bleed across midnight).
// Failures are logged and return null so the next strategy can run.
function tryParseToLocalDay(input, parseFn, label) {
  try {
    const parsedDate = parseFn(input);
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    }
  } catch (e) {
    logger.error(`[parseDate] Failed to parse ${label}: ${input}`, e);
  }
  return null;
}

function parseDate(dateStr) {
  if (!dateStr) {
    return null;
  }
  if (dateStr instanceof Date) {
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }

  const trimmed = String(dateStr).trim();

  // ISO 8601 date only (yyyy-MM-dd) — local calendar day
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = tryParseToLocalDay(trimmed, (s) => parse(s, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd');
    if (parsed) {
      return parsed;
    }
  }

  // ISO 8601 date only (yyyy-M-d) — supports single digit month/day
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const parsed = tryParseToLocalDay(trimmed, (s) => parse(s, 'yyyy-M-d', new Date()), 'yyyy-M-d');
    if (parsed) {
      return parsed;
    }
  }

  // ISO 8601 datetime — normalize to local calendar date (avoids UTC day shift from toISOString)
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const parsed = tryParseToLocalDay(trimmed, parseISO, 'ISO datetime');
    if (parsed) {
      return parsed;
    }
  }

  // Day-first dashed dates: dd-MM-yyyy / d-M-yyyy (e.g. 30-01-1998, 1-6-2004)
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    for (const fmt of ['dd-MM-yyyy', 'd-M-yyyy']) {
      const parsed = tryParseToLocalDay(trimmed, (s) => parse(s, fmt, new Date()), fmt);
      if (parsed) {
        return parsed;
      }
    }
  }

  // Short-month "d MMM yyyy" (e.g. "2 Jan 2025"). Guarded by a strict regex so
  // this path only runs for clearly-matching strings — keeps unrelated formats
  // out of date-fns' English-locale month parser.
  if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(trimmed)) {
    try {
      const parsedDate = parse(trimmed, 'd MMM yyyy', new Date());
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    } catch (e) {
      logger.error(`Error parsing date with d MMM yyyy for ${trimmed}`, e);
    }
  }

  // Try parsing with dd/MM/yyyy format (2-digit day and month)
  try {
    const parsedDate = parse(trimmed, 'dd/MM/yyyy', new Date());
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {
    logger.error(`Error parsing date with dd/MM/yyyy for ${trimmed}`, e);
  }

  // Try parsing with d/M/yyyy format (single or double digit day and month)
  try {
    const parsedDate = parse(trimmed, 'd/M/yyyy', new Date());
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {
    logger.error(`Error parsing date with d/M/yyyy for ${trimmed}`, e);
  }

  // Try parsing with dd.MM.yyyy format (2-digit day and month, dot separator)
  try {
    const parsedDate = parse(trimmed, 'dd.MM.yyyy', new Date());
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {
    logger.error(`Error parsing date with dd.MM.yyyy for ${trimmed}`, e);
  }

  // Try parsing with d.M.yyyy format (single or double digit day and month, dot separator)
  try {
    const parsedDate = parse(trimmed, 'd.M.yyyy', new Date());
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {
    logger.error(`Error parsing date with d.M.yyyy for ${trimmed}`, e);
  }

  // handle epoch timestamp
  try {
    if (typeof dateStr === 'number') {
      const parsedDate = new Date(Number(dateStr));
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    } else if (typeof dateStr === 'string') {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
  } catch (e) {
    logger.error(`Error parsing date with fallback for ${dateStr}`, e);
  }

  logger.error(buildParseDateErrorMessage(trimmed));
  return null;
}

function getAllDays(start_date, end_date) {
  let days = new Set();

  const currentDate = parseDate(start_date);
  const endDate = parseDate(end_date);
  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);
    days.add(dateString);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  days = Array.from(days);
  return days;
}

function getAllDaysInArray(start_date, end_date) {
  return getAllDays(start_date, end_date);
}

function getDaysBetween(start_date, end_date, weekday) {
  let days = new Set();
  const currentDate = new Date(start_date);
  while (currentDate <= end_date) {
    if (isNaN(weekday) || currentDate.getDay() === weekday) {
      // if weekday is not provided, include all days; otherwise, include only matching weekdays
      const dateString = formatDate(currentDate);
      days.add(dateString);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  days = Array.from(days);
  return days;
}

const calculateWorkDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  let count = 0;
  while (start <= end) {
    count++;
    start.setUTCDate(start.getUTCDate() + 1);
  }
  return count;
};

function getMonthPercentage(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const numberOfDaysInThisMonth = end.getDate() - start.getDate() + 1;
  const lastDayOfMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
  const totalNumberOfDaysInThisMonth = lastDayOfMonth.getDate();
  return numberOfDaysInThisMonth / totalNumberOfDaysInThisMonth;
}

function getCompleteMonthsPercentage(start_date_str, end_date_str) {
  let startDate = new Date(start_date_str);
  let endDate = new Date(end_date_str);

  if (startDate.getDate() !== 1) {
    startDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
  }

  const lastDayOfMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
  if (endDate.getDate() !== lastDayOfMonth.getDate()) {
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
  }

  if (startDate > endDate) {
    return 0;
  }

  const startMonth = startDate.getMonth();
  const endMonth = endDate.getMonth();
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const numberOfMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
  return numberOfMonths + 1;
}

function extract_time_only_to_integer(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const time_only = (hours * 60 * 60) + (minutes * 60) + (seconds);
  return time_only;
}


/**
 * Whole calendar days from `from` to `to`, never negative. Complements
 * `getAllDays`/`getDaysBetween`, which return the days themselves — use this
 * when only the count matters (age of a record, how long something has been
 * outstanding). Returns null when either end is missing or unparseable.
 * @param {string|Date} from
 * @param {string|Date} to
 * @returns {number|null}
 */
function countDaysBetween(from, to) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  return Math.max(0, Math.round((end - start) / MS_PER_DAY));
}

function normalizeToDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }

  // Handle Sequelize / date-lib style wrappers exposing toDate()
  if (value && typeof value.toDate === 'function') {
    return value.toDate();
  }

  return new Date(NaN);
}


function toHHMM(value) {
  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }
  const date = value ? normalizeToDate(value) : null;
  return date && !Number.isNaN(date.getTime()) ? convert_time_to_str(date) : null;
}


function isTimeWithinWindow(time, start, end) {
  if (!time || !start || !end) {
    return false;
  }
  return start <= end
    ? time >= start && time <= end
    : time >= start || time <= end;
}

/**
 * Coerces an arbitrary date input into a Date object.
 * - empty (null/undefined/'') -> null
 * - epoch milliseconds (number or numeric string) -> new Date(millis)
 * - everything else (ISO, yyyy-MM-dd, dd-MM-yyyy, etc.) -> parseDate()
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null}
 */
function toDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const asNumber = Number(value);
  return Number.isNaN(asNumber) ? parseDate(value) : new Date(asNumber);
}


function isFutureDate(value) {
  const parsed = toDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return false;
  }
  const today = parseDate(new Date());
  return parseDate(parsed) > today;
}

const formatDateToString = (date, format = 'dd-mm-yyyy') => {
  const normalizedDate = normalizeToDate(date);

  if (Number.isNaN(normalizedDate.getTime())) {
    throw new TypeError(`Invalid date provided to formatDateToString: ${date}`);
  }

  const day = String(normalizedDate.getDate()).padStart(2, '0');
  const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
  const year = normalizedDate.getFullYear();
  switch (format) {
  case 'dd-mm-yyyy':
    return `${day}-${month}-${year}`;
  case 'mm-dd-yyyy':
    return `${month}-${day}-${year}`;
  case 'yyyy-mm-dd':
    return `${year}-${month}-${day}`;
  case 'dd/mm/yyyy':
    return `${day}/${month}/${year}`;
  default:
    return `${day}-${month}-${year}`;
  }
};

/**
 * DATEONLY-friendly yyyy-MM-dd from a Date. Returns null on invalid input
 * (unlike formatDateToString, which throws).
 * @param {Date} date
 * @returns {string|null}
 */
const toDateOnly = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return formatDateToString(date, 'yyyy-mm-dd');
};

const parseToYmd = (value) => toDateOnly(parseDate(value));

/**
 * Today as yyyy-MM-dd, from local components rather than via UTC.
 *
 * `new Date().toISOString().slice(0, 10)` is the tempting version and it is wrong east of
 * Greenwich: in IST it returns yesterday for anything happening before 05:30.
 */
const todayYmd = () => toDateOnly(new Date());

/**
 * Date-only (yyyy-MM-dd) from a wall-clock value, never via UTC conversion.
 * Use when the input already represents local wall-clock time and the calendar
 * day must be taken as-written (e.g. device punch timestamps).
 *   - string: the leading 'yyyy-MM-dd' is sliced as-is (no re-parsing), so a
 *     trailing time/zone can never shift the day. Returns null if the string is
 *     too short to contain a date.
 *   - Date: formatted from local components via toDateOnly.
 * Returns null for any other input (or an invalid Date).
 * @param {string|Date} value
 * @returns {string|null}
 */
const toWallClockDateOnly = (value) => {
  if (typeof value === 'string') {
    return value.length >= 10 ? value.slice(0, 10) : null;
  }
  return toDateOnly(value);
};

/**
 * Resolve the start of the Indian financial year (1 April) for a given date.
 * Months Jan–Mar belong to the financial year that started the previous April.
 * @param {string|Date} dateStr
 * @returns {string|null} 'yyyy-04-01', or null for an unparseable date.
 */
const getFinancialYearStart = (dateStr) => {
  const date = parseDate(dateStr);
  if (!date) {
    return null;
  }
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based; April === 3
  const fyStartYear = month >= 3 ? year : year - 1;
  return `${fyStartYear}-04-01`;
};

/**
 * Month-to-date range for a date: first day of that date's month at 00:00:00 up
 * to (and including) the given date at 23:59:59. Returns Date objects. Generic —
 * e.g. used for the FnF settlement period (start of resignation month → date).
 * @param {string|Date} date
 * @returns {{ startDate: Date, endDate: Date }}
 */
const getMonthToDateRange = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date for month-to-date range: ${date}`);
  }
  const startDate = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 0);
  return { startDate, endDate };
};

/**
 * Formats a date to YYYY-MM-DD format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string
 */
const getDateRange = (startDate, endDate) => {
  // console.log(`[getDateRange] Generating date range from ${startDate} to ${endDate}`);
  const dates = [];
  const start = new Date(startDate);
  start.setHours(5, 30, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  end.setHours(end.getHours() + 5, end.getMinutes() + 30);

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(new Date(d));
  }
  // console.log(`[getDateRange] Generated ${dates.length} dates`);
  return {
    dates,
    startDate: start,
    endDate: end
  };
};
/**
 * Formats a time to HH:mm:ss format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted time string
 */
const formatTime = (date) => {
  const dateObj = new Date(date);
  return dateObj.toLocaleTimeString('en-US',
    { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }
  );
};


const shortWeekday = (value) => {
  const date = parseDate(value);
  return date ? date.toLocaleString('en-US', { weekday: 'short' }) : null;
};

const monthName = (value) => {
  const date = parseDate(value);
  return date ? date.toLocaleString('en-US', { month: 'long' }) : null;
};


const ageInYears = (birthday, asOf) => {
  const born = parseDate(birthday);
  const on = parseDate(asOf);
  if (!born || !on) {
    return null;
  }

  let age = on.getFullYear() - born.getFullYear();
  const monthDiff = on.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < born.getDate())) {
    age -= 1;
  }
  return age;
};


const yearBounds = (year) => ({
  start: `${year}-01-01`,
  end: `${year}-12-31`
});

/**
 * Formats a date and time to a human-readable format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date and time string
 */
const formatLastActive = (date) => {
  if (!date) {
    return 'N/A';
  }

  const dateObj = new Date(date);
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  };

  const formattedDate = dateObj.toLocaleString('en-US', options);
  const hours = dateObj.getUTCHours() % 12 || 12;
  const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
  const ampm = dateObj.getUTCHours() >= 12 ? 'PM' : 'AM';

  return `${formattedDate} at ${hours}:${minutes} ${ampm}`;
};

/**
 * Formats a date to Indian format (DD/MM/YYYY)
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string in Indian format
 */
const formatDateToIndian = (date) => {
  const dateObj = new Date(date);
  if (isNaN(dateObj)) {
    throw new Error(`Invalid date provided to formatDateToIndian: ${date}`);
  }
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return dateObj.toLocaleDateString('en-IN', options);
};

/**
 * Formats duration in seconds to HH:mm:ss format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')} hr :${mins.toString().padStart(2, '0')} min :${secs.toString().padStart(2, '0')} sec`;
};


function convert_time_to_str(time) {
  if (!time) {
    return '--';
  }
  // Materialised timetables and punches carry Dates, but rows read straight off the DB
  // carry TIME columns as "HH:MM:SS" strings. Both must render as HH:MM.
  if (typeof time === 'string' && /^\d{1,2}:\d{2}/.test(time)) {
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes}`;
  }
  const date = normalizeToDate(time);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  // str for time will be in format HH:MM
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}


/**
 * Format duration in seconds to hours.minutes format
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration (e.g., "2.30" for 2 hours 30 minutes)
 */
function format_duration_hours_minutes(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}.${String(minutes).padStart(2, '0')}`;
}

/**
 * Format duration in seconds to HH:MM format
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration (e.g., "02:30" for 2 hours 30 minutes)
 */
function format_duration_time(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Format duration in seconds to HH:MM, or '--' when missing/zero.
 * Mirrors convert_time_to_str for duration values.
 * @param {number} seconds - Duration in seconds
 * @returns {string}
 */
function format_duration_time_or_dash(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) {
    return '--';
  }
  return format_duration_time(n);
}

function getDayRange(start_date_str, end_date_str){
  const start_date = new Date(start_date_str);
  const end_date = new Date(end_date_str);
  start_date.setHours(0, 0, 0, 0);
  end_date.setHours(23, 59, 59, 999);
  return { start_date, end_date };
}

function getDayBounds(dayOffset = 0) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + dayOffset);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Week starts on Monday (local time)
function getWeekStart() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay(); // 0=Sun
  const daysToMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysToMonday);
  return start;
}

/**
 * Extends a date range by a number of days on each side.
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {number} [daysBefore=1] - Days to subtract from start
 * @param {number} [daysAfter=1] - Days to add to end
 * @returns {{ extendedStart: Date, extendedEnd: Date }}
 */
function extendDateRange(startDate, endDate, daysBefore = 1, daysAfter = 1) {
  const extendedStart = parseDate(startDate);
  extendedStart.setDate(extendedStart.getDate() - daysBefore);
  const extendedEnd = parseDate(endDate);
  extendedEnd.setDate(extendedEnd.getDate() + daysAfter);
  return { extendedStart, extendedEnd };
}

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
  daysUntil,
  formatDate,
  formatTime,
  shortWeekday,
  monthName,
  ageInYears,
  yearBounds,
  formatLastActive,
  formatDateToIndian,
  formatDuration,
  getDateRange,
  parseDate,
  buildParseDateErrorMessage,
  getAllDays,
  getDaysBetween,
  countDaysBetween,
  calculateWorkDays,
  getMonthPercentage,
  getCompleteMonthsPercentage,
  normalizeToDate,
  toHHMM,
  isTimeWithinWindow,
  toDate,
  isFutureDate,
  getFinancialYearStart,
  getMonthToDateRange,
  getAllDaysInArray,
  extract_time_only_to_integer,
  formatDateToString,
  toDateOnly,
  parseToYmd,
  todayYmd,
  toWallClockDateOnly,
  convert_time_to_str,
  format_duration_hours_minutes,
  format_duration_time,
  format_duration_time_or_dash,
  getDayRange,
  getDayBounds,
  getWeekStart,
  extendDateRange
};
