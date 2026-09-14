/** Local calendar YYYY-MM-DD (not UTC — avoids off-by-one vs <input type="date" max="...">). */
const getLocalDateStringYmd = (date = new Date()) => {
  const y = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${month}-${day}`;
};

/** `<input type="datetime-local">`-ready YYYY-MM-DDTHH:mm, in local time. */
const getCurrentDateTime = () => convertISOToDateTimeLocal(new Date());

const convertISOToDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
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

// One duration formatter for the whole app. Give it a value in `from` units
// ('seconds' | 'minutes') and choose which parts to show with `units` — any
// combination of 'h', 'm', 's' (e.g. 'hms', 'hm', 'ms', 'm', 's'), or 'auto'
// (hours+minutes over an hour, else minutes+seconds). The largest shown unit
// absorbs any overflow; the value floors into the units below it. `zero`
// overrides what a zero/negative value renders as.
const buildDurationParts = (totalSeconds, units) => {
  let remaining = totalSeconds;
  const parts = [];
  if (units.includes('h')) {
    const h = Math.floor(remaining / 3600);
    remaining -= h * 3600;
    parts.push(`${h}h`);
  }
  if (units.includes('m')) {
    const m = Math.floor(remaining / 60);
    remaining -= m * 60;
    parts.push(`${m}m`);
  }
  if (units.includes('s')) {
    parts.push(`${remaining}s`);
  }
  return parts.join(' ');
};

const zeroDurationLabel = (units) =>
  ['h', 'm', 's'].filter((u) => units.includes(u)).map((u) => `0${u}`).join(' ') || '0s';

const formatDuration = (value, { from = 'seconds', units = 'auto', zero } = {}) => {
  const s = Math.round((Number(value) || 0) * (from === 'minutes' ? 60 : 1));
  const resolvedUnits = units === 'auto' ? (s >= 3600 ? 'hm' : 'ms') : units;
  if (s <= 0) return zero !== undefined ? zero : zeroDurationLabel(resolvedUnits);
  return buildDurationParts(s, resolvedUnits);
};

/**
 * Units a duration reads in, largest first. `maxSeconds` covers units whose real
 * length varies — a month is 30 *or* 31 days, a year 365 *or* 366 — so a value
 * landing anywhere in that span is stated flatly instead of approximated.
 */
const DURATION_UNITS = [
  { key: 'year', seconds: 365 * 86400, maxSeconds: 366 * 86400, one: 'year', many: 'years' },
  { key: 'month', seconds: 30 * 86400, maxSeconds: 31 * 86400, one: 'month', many: 'months' },
  { key: 'week', seconds: 7 * 86400, one: 'week', many: 'weeks' },
  { key: 'day', seconds: 86400, one: 'day', many: 'days' },
  { key: 'hour', seconds: 3600, one: 'hr', many: 'hrs' },
  { key: 'minute', seconds: 60, one: 'min', many: 'mins' },
  { key: 'second', seconds: 1, one: 'sec', many: 'secs' },
];

const UNIT_SECONDS = Object.fromEntries(DURATION_UNITS.map((unit) => [unit.key, unit.seconds]));

/**
 * How close to a whole unit a value must get to be summarized as that unit, so a
 * few days short of a month still reads "~1 month" rather than dropping to weeks.
 */
const NEAR_UNIT_RATIO = 0.9;

const unitLabel = (unit, count) => `${count} ${count === 1 ? unit.one : unit.many}`;

/** True when the value lands on a whole number of the unit, variable length allowed. */
const isExactSpan = (unit, count, seconds) =>
  seconds >= count * unit.seconds && seconds <= count * (unit.maxSeconds ?? unit.seconds);

/**
 * A duration in words. `unit` is the granularity of `value` and doubles as the
 * floor — a value given in days never breaks down into hours.
 *
 * `maxUnits: 1` rounds to the nearest single unit, so "~" appears on both sides
 * of it — a few days either way of a month both read "~1 month":
 *   humanizeDuration(30,  { unit: 'day', maxUnits: 1 })  -> "1 month"
 *   humanizeDuration(31,  { unit: 'day', maxUnits: 1 })  -> "1 month"
 *   humanizeDuration(33,  { unit: 'day', maxUnits: 1 })  -> "~1 month"
 *   humanizeDuration(28,  { unit: 'day', maxUnits: 1 })  -> "~1 month"
 *   humanizeDuration(365, { unit: 'day', maxUnits: 1 })  -> "1 year"
 *
 * Above that it breaks down instead, exactly, and only marks "~" when the cap
 * drops a non-zero remainder:
 *   humanizeDuration(3900, { unit: 'second' })           -> "1 hr 5 mins"
 *   humanizeDuration(400,  { unit: 'day' })              -> "~1 year 1 month"
 *
 * @param {number|string} value
 * @param {{unit?: string, maxUnits?: number, emptyLabel?: string}} [options]
 * @returns {string} `emptyLabel` (default '') for blank/zero/negative input
 */
const humanizeDuration = (value, { unit = 'minute', maxUnits = 2, emptyLabel = '' } = {}) => {
  const perUnit = UNIT_SECONDS[unit];
  const total = Math.round(Number(value) * perUnit);
  if (!perUnit || !Number.isFinite(total) || total <= 0) return emptyLabel;

  const usable = DURATION_UNITS.filter((candidate) => candidate.seconds >= perUnit);

  if (maxUnits === 1) {
    const chosen = usable.find((candidate) => total >= candidate.seconds * NEAR_UNIT_RATIO)
      ?? usable[usable.length - 1];
    const count = Math.max(1, Math.round(total / chosen.seconds));
    const prefix = isExactSpan(chosen, count, total) ? '' : '~';
    return `${prefix}${unitLabel(chosen, count)}`;
  }

  let rest = total;
  const parts = [];
  for (const candidate of usable) {
    if (parts.length === maxUnits) break;
    const count = Math.floor(rest / candidate.seconds);
    if (!count) continue;
    parts.push(unitLabel(candidate, count));
    rest -= count * candidate.seconds;
  }

  if (!parts.length) return emptyLabel;
  return `${rest > 0 ? '~' : ''}${parts.join(' ')}`;
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
/**
 * 'YYYY-MM-DD' → local-midnight Date, null for anything else. Unlike `new Date(str)`
 * (which reads the string as UTC) the calendar day never shifts across timezones.
 */
const parseYmd = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return isNaN(date.getTime()) ? null : date;
};

/** New Date shifted by whole calendar days, at local midnight. */
const shiftDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Day the week starts on for quick-date ranges (0 = Sunday, 1 = Monday). */
const WEEK_START_DAY = 1;

/** Full week (WEEK_START_DAY → +6 days) containing `date`, as a filter range. */
const getWeekFullRange = (date) => {
  const start = shiftDays(date, -((date.getDay() - WEEK_START_DAY + 7) % 7));
  return {
    start_date: getLocalDateStringYmd(start),
    end_date: getLocalDateStringYmd(shiftDays(start, 6)),
  };
};

/** Single-day filter range for `date`. */
const getDayRange = (date) => {
  const ymd = getLocalDateStringYmd(date);
  return { start_date: ymd, end_date: ymd };
};

/**
 * The units a date range can be stepped in. Each unit knows how to recognise a range of
 * its own shape — so stepping continues from the selected period rather than from today
 * — and how to build the range `offset` units away from an anchor date. Adding a unit
 * (quarter, year, ...) here is all a new pair of prev/next presets needs.
 */
const DATE_RANGE_UNITS = {
  month: {
    hasShape: (start, end) =>
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === 1 &&
      end.getDate() === getLastDayOfMonth(end.getFullYear(), end.getMonth()),
    rangeAt: (anchor, offset) => {
      const { start, end } = getMonthFullRange(
        new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1)
      );
      return { start_date: start, end_date: end };
    },
  },
  week: {
    hasShape: (start, end) => {
      const week = getWeekFullRange(start);
      return week.start_date === getLocalDateStringYmd(start) &&
        week.end_date === getLocalDateStringYmd(end);
    },
    rangeAt: (anchor, offset) => getWeekFullRange(shiftDays(anchor, offset * 7)),
  },
  day: {
    hasShape: (start, end) => start.getTime() === end.getTime(),
    rangeAt: (anchor, offset) => getDayRange(shiftDays(anchor, offset)),
  },
};


const eachDayInRange = (startValue, endValue) => {
  const start = parseDateValue(startValue);
  const end = parseDateValue(endValue);
  if (!start || !end || start > end) return [];

  const days = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor <= end) {
    days.push(getLocalDateStringYmd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

/** True when a range has the given unit's shape (whole month / whole week / single day). */
const matchesUnitShape = (range, unit) => {
  const start = parseYmd(range?.start_date);
  const end = parseYmd(range?.end_date);
  return Boolean(start && end && DATE_RANGE_UNITS[unit].hasShape(start, end));
};

/** Today at local midnight. */
const getStartOfToday = () => shiftDays(new Date(), 0);

/** True when the range's last day is already past — i.e. the period has fully elapsed. */
const hasRangeElapsed = (range) => {
  const end = parseYmd(range?.end_date);
  return Boolean(end && end < getStartOfToday());
};

/**
 * The range `offset` units away from `range`: measured from the range's own period when
 * it already has that unit's shape — so repeated steps walk the calendar (Jan → Dec →
 * Nov) — and from today otherwise.
 * @param {'month'|'week'|'day'} unit
 * @param {{start_date: string, end_date: string}} [range] currently selected period
 * @param {number} offset units to move, negative for backwards
 */
const getSteppedRange = (unit, range, offset) => {
  const anchor = matchesUnitShape(range, unit) ? parseYmd(range.start_date) : new Date();
  return DATE_RANGE_UNITS[unit].rangeAt(anchor, offset);
};

/**
 * Whether a step is worth offering as a button: only from a period that already has the
 * unit's shape, and only onto a period that has fully elapsed. Stepping onto the running
 * month/week/day is never offered — one step back from today already sits there, and
 * "This Month" / "Today" cover it.
 */
const canStepRange = (unit, range, offset) =>
  matchesUnitShape(range, unit) && hasRangeElapsed(getSteppedRange(unit, range, offset));

/**
 * Previous calendar month's full range (first day → last day) as YYYY-MM-DD strings.
 * When `range` is already a whole calendar month it steps back from that month
 * (Jan → Dec) rather than from today.
 */
const getPreviousMonthRange = (range) => getSteppedRange('month', range, -1);

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
const getTodayRange = () => getDayRange(new Date());

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
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * "10:30 AM - 11:45 AM"
 */
const formatTimeRangeForDisplay = (startValue, endValue, collapseWithinMinutes = 1) => {
  const startDate = parseDateValue(startValue);
  const endDate = parseDateValue(endValue);
  const minutesApart =
    startDate && endDate ? (endDate.getTime() - startDate.getTime()) / 60000 : 0;
  if (minutesApart <= collapseWithinMinutes) {
    return formatTimeForDisplay(startValue);
  }
  return `${formatTimeForDisplay(startValue)} - ${formatTimeForDisplay(endValue)}`;
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

// ─── Local-time date helpers ──────────────────────────────────────────────
// These format/parse against the *browser's* timezone rather than UTC, which
// is what date-only fields (an invoice date, a delivery date) need: a date
// picked as the 14th must not become the 13th when serialized.

// Module-private: only formatDateOnlyYmd needs it, to read the month out of a
// JS `Date.prototype.toString()` value ("Wed May 14 2025 ...").
const MONTH_NAME_TO_INDEX = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/** Date-only YYYY-MM-DD from a Date, an ISO string, or a JS `toString()` date. */
const formatDateOnlyYmd = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : getLocalDateStringYmd(value);
  }
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  const jsDatePrefix = raw.match(/^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/);
  if (jsDatePrefix) {
    const month = MONTH_NAME_TO_INDEX[jsDatePrefix[1].toLowerCase()];
    const day = parseInt(jsDatePrefix[2], 10);
    const year = parseInt(jsDatePrefix[3], 10);
    if (month !== undefined && !Number.isNaN(day) && !Number.isNaN(year)) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const parsed = parseDateValue(raw);
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return getLocalDateStringYmd(parsed);
  }
  return '';
};

/** The inverse: what a datetime-local input gave you, as a UTC ISO string. */
const dateTimeLocalToISO = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export {
  formatDateOnlyYmd,
  convertISOToDateTimeLocal,
  dateTimeLocalToISO,

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
  getSteppedRange,
  canStepRange,
  parseYmd,
  shiftDays,
  getThisMonthRange,
  getTodayRange,
  getDayBounds,
  dateFromExcelSerial,
  excelDateToLocalIsoString,
  parseDayFirstDateTime,
  dateFromEpochMs,
  convertToISOString,
  calculateDuration,
  calculateEndTime,
  formatDuration,
  humanizeDuration,
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
  formatTimeRangeForDisplay,
  eachDayInRange,
  formatDateTimeForDisplay,
  formatRelativeTime,
  getDayGroupLabel,
};
