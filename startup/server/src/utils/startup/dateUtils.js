// Server-side date utilities.
//
// Generic date helpers for use in server-side services and controllers.
// All functions are timezone-aware; pass a timezone string where needed
// (defaults to UTC so behaviour is predictable across deployments).
//
// For client-side date work use client/src/utils/startup/dateTimeUtils.js.

/**
 * Format a Date object to a string.
 *
 * @param {Date|string|number} date
 * @param {string} [format='dd-mm-yyyy']  Supported: 'dd-mm-yyyy', 'mm-dd-yyyy', 'yyyy-mm-dd'
 * @param {string} [timeZone='UTC']
 * @returns {string|null}
 */
const formatDateToString = (date, format = 'dd-mm-yyyy', timeZone = 'UTC') => {
  if (!date) {
    return null;
  }

  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError(`formatDateToString: invalid date: ${date}`);
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);

  const day   = parts.find((p) => p.type === 'day').value;
  const month = parts.find((p) => p.type === 'month').value;
  const year  = parts.find((p) => p.type === 'year').value;

  switch (format) {
  case 'mm-dd-yyyy': return `${month}-${day}-${year}`;
  case 'yyyy-mm-dd': return `${year}-${month}-${day}`;
  default:           return `${day}-${month}-${year}`;
  }
};

/**
 * Parse a date string or Date into a plain calendar-day Date (no time component).
 * Supports: Date objects, yyyy-MM-dd, yyyy-M-d, ISO 8601 datetime strings,
 * and dd-MM-yyyy fallback.
 *
 * @param {Date|string} dateStr
 * @returns {Date|null}
 */
const parseDate = (dateStr) => {
  if (!dateStr) {
    return null;
  }
  if (dateStr instanceof Date) {
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }

  const trimmed = String(dateStr).trim();

  // yyyy-MM-dd or yyyy-M-d
  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDateMatch) {
    const y = parseInt(isoDateMatch[1], 10);
    const m = parseInt(isoDateMatch[2], 10) - 1;
    const d = parseInt(isoDateMatch[3], 10);
    const result = new Date(y, m, d);
    if (!Number.isNaN(result.getTime())) {
      return result;
    }
  }

  // ISO 8601 datetime — strip time, keep calendar date
  const isoDateTimeMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoDateTimeMatch) {
    const y = parseInt(isoDateTimeMatch[1], 10);
    const m = parseInt(isoDateTimeMatch[2], 10) - 1;
    const d = parseInt(isoDateTimeMatch[3], 10);
    const result = new Date(y, m, d);
    if (!Number.isNaN(result.getTime())) {
      return result;
    }
  }

  // dd-MM-yyyy fallback
  const dmyMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    const result = new Date(y, m, d);
    if (!Number.isNaN(result.getTime())) {
      return result;
    }
  }

  return null;
};

/**
 * Generate an array of all Date objects between start and end (inclusive).
 *
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {Date[]}
 */
const getAllDaysInArray = (startDate, endDate) => {
  const start = parseDate(startDate);
  const end   = parseDate(endDate);
  if (!start || !end) {
    return [];
  }

  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

/**
 * Return start/end Date objects for a date range, with start at 00:00:00.000
 * and end at 23:59:59.999.
 *
 * @param {Date|string} startDateStr
 * @param {Date|string} endDateStr
 * @returns {{ start_date: Date, end_date: Date }}
 */
const getDayRange = (startDateStr, endDateStr) => {
  const start_date = parseDate(startDateStr) || new Date(startDateStr);
  const end_date   = parseDate(endDateStr)   || new Date(endDateStr);
  start_date.setHours(0, 0, 0, 0);
  end_date.setHours(23, 59, 59, 999);
  return { start_date, end_date };
};

/**
 * Generate an array of date objects with start/end boundaries.
 *
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {{ dates: Date[], startDate: Date, endDate: Date }}
 */
const getDateRange = (startDate, endDate) => {
  const start = parseDate(startDate) || new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = parseDate(endDate) || new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const dates = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(new Date(d));
  }
  return { dates, startDate: start, endDate: end };
};

/**
 * Extend a date range by N days on each side.
 *
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @param {number} [daysBefore=1]
 * @param {number} [daysAfter=1]
 * @returns {{ extendedStart: Date, extendedEnd: Date }}
 */
const extendDateRange = (startDate, endDate, daysBefore = 1, daysAfter = 1) => {
  const extendedStart = parseDate(startDate) || new Date(startDate);
  extendedStart.setDate(extendedStart.getDate() - daysBefore);
  const extendedEnd = parseDate(endDate) || new Date(endDate);
  extendedEnd.setDate(extendedEnd.getDate() + daysAfter);
  return { extendedStart, extendedEnd };
};

/**
 * Format a Date to HH:mm (24-hour UTC).
 *
 * @param {Date|string} date
 * @returns {string}
 */
const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  });
};

/**
 * Format a Date for display (e.g. "January 15, 2024 at 03:30 PM").
 *
 * @param {Date|string|null} date
 * @returns {string}
 */
const formatLastActive = (date) => {
  if (!date) {
    return 'N/A';
  }
  const d = new Date(date);
  const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
  const formattedDate = d.toLocaleString('en-US', options);
  const hours   = d.getUTCHours() % 12 || 12;
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm    = d.getUTCHours() >= 12 ? 'PM' : 'AM';
  return `${formattedDate} at ${hours}:${minutes} ${ampm}`;
};

/**
 * Format duration in seconds to "HH hr :MM min :SS sec".
 *
 * @param {number} seconds
 * @returns {string}
 */
const formatDuration = (seconds) => {
  const hrs  = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')} hr :${mins.toString().padStart(2, '0')} min :${secs.toString().padStart(2, '0')} sec`;
};

/**
 * Format duration in seconds to "H.MM" (hours.minutes).
 *
 * @param {number} seconds
 * @returns {string}
 */
const formatDurationHoursMinutes = (seconds) => {
  const hours   = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}.${String(minutes).padStart(2, '0')}`;
};

/**
 * Format duration in seconds to "HH:MM".
 *
 * @param {number} seconds
 * @returns {string}
 */
const formatDurationTime = (seconds) => {
  const hours   = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Extract seconds from a Date (hours + minutes + seconds).
 *
 * @param {Date} date
 * @returns {number}
 */
const extractTimeOnlyToInteger = (date) => {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
};

/**
 * Format a Date's time as "HH:MM" string.
 *
 * @param {Date|null} time
 * @returns {string}
 */
const convertTimeToStr = (time) => {
  if (!time) {
    return '--';
  }
  const hours   = time.getHours();
  const minutes = time.getMinutes();
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

module.exports = {
  parseDate,
  formatDateToString,
  getAllDaysInArray,
  getDayRange,
  getDateRange,
  extendDateRange,
  formatTime,
  formatLastActive,
  formatDuration,
  formatDurationHoursMinutes,
  formatDurationTime,
  extractTimeOnlyToInteger,
  convertTimeToStr
};
