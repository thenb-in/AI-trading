import {
  canStepRange,
  getSteppedRange,
  getThisMonthRange,
  getTodayRange,
} from '@utils/dateTimeUtils';


/** Responsive grid layout shared by both standard and non-standard filter rows. */
const FILTER_GRID_CLASS =
  'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5';

// Sizing lives in the variants, not the base, so a variant can shrink a button without
// fighting the base's own padding/text utilities.
const QUICK_DATE_BTN_BASE = 'font-bold rounded-md transition-all duration-200 border-2';
const QUICK_DATE_BTN_ENABLED =
  'px-3 py-1.5 text-xs shadow-sm bg-white text-gray-800 hover:bg-blue-50 hover:border-blue-500 hover:shadow-md border-blue-300 active:scale-95';
/** Played-down variant for presets outside the unit the user is currently stepping through. */
const QUICK_DATE_BTN_MUTED =
  'px-2 py-1 text-[11px] bg-white/60 text-gray-500 border-blue-200 hover:bg-blue-50 hover:text-gray-800 hover:border-blue-400 hover:shadow-sm active:scale-95';
const QUICK_DATE_BTN_DISABLED =
  'px-3 py-1.5 text-xs bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';

/**
 * One preset that walks the period `offset` units at a time. Forward steps carry an
 * `isVisible` so they only surface once there is somewhere useful to step to; backward
 * steps are always available.
 */
const stepPreset = (label, unit, offset) => ({
  label,
  group: unit,
  getRange: (range) => getSteppedRange(unit, range, offset),
  ...(offset > 0 ? { isVisible: (range) => canStepRange(unit, range, offset) } : {}),
});

/**
 * Quick-date presets shown alongside start_date / end_date filters. Both `getRange` and
 * the optional `isVisible` receive the currently selected { start_date, end_date }: a
 * preset steps from that selection when it already has the preset's shape (see
 * dateTimeUtils), rather than always from today. `group` is the unit a preset moves in —
 * presets outside the unit last used are muted.
 */
const QUICK_DATE_ACTIONS = [
  stepPreset('Prev Month', 'month', -1),
  stepPreset('Next Month', 'month', 1),
  { label: 'This Month', group: 'month', getRange: getThisMonthRange },
  stepPreset('Prev Week', 'week', -1),
  stepPreset('Next Week', 'week', 1),
  stepPreset('Prev Day', 'day', -1),
  stepPreset('Next Day', 'day', 1),
  { label: 'Today', group: 'day', getRange: getTodayRange }
];

/** Fallback sort order for filter configs that don't specify `order`. */
const DEFAULT_FILTER_ORDER = 999;

export {
  FILTER_GRID_CLASS,
  QUICK_DATE_BTN_BASE,
  QUICK_DATE_BTN_ENABLED,
  QUICK_DATE_BTN_MUTED,
  QUICK_DATE_BTN_DISABLED,
  QUICK_DATE_ACTIONS,
  DEFAULT_FILTER_ORDER,
};
