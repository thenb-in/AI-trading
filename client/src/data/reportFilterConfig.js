import { format } from 'date-fns';

const getCurrentDate = () => format(new Date(), 'yyyy-MM-dd');


const commonFilters = [
  { name: 'user', label: 'User', type: 'select', options: [], is_standard: true, order: 3},
  { name: 'role', label: 'Role', type: 'select', options: [], multiselect: true, clearable: true, is_standard: true, order: 4},
   { name: 'is_active', label: 'Is Active', type: 'checkbox', default: true ,is_standard: true, order: 6},
];

export { commonFilters, getCurrentDate };
