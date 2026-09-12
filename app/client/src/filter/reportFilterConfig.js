import { dateFiltersYesterday } from './filterConfig';

// Per-report filter panels. A report in getReportModules.js points at one of
// these through its `filtersConfig`, and the framework renders the panel from
// the array.
//
// A filter marked `dynamic: true` has its options fetched at render time by the
// loader registered under the same `name` in ./filterDynamicLoaders.js — that
// is how `user` and `role` below get populated.
//
// Apps add their own arrays here; `commonFilters` is the starting set the
// example report (components/report/reports/user_report) uses.
const commonFilters = [
  ...dateFiltersYesterday,
  { name: 'user', label: 'User', type: 'select', dynamic: true, options: [], default: 'all', order: 3 },
  { name: 'role', label: 'Role', type: 'select', dynamic: true, options: [], default: 'all', order: 4 },
];

export {
  commonFilters,
};
