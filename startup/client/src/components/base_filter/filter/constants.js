import {
  getPreviousMonthRange,
  getThisMonthRange,
  getTodayRange,
  getYesterdayRange,
} from '@utils/dateTimeUtils';


/** Responsive grid layout shared by both standard and non-standard filter rows. */
const FILTER_GRID_CLASS =
  'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5';

const QUICK_DATE_BTN_BASE =
  'px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 border-2 shadow-sm';
const QUICK_DATE_BTN_ENABLED =
  'bg-white text-gray-800 hover:bg-blue-50 hover:border-blue-500 hover:shadow-md border-blue-300 active:scale-95';
const QUICK_DATE_BTN_DISABLED =
  'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';

/** Quick-date presets shown alongside start_date / end_date filters. */
const QUICK_DATE_ACTIONS = [
  { label: 'Prev Month', getRange: getPreviousMonthRange },
  { label: 'This Month', getRange: getThisMonthRange },
  { label: 'Yesterday', getRange: getYesterdayRange },
  { label: 'Today', getRange: getTodayRange }
];

/** Fallback sort order for filter configs that don't specify `order`. */
const DEFAULT_FILTER_ORDER = 999;

export {
  FILTER_GRID_CLASS,
  QUICK_DATE_BTN_BASE,
  QUICK_DATE_BTN_ENABLED,
  QUICK_DATE_BTN_DISABLED,
  QUICK_DATE_ACTIONS,
  DEFAULT_FILTER_ORDER,
};
