import { deptEmpApi, costCenterApi, positionApi } from '@app/services/api';
import { ApiService } from '@services/ApiService';

const buildUserOptions = (users) => [
  { value: 'all', label: 'All Users' },
  ...users.map((u) => ({
    value: String(u.id),
    label: u.name || u.username || String(u.id),
  })),
];

const buildRoleOptions = (roles) => [
  { value: 'all', label: 'All Roles' },
  ...roles.map((r) => ({
    value: String(r.id),
    label: r.name || String(r.id),
  })),
];

const FILTER_DYNAMIC_LOADERS = {
  user: {
    fetch: () =>
      ApiService.getAllUsers().then((resp) =>
        Array.isArray(resp?.data?.users) ? resp.data.users : []
      ),
    build: buildUserOptions,
  },
  role: {
    fetch: () =>
      ApiService.getAllRoles().then((resp) =>
        Array.isArray(resp?.data) ? resp.data : []
      ),
    build: buildRoleOptions,
  },
};

export { FILTER_DYNAMIC_LOADERS };
