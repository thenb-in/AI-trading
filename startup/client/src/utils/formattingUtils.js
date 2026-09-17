import { parseDateValue, formatTimeForInput } from '@utils/dateTimeUtils';

const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '';
  try {
    let rawValue = dateTimeString;
    let wrapper = null;

    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      const isRoundWrapped = trimmed.startsWith('(') && trimmed.endsWith(')');
      const isSquareWrapped = trimmed.startsWith('[') && trimmed.endsWith(']');
      if (isRoundWrapped || isSquareWrapped) {
        wrapper = isRoundWrapped ? ['(', ')'] : ['[', ']'];
        rawValue = trimmed.slice(1, -1).trim();
      }
    }

    const date = parseDateValue(rawValue);
    if (!date || isNaN(date.getTime())) return '';
    const pad = (num) => num.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const formatted = `${day}-${month}-${year} ${hours}:${minutes}`;
    return wrapper ? `${wrapper[0]}${formatted}${wrapper[1]}` : formatted;
  } catch (e) {
    console.error('Error formatting datetime:', e);
    return '';
  }
}

// Format time as HH:MM
const formatTime = (timeString) => {
  if (!timeString) return '';
  if (typeof timeString === 'number') {
    const hours = Math.floor(timeString / 3600);
    const minutes = Math.floor((timeString % 3600) / 60);
    return `${hours}.${minutes.toString().padStart(2, '0')}`;
  }

  const asTimeInput = formatTimeForInput(timeString);
  if (asTimeInput) return asTimeInput;

  const date = parseDateValue(timeString);
  if (!date || isNaN(date.getTime())) {
    const raw = String(timeString);
    return raw.length >= 19 ? raw.substring(11, 19) : raw;
  }
  return date.toLocaleTimeString('en-US',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
}
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = parseDateValue(dateString);
  if (!date) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = date.getFullYear();
  const formattedDate = `${day}-${month}-${year}`;
  return formattedDate;
}


// Format duration in seconds to HH:MM
// Optimized to return early and avoid unnecessary processing
const formatDuration = (duration) => {
  // Early return for falsy or zero values
  if (!duration || duration === 0) {
    return '';
  }

  let hours = 0;
  let minutes = 0;

  // Handle different input types
  if (typeof duration === 'number') {
    // Early return if number is 0 or negative
    if (duration <= 0) {
      return '';
    }
    hours = Math.floor(duration / 3600);
    minutes = Math.floor((duration % 3600) / 60);
    // Early return if both are 0
    if (hours === 0 && minutes === 0) {
      return '';
    }
  } else if (typeof duration === 'string') {
    // Early return for empty strings
    if (!duration.trim()) {
      return '';
    }
    if (duration.includes('P')) {
      const timePart = duration.split('T')[1] || '';
      const hourMatch = timePart.match(/(\d+)H/);
      const minuteMatch = timePart.match(/(\d+)M/);
      hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
      minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
      // Early return if both are 0
      if (hours === 0 && minutes === 0) {
        return '';
      }
    } else {
      // Unknown string format - return empty
      return '';
    }
  } else if (typeof duration === 'object' && duration !== null) {
    hours = parseInt(duration.hours) || 0;
    minutes = parseInt(duration.minutes) || 0;
    // Early return if both are 0
    if (hours === 0 && minutes === 0) {
      return '';
    }
  } else {
    // Unsupported type - return empty
    return '';
  }

  // Format only if we have valid hours or minutes
  const formatted = `${hours.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')}`;
  return formatted;
};



/**
 * A full name as its words. Which of them is the first name and which the last is a guess
 * either way and differs by where the name came from, so that call is the caller's to make.
 */
const splitFullName = (fullName) =>
  String(fullName || '').trim().split(/\s+/).filter(Boolean);

const formatValueOrDash = (value) => (value === null || value === undefined ? '—' : String(value));

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/** A byte count in the largest unit that keeps it readable, e.g. `1.4 MB`. */
const formatBytes = (bytes, decimals = 1) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return '—';
  if (value === 0) return '0 B';
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), BYTE_UNITS.length - 1);
  const scaled = value / 1024 ** unitIndex;
  return `${unitIndex === 0 ? scaled : scaled.toFixed(decimals)} ${BYTE_UNITS[unitIndex]}`;
};

const sanitizeHTML = (value) => {
  if (!value) return '-';
  const stringValue = value == null ? '' : String(value);
  return stringValue.replace(/<[^>]+>/g, ''); // Basic HTML tag stripping
};

const getStatusClass = (value, statusDefinitions) => {
  if (!value) return '';
  const statusText = value.match(/>([^<]+)</)?.[1] || value;
  // Try to find status definition by direct text first, then by abbreviation
  const statusDef = statusDefinitions[statusText] || 
                   Object.values(statusDefinitions).find(def => def.abbr === statusText);
  return statusDef ? `bg-${statusDef.color}-100 text-${statusDef.color}-800` : '';
};

/** The count with the word that fits it: plural(1, 'hour') -> "1 hour", plural(2, 'person', 'people') -> "2 people". */
const plural = (count, one, many) => `${count} ${Number(count) === 1 ? one : many || `${one}s`}`;

/** A position as people say it: 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd". */
const ordinal = (n) => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const lastTwo = n % 100;
  return `${n}${suffixes[(lastTwo - 20) % 10] || suffixes[lastTwo] || suffixes[0]}`;
};

const formatDurationJson = (duration) => {
  // xd yh zm
  // don't show if x or y or z is 0
  let formatted = '';
  if (duration.days > 0) {
    formatted += `${duration.days}d `;
  }
  if (duration.hours > 0) {
    formatted += `${duration.hours}h `;
  }
  if (duration.minutes > 0) {
    formatted += `${duration.minutes}m`;
  }
  return formatted.trim();
};

export { formatDateTime, formatTime, formatDate, formatDuration, splitFullName, formatValueOrDash, formatBytes, sanitizeHTML, getStatusClass, formatDurationJson, plural, ordinal };