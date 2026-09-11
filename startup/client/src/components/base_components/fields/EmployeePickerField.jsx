import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { deptEmpApi } from '@app/services/api';
import { SearchableDropdown } from './SearchableDropdown';

/**
 * The "Employee *" picker that the master forms (Reimbursement, LeavesTaken, ManualLog, ...) use.
 * Wraps `SearchableDropdown` with the conventional single-select setup plus a remount-safe key, so
 * each caller doesn't repeat the same six props. Set `disabledOnEdit` to lock the picker once a
 * record exists, which is the standard behavior in edit mode.
 *
 * `onChange` receives the selected emp code as a plain string ('' when cleared).
 */
const EmployeePickerField = ({
  employees: employeesProp,
  value,
  onChange,
  initialId,
  label = 'Employee',
  placeholder = 'Select employee',
  disabledOnEdit = false,
  disabled = false,
  required = true,
  valueField = 'emp_code',
  fetchParams,
  onEmployeesLoaded,
}) => {
  const [fetched, setFetched] = useState([]);
  const employees = employeesProp ?? fetched;

  // Keep the latest callback without making it a fetch dependency.
  const onLoadedRef = useRef(onEmployeesLoaded);
  onLoadedRef.current = onEmployeesLoaded;

  // Stable dependency for an object prop that's often passed inline.
  const paramsKey = JSON.stringify(fetchParams || {});

  useEffect(() => {
    // Caller supplied the list — don't fetch.
    if (employeesProp) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const response = await deptEmpApi.getDepartmentsAndEmployees(JSON.parse(paramsKey));
        const list = (response?.data?.employees || []).map((emp) => ({
          value: emp[valueField],
          emp_code: emp.emp_code,
          label: `${emp.emp_code} - ${emp.first_name} ${emp.last_name || ''}`.trim(),
        }));
        if (!cancelled) {
          setFetched(list);
          onLoadedRef.current?.(list);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.message || error?.response?.data?.message || 'Failed to fetch employees');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [employeesProp, valueField, paramsKey]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      <SearchableDropdown
        key={`employee-${initialId || 'new'}-${value}`}
        selectedValues={value}
        onChange={onChange}
        options={employees}
        placeholder={placeholder}
        multiple={false}
        disabled={disabled || (disabledOnEdit && Boolean(initialId))}
      />
    </div>
  );
};

EmployeePickerField.propTypes = {
  employees: PropTypes.array,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  initialId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.string,
  placeholder: PropTypes.string,
  disabledOnEdit: PropTypes.bool,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  valueField: PropTypes.oneOf(['emp_code', 'id']),
  fetchParams: PropTypes.object,
  onEmployeesLoaded: PropTypes.func,
};

export { EmployeePickerField };
