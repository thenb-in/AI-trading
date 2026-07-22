const commonFilters = [
  { name: 'user', label: 'User', type: 'select', options: [], dynamic: true, is_standard: true, order: 3 },
  { name: 'role', label: 'Role', type: 'select', options: [], dynamic: true, multiselect: true, clearable: true, is_standard: true, order: 4 },
  { name: 'is_active', label: 'Is Active', type: 'checkbox', default: true, is_standard: true, order: 6 },
];

export { commonFilters };


