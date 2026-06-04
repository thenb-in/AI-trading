import { deptEmpApi, costCenterApi } from '@app/services/api';
import { ApiService } from '@services/ApiService';

const buildEmployeeOptions = (employees) => [
  { value: 'all', label: 'All Employees' },
  ...employees.map((emp) => ({
    value: emp.id.toString(),
    label: `${emp.first_name || ''} ${emp.last_name || ''} (${emp.emp_code})`,
    inactive: emp.is_active === false,
  })),
];

const buildDepartmentOptions = (departments) => [
  { value: 'all', label: 'All Departments' },
  ...departments.map((d) => ({ value: d.id.toString(), label: d.dept_name })),
];

const buildCostCenterOptions = (costCenters) => [
  { value: 'all', label: 'All Cost Centers' },
  ...costCenters.map((cc) => ({
    value: cc.id.toString(),
    label: cc.cost_center_name || cc.name || cc.code,
  })),
];

const buildEmploymentTypeOptions = (types) => [
  { value: 'all', label: 'All Types' },
  ...types.map((t) => {
    const v = typeof t === 'string' ? t.toLowerCase() : String(t);
    const l = typeof t === 'string' ? t.charAt(0).toUpperCase() + t.slice(1) : String(t);
    return { value: v, label: l };
  }),
];

const buildUserOptions = (users) => [
  { value: 'all', label: 'All Users' },
  ...users.map((u) => ({
    value: String(u.id),
    label: u.name || u.username || String(u.id),
  })),
];

// Dedup concurrent calls within one hook cycle: employee, department, and
// employment_type all derive from the same deptEmp API response.
let _deptEmpInflight = null;
const fetchDeptEmp = () => {
  if (!_deptEmpInflight) {
    _deptEmpInflight = deptEmpApi
      .getDepartmentsAndEmployees({ is_active: 'all' })
      .finally(() => {
        _deptEmpInflight = null;
      });
  }
  return _deptEmpInflight;
};

const FILTER_DYNAMIC_LOADERS = {
  employee: {
    fetch: () => fetchDeptEmp().then((resp) => resp?.data?.employees || []),
    build: buildEmployeeOptions,
  },
  department: {
    fetch: () => fetchDeptEmp().then((resp) => resp?.data?.departments || []),
    build: buildDepartmentOptions,
  },
  employment_type: {
    fetch: () => fetchDeptEmp().then((resp) => resp?.data?.employees_type || []),
    build: buildEmploymentTypeOptions,
  },
  cost_center: {
    fetch: () =>
      costCenterApi
        .getAllCostCenters()
        .then((resp) => (resp?.data?.success ? resp.data.data?.costCenters || [] : [])),
    build: buildCostCenterOptions,
  },
  user_id: {
    fetch: () =>
      ApiService.getAllUsers().then((resp) =>
        Array.isArray(resp?.data?.users) ? resp.data.users : []
      ),
    build: buildUserOptions,
  },
};

export { FILTER_DYNAMIC_LOADERS };
