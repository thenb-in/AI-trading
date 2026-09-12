import { getLocalDateStringYmd } from '@utils/dateTimeUtils';

// Shared filter pieces for the framework's own reports. Same shape and naming as
// the app's src/filter/filterConfig.js, so a report reads the same either side.

const TODAY = getLocalDateStringYmd();

// Deliveries and other framework logs are looked at the day they happen far more
// often than historically, so these default to today rather than to yesterday.
const dateFiltersToday = [
  { name: 'start_date', label: 'Start Date', type: 'date', default: TODAY, is_standard: true, order: 1 },
  { name: 'end_date', label: 'End Date', type: 'date', default: TODAY, is_standard: true, order: 2 },
];

export { TODAY, dateFiltersToday };
