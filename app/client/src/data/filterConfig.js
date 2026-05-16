import { getLocalDateStringYmd, getYesterdayYmd } from '@utils/dateTimeUtils';


const TODAY = getLocalDateStringYmd();
const YESTERDAY = getYesterdayYmd();

// Reports default to yesterday; pending-status master pages default to today.
// Two named exports = the "flag" — caller picks the variant they want.
const dateFiltersYesterday = [
  { name: 'start_date', label: 'Start Date', type: 'date', default: YESTERDAY, is_standard: true, order: 1 },
  { name: 'end_date', label: 'End Date', type: 'date', default: YESTERDAY, is_standard: true, order: 2 },
];

const dateFiltersToday = [
  { name: 'start_date', label: 'Start Date', type: 'date', default: TODAY, is_standard: true, order: 1 },
  { name: 'end_date', label: 'End Date', type: 'date', default: TODAY, is_standard: true, order: 2 },
];

//use this for debug like employment_type
const debugFilters = [
  // { name: 'employment_type', label: 'Employment Type', type: 'select', options: [], is_standard: true, order: 5, alwaysInclude: true, debug: true },
];



export {
  TODAY,
  YESTERDAY,
  dateFiltersYesterday,
  dateFiltersToday,
  debugFilters,
};
