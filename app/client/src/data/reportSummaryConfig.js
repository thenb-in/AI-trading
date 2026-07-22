const SUMMARY_HEADER_FIELDS = [
  { keys: ['emp_code', 'employee_code'], label: 'Employee Code' },
  { keys: ['first_name', 'employee_name'], label: 'Name' },
  { keys: ['department_name', 'employee_department'], label: 'Department' },
  { keys: ['position_name'], label: 'Position' },
  { keys: ['emp_type'], label: 'Employee Type' },
];

const DEFAULT_REPORT_SORT_FIELDS = ['employee_name', 'emp_code', 'employee_code'];

export { SUMMARY_HEADER_FIELDS, DEFAULT_REPORT_SORT_FIELDS };
