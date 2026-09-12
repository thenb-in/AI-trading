import { ApiService } from '@services/ApiService';

// Option loaders for the framework's own report filters. A filter marked
// `dynamic: true` has its options fetched at render time by the loader
// registered here under the same `name`. Same shape as the app's
// src/filter/filterDynamicLoaders.js.

const buildUserOptions = (users) => [
  { value: 'all', label: 'All Users' },
  ...users.map((user) => ({
    value: String(user.id),
    label: user.name || user.username || String(user.id),
  })),
];

const FILTER_DYNAMIC_LOADERS = {
  user_id: {
    fetch: () =>
      ApiService.getAllUsers().then((resp) =>
        Array.isArray(resp?.data?.users) ? resp.data.users : []
      ),
    build: buildUserOptions,
  },
};

export { FILTER_DYNAMIC_LOADERS };
