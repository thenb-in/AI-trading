/** Local calendar YYYY-MM-DD (not UTC — avoids off-by-one vs <input type="date" max="...">). */
const getLocalDateStringYmd = (date = new Date()) => {
  const y = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${month}-${day}`;
};

// Get current date and time in datetime-local format
const getCurrentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDate = (date_str) => {
  const date = new Date(date_str);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * `<input type="date">`-ready YYYY-MM-DD string. Goes through `parseDateValue` so it accepts
 * the same mix of inputs the rest of the app does (ISO strings, Date objects, dd-mm-yyyy, ...).
 * Returns '' for falsy/unparseable values so the date input shows as empty rather than `NaN`.
 */
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    const date = parseDateValue(dateString);
    if (!date || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};


const formatTimeForInput = (timeValue) => {
  if (!timeValue) return '';
  try {
    const raw = String(timeValue).trim();
    if (!raw) return '';

    const timeMatch = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}`;
    }

    const date = parseDateValue(timeValue);
    if (!date || isNaN(date.getTime())) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
};

// Convert local datetime to ISO string (no timezone conversion needed)
const convertToISOString = (localDateTime) => {
  if (!localDateTime) return null;

  // Create a Date object from the local datetime string
  const date = new Date(localDateTime);

  // Return as ISO string (database will handle timezone)
  return date.toISOString();
};

// Calculate duration in minutes between start and end times
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return "";
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  return Math.max(0, Math.round(diffMs / 60000)); // Convert to minutes
};

// Calculate end time based on start time and duration
const calculateEndTime = (startTime, durationMinutes) => {
  if (!startTime || !durationMinutes) return "";

  // Parse the start time string to get date components
  const [datePart, timePart] = startTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  // Create a new date object with the start time
  const startDate = new Date(year, month - 1, day, hours, minutes);

  // Add the duration in minutes
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  // Format back to datetime-local format
  const endYear = endDate.getFullYear();
  const endMonth = String(endDate.getMonth() + 1).padStart(2, "0");
  const endDay = String(endDate.getDate()).padStart(2, "0");
  const endHours = String(endDate.getHours()).padStart(2, "0");
  const endMinutes = String(endDate.getMinutes()).padStart(2, "0");

  return `${endYear}-${endMonth}-${endDay}T${endHours}:${endMinutes}`;
};

// Format duration display (show hours and minutes if > 60)
const formatDurationDisplay = (minutes) => {
  if (!minutes || minutes <= 0) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
};

// Format duration compact display: "1h 40m"
const formatDurationCompact = (minutes) => {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
};

// Parse duration input (handle "1 hr 40 min" format)
const parseDurationInput = (input) => {
  if (!input) return "";
  // If it's just a number, return as is
  if (/^\d+$/.test(input)) return parseInt(input);

  // Parse "X hr Y min" format
  const hourMatch = input.match(/(\d+)\s*hr/);
  const minuteMatch = input.match(/(\d+)\s*min/);

  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;

  return hours * 60 + minutes;
};

const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return "-";
  const date = new Date(dateTimeString);
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const formatLastActive = (lastActive) => {
  if (!lastActive) return "N/A";

  const date = new Date(lastActive);

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Returns the start-of-day and end-of-day Date objects for today + dayOffset.
 * `dayOffset` can be negative (e.g. -7 for a week ago, -30 for a month ago).
 * Mirrors server `getDayBounds` in src/utils/dateUtils.js.
 * @param {number} [dayOffset=0]
 * @returns {{ start: Date, end: Date }}
 */
/** Previous calendar month's full range (first day → last day) as YYYY-MM-DD strings. */
const getPreviousMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start_date: getLocalDateStringYmd(firstDay),
    end_date: getLocalDateStringYmd(lastDay),
  };
};

/** Full calendar-month range (1st → last day) for the month containing `date`, as YYYY-MM-DD strings. */
const getMonthFullRange = (date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: getLocalDateStringYmd(firstDay),
    end: getLocalDateStringYmd(lastDay),
  };
};

/** Full current calendar month (1st → last day) as YYYY-MM-DD. */
const getThisMonthFullRange = () => getMonthFullRange(new Date());

/** Full next calendar month (1st → last day) as YYYY-MM-DD. */
const getNextMonthFullRange = () => {
  const now = new Date();
  return getMonthFullRange(new Date(now.getFullYear(), now.getMonth() + 1, 1));
};

/** Today → today + 1 year, as YYYY-MM-DD. */
const getOneYearFromTodayRange = () => {
  const today = new Date();
  const oneYearLater = new Date(today.getTime());
  oneYearLater.setFullYear(today.getFullYear() + 1);
  return {
    start: getLocalDateStringYmd(today),
    end: getLocalDateStringYmd(oneYearLater),
  };
};

/** Yesterday as a Date object (local time). */
const getYesterday = () => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return y;
};

/** Yesterday's local calendar date as YYYY-MM-DD. */
const getYesterdayYmd = () => getLocalDateStringYmd(getYesterday());


const extendDateRange = (startDate, endDate, daysBefore = 0, daysAfter = 0) => {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  if (!start || !end) return { start_date: null, end_date: null };
  start.setDate(start.getDate() - daysBefore);
  end.setDate(end.getDate() + daysAfter);
  return {
    start_date: getLocalDateStringYmd(start),
    end_date: getLocalDateStringYmd(end),
  };
};

/** Current month range: 1st of this month → yesterday (as YYYY-MM-DD). */
const getThisMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayYmd = getLocalDateStringYmd(firstDay);
  const yesterdayYmd = getYesterdayYmd();
  return {
    start_date: firstDayYmd,
    end_date: yesterdayYmd < firstDayYmd ? firstDayYmd : yesterdayYmd,
  };
};

/** Single-day range for today (as YYYY-MM-DD). */
const getTodayRange = () => {
  const ymd = getLocalDateStringYmd();
  return { start_date: ymd, end_date: ymd };
};

/** Single-day range for yesterday (as YYYY-MM-DD). */
const getYesterdayRange = () => {
  const ymd = getYesterdayYmd();
  return { start_date: ymd, end_date: ymd };
};

const getDayBounds = (dayOffset = 0) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + dayOffset);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/** Excel serial day number (e.g. from ExcelJS) → UTC Date (epoch ms). */
const dateFromExcelSerial = (serial) => {
  if (serial == null || !Number.isFinite(Number(serial))) return null;
  return new Date((Number(serial) - 25569) * 86400 * 1000);
};

/** Reinterpret an ExcelJS date (UTC components hold wall-clock time) as local-time ISO. e.g. Date "2026-05-14T15:34:00Z" → "2026-05-14T10:04:00.000Z" in IST. */
const excelDateToLocalIsoString = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  const local = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  );
  return local.toISOString();
};

/** Parse "DD-MM-YYYY HH:mm[:ss]" or "DD/MM/YYYY HH:mm[:ss]" → local-time Date (null if no match). e.g. "14-05-2026 15:34" → Date(2026, 4, 14, 15, 34). */
const parseDayFirstDateTime = (str) => {
  if (typeof str !== 'string') return null;
  const match = str.trim().match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (!match) return null;
  const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = match;
  const d = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds),
  );
  return isNaN(d.getTime()) ? null : d;
};

/** Construct Date from UTC epoch milliseconds (for call sites where eslint disallows `new Date(ms)`). */
const dateFromEpochMs = (ms) => new Date(ms);

// Parse date value from various formats to Date object
// Supports: Date objects, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY formats
const parseDateValue = (dateValue) => {
  if (!dateValue) return null;

  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      // return a clone of date with the same timezone as the original date
      return isNaN(dateValue.getTime()) ? null : new Date(dateValue.getTime());
    }

    // If it's a string, try to parse it
    if (typeof dateValue === "string") {
      const dateStr = dateValue.trim();
      if (!dateStr) return null;

      // Try YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
      }

      // Try DD-MM-YYYY, DD/MM/YYYY, or DD.MM.YYYY format
      const parts = dateStr.split(/[-/.]/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, "0");
        const month = parts[1].padStart(2, "0");
        const year = parts[2];
        const parsed = new Date(`${year}-${month}-${day}`);
        return isNaN(parsed.getTime()) ? null : parsed;
      }

      // Fallback for other parseable date strings (ISO datetime, etc.)
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
    }
  } catch (error) {
    console.log(`parseDateValue error: ${error}`);
    return null;
  }

  return null;
};

/**
 * Return a NEW array sorted by ascending date (earliest first). `getDate` maps an
 * item to its date value (defaults to `item.date`); items with unparseable dates
 * sort as epoch 0. Replaces the `[...x].sort((a,b) => parseDateValue(...))` block
 * duplicated across schedule/repayment screens.
 */
const sortByDateAscending = (items, getDate = (item) => item?.date) =>
  [...(items || [])].sort((a, b) => {
    const da = parseDateValue(getDate(a));
    const db = parseDateValue(getDate(b));
    return (da?.getTime() ?? 0) - (db?.getTime() ?? 0);
  });

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Lowercased 3-letter month -> 0-based month index, derived from SHORT_MONTH_NAMES.
const SHORT_MONTH_INDEX = SHORT_MONTH_NAMES.reduce((acc, name, idx) => {
  acc[name.toLowerCase()] = idx;
  return acc;
}, {});

/** Last calendar day (28–31) of the given month. `monthIndex` is 0-based. */
const getLastDayOfMonth = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

/** True when the date falls on the last calendar day of its month. Accepts any
 * value `parseDateValue` understands; false for falsy/unparseable input. */
const isMonthEnd = (dateValue) => {
  const d = parseDateValue(dateValue);
  if (!d) return false;
  return d.getDate() === getLastDayOfMonth(d.getFullYear(), d.getMonth());
};

// Assemble a YYYY-MM-DD string, or null if any part is out of range.
const buildYmd = (yearNum, monthIndex, day) => {
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  if (monthIndex === undefined || monthIndex < 0 || monthIndex > 11) return null;
  if (!Number.isFinite(yearNum)) return null;
  return `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Convert an attendance date-column header to a YYYY-MM-DD string. Accepts (day-first):
 *   • "01MayFri" / "01May" / "01 May"       → month-name; year comes from the `year` arg
 *   • "01 May 2026" / "1 January 2026"       → month-name + explicit year (arg ignored)
 *   • "01/06/2026" / "01-06-2026" / "1/6/26" → numeric DD/MM/YYYY (day first, 2- or 4-digit year)
 * Returns null for anything that isn't a recognizable date (so it doubles as a "is this a date
 * column?" test and won't match plain headers like "Code" / "Position").
 *
 * @param {string} label
 * @param {number|string} year fallback year when the label has no year (e.g. "01MayFri")
 * @returns {string|null} e.g. "2026-05-01"
 */
const attendanceColumnLabelToDate = (label, year) => {
  if (label === null || label === undefined) return null;
  const str = String(label).trim();
  if (!str) return null;

  // Day + month-name (+ optional weekday text) (+ optional explicit year): "01MayFri", "01 May 2026".
  const nameMatch = str.match(/^(\d{1,2})\s*([A-Za-z]{3})[A-Za-z]*\.?\s*(\d{4})?$/);
  if (nameMatch) {
    const day = parseInt(nameMatch[1], 10);
    const monthIndex = SHORT_MONTH_INDEX[nameMatch[2].toLowerCase()];
    const yearNum = nameMatch[3] ? parseInt(nameMatch[3], 10) : parseInt(year, 10);
    return buildYmd(yearNum, monthIndex, day);
  }

  // Numeric day-first date: "01/06/2026", "01-06-2026", "1/6/26".
  const numMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const monthIndex = parseInt(numMatch[2], 10) - 1;
    let yearNum = parseInt(numMatch[3], 10);
    if (numMatch[3].length === 2) yearNum += 2000; // "26" → 2026
    return buildYmd(yearNum, monthIndex, day);
  }

  return null;
};


const buildYearOptions = (centerYear = new Date().getFullYear(), { before = 4, after = 1 } = {}) => {
  const years = [];
  for (let y = centerYear + after; y >= centerYear - before; y--) years.push(y);
  return years;
};

/** "2 Jan 2025" — short-month date. Returns "-" for falsy/unparseable input. */
const formatDateForDisplay = (dateValue) => {
  if (!dateValue) return "-";
  const date = parseDateValue(dateValue);
  if (!date) return "-";
  try {
    return `${date.getDate()} ${SHORT_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  } catch (error) {
    console.log(`formatDateForDisplay ${error}`);
    return "-";
  }
};

/** "10:30 AM" — 12h hour:minute. Returns "—" for unparseable input. */
const formatTimeForDisplay = (dateValue) => {
  const date = parseDateValue(dateValue);
  if (!date) return "—";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/** "2 Jan 2025 10:30:45" — short-month date plus 24h hh:mm:ss. Returns "-" for falsy/unparseable input. */
const formatDateTimeForDisplay = (dateValue) => {
  if (!dateValue) return "-";
  const date = parseDateValue(dateValue);
  if (!date) return "-";
  try {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${date.getDate()} ${SHORT_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.log(`formatDateTimeForDisplay ${error}`);
    return "-";
  }
};

/**
 * Human-friendly "time ago" label from any value `parseDateValue` understands.
 * "Just now" (<1 min) → "5 min ago" → "3 hours ago" → "Yesterday" → "4 days ago",
 * then falls back to a locale date string for anything older than a week.
 * Returns '' for falsy/unparseable input.
 */
const formatRelativeTime = (dateValue) => {
  const date = parseDateValue(dateValue);
  if (!date) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString();
};

/**
 * Calendar-relative bucket label for a date: "Today", "Yesterday", or `defaultLabel`
 * for anything older or undated. Used to group timeline-style lists by day.
 */
const getDayGroupLabel = (dateValue, defaultLabel = "Earlier") => {
  const date = parseDateValue(dateValue);
  if (!date) return defaultLabel;

  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return defaultLabel;
};

/** Default report range: before 10th use prev month full; otherwise this month start → yesterday. */
const getDefaultReportDateRange = () => {
  const now = new Date();
  if (now.getDate() < 10) {
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      start_date: getLocalDateStringYmd(prevMonthStart),
      end_date: getLocalDateStringYmd(prevMonthEnd),
    };
  }
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    start_date: getLocalDateStringYmd(monthStart),
    end_date: getLocalDateStringYmd(yesterday),
  };
};

/** Previous month's 1st → yesterday. */
const getPrevMonthStartYesterdayRange = () => {
  const now = new Date();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    start_date: getLocalDateStringYmd(prevMonthStart),
    end_date: getLocalDateStringYmd(yesterday),
  };
};



/**
 * Month-to-date range for a date: from the first day of that date's month up to
 * (and including) the date itself. Computed from the YYYY-MM-DD string (not Date)
 * to avoid timezone drift. Generic — e.g. used for the FnF settlement period
 * (start of resignation month → resignation date).
 * @param {string} date - 'yyyy-mm-dd'
 * @returns {{ startDate: string|null, endDate: string|null }}
 */
const getMonthToDateRange = (date) => {
  const [year, month] = String(date || "").split("-");
  if (!year || !month) return { startDate: null, endDate: null };
  return { startDate: `${year}-${month}-01`, endDate: date };
};

export {
  getMonthToDateRange,
  getLocalDateStringYmd,
  getYesterday,
  getYesterdayYmd,
  getDefaultReportDateRange,
  getPrevMonthStartYesterdayRange,
  extendDateRange,
  getCurrentDateTime,
  formatDate,
  formatDateForInput,
  formatTimeForInput,
  getThisMonthFullRange,
  getNextMonthFullRange,
  getOneYearFromTodayRange,
  getPreviousMonthRange,
  getThisMonthRange,
  getTodayRange,
  getYesterdayRange,
  getDayBounds,
  dateFromExcelSerial,
  excelDateToLocalIsoString,
  parseDayFirstDateTime,
  dateFromEpochMs,
  convertToISOString,
  calculateDuration,
  calculateEndTime,
  formatDurationDisplay,
  formatDurationCompact,
  parseDurationInput,
  formatDateTime,
  formatLastActive,
  parseDateValue,
  sortByDateAscending,
  getLastDayOfMonth,
  isMonthEnd,
  buildYmd,
  attendanceColumnLabelToDate,
  buildYearOptions,
  formatDateForDisplay,
  formatTimeForDisplay,
  formatDateTimeForDisplay,
  formatRelativeTime,
  getDayGroupLabel,
};
