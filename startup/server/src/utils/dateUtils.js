const { parse, parseISO } = require('date-fns');
const logger = require('../../logger');
const { TIME_ZONE, DEFAULT_DATE_FORMAT } = require('../constants/auth');

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

  logger.error(`[parseDate] Invalid date format: ${trimmed}. Expected yyyy-MM-dd, yyyy-M-d, ISO datetime, d MMM yyyy, dd-MM-yyyy, dd/MM/yyyy, d/M/yyyy, dd.MM.yyyy, or d.M.yyyy`);
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
    if (currentDate.getDay() === weekday) {
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
  // str for time will be in format HH:MM
  const hours = time.getHours();
  const minutes = time.getMinutes();
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

module.exports = {
  formatDate,
  formatTime,
  formatLastActive,
  formatDateToIndian,
  formatDuration,
  getDateRange,
  parseDate,
  getAllDays,
  getDaysBetween,
  calculateWorkDays,
  getMonthPercentage,
  getCompleteMonthsPercentage,
  normalizeToDate,
  getAllDaysInArray,
  extract_time_only_to_integer,
  formatDateToString,
  toDateOnly,
  toWallClockDateOnly,
  convert_time_to_str,
  format_duration_hours_minutes,
  format_duration_time,
  getDayRange,
  getDayBounds,
  getWeekStart,
  extendDateRange
};
