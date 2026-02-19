/**
 * Date utility functions for handling local timezone dates (India timezone)
 * These functions ensure dates are treated as local time instead of UTC
 */

/**
 * Parse a date string and return it in local timezone YYYY-MM-DD format
 * @param dateStr Date string from Excel (e.g., "2025-01-01")
 * @returns Date string in YYYY-MM-DD format in local timezone
 */
export function parseLocalDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error('Invalid date string provided');
  }

  const trimmed = dateStr.trim();
  if (!trimmed) {
    throw new Error('Empty date string provided');
  }

  // Parse the date as local time (not UTC)
  const date = new Date(trimmed + 'T00:00:00'); // Add time component to ensure local parsing

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  // Get local date components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Parse a date and time string and return ISO string in local timezone
 * @param dateStr Date string (e.g., "2025-01-01")
 * @param timeStr Time string (e.g., "06:59" or "06:59:00")
 * @returns ISO date string representing local time
 */
export function parseLocalDateTime(dateStr: string, timeStr: string): string {
  if (!dateStr || !timeStr || typeof dateStr !== 'string' || typeof timeStr !== 'string') {
    throw new Error('Invalid date or time string provided');
  }

  const trimmedDate = dateStr.trim();
  const trimmedTime = timeStr.trim();

  if (!trimmedDate || !trimmedTime) {
    throw new Error('Empty date or time string provided');
  }

  // Ensure time has seconds
  let timeWithSeconds = trimmedTime;
  if (trimmedTime.split(':').length === 2) {
    timeWithSeconds = `${trimmedTime}:00`;
  }

  // Create date-time string in local timezone
  const dateTimeStr = `${trimmedDate}T${timeWithSeconds}`;

  // Parse as local time
  const date = new Date(dateTimeStr);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date/time format: ${dateStr} ${timeStr}`);
  }

  // Return ISO string which represents the local time
  // Note: toISOString() converts to UTC, but since we're parsing local time,
  // the resulting ISO string will represent the correct local time when interpreted
  return date.toISOString();
}

/**
 * Get current date in local timezone YYYY-MM-DD format
 * @returns Current date string in YYYY-MM-DD format
 */
export function getCurrentLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get current timestamp in local timezone YYYYMMDDHHmmss format
 * @returns Current timestamp string
 */
export function getCurrentLocalTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Format a date object to local YYYY-MM-DD string
 * @param date Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatLocalDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date object provided');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Convert UTC date string to local date string (mimics frontend behavior)
 * @param utcDateStr UTC date string (ISO format like "2026-01-17T18:30:00.000Z")
 * @returns Date string in YYYY-MM-DD format in local timezone
 */
export function utcToLocalDateString(utcDateStr: string): string {
  if (!utcDateStr || typeof utcDateStr !== 'string') {
    throw new Error('Invalid UTC date string provided');
  }

  // Parse the UTC date string
  const utcDate = new Date(utcDateStr);
  if (isNaN(utcDate.getTime())) {
    throw new Error(`Invalid UTC date format: ${utcDateStr}`);
  }

  // Convert to local date string (same as frontend toLocaleDateString('en-CA'))
  return utcDate.toLocaleDateString('en-CA');
}
