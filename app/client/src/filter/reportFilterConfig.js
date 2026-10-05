import { ApiService } from '@services/ApiService';
import { dateFiltersYesterday } from './filterConfig';

// Per-report filter panels. A report in getReportModules.js points at one of
// these through its `filtersConfig`, and the framework renders the panel from
// the array.
//
// A filter whose options come from the server declares `fetchData` beside its
// name and label; `options` is what it shows until that list arrives.
//
// Apps add their own arrays here; `commonFilters` is the starting set the
// example report (components/report/reports/user_report) uses.

const ALL_USERS = { value: 'all', label: 'All Users' };
const ALL_ROLES = { value: 'all', label: 'All Roles' };

const commonFilters = [
  ...dateFiltersYesterday,
  {
    name: 'user', label: 'User', type: 'select', default: 'all', order: 3,
    options: [ALL_USERS],
    // ApiService caches this read, so it is the same entry the framework's
    // Notification Log fills — whichever loads first pays for both.
    fetchData: ({ force }) =>
      ApiService.getAllUsers({ force }).then((resp) => [
        ALL_USERS,
        ...resp.data.users.map((user) => ({
          value: String(user.id),
          label: user.name || user.username || String(user.id),
        })),
      ]),
  },
  {
    name: 'role', label: 'Role', type: 'select', default: 'all', order: 4,
    options: [ALL_ROLES],
    fetchData: ({ force }) =>
      ApiService.getAllRoles({ force }).then((resp) => [
        ALL_ROLES,
        ...resp.data.map((role) => ({ value: String(role.id), label: role.name || String(role.id) })),
      ]),
  },
];

export {
  commonFilters,
};
