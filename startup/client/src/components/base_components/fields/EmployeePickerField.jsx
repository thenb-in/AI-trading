import PropTypes from 'prop-types';
import { SearchableDropdown } from './SearchableDropdown';

/**
 * The "Employee *" picker that the master forms (Reimbursement, LeavesTaken, ManualLog, ...) use.
 * Wraps `SearchableDropdown` with the conventional single-select setup plus a remount-safe key, so
 * each caller doesn't repeat the same six props. Set `disabledOnEdit` to lock the picker once a
 * record exists, which is the standard behavior in edit mode.
 */
const EmployeePickerField = ({
  employees,
  value,
  onChange,
  initialId,
  label = 'Employee',
  placeholder = 'Select employee',
  disabledOnEdit = false,
  disabled = false,
  required = true,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && '*'}
    </label>
    <SearchableDropdown
      key={`employee-${initialId || 'new'}-${value}`}
      selectedValues={value ? [value] : []}
      onChange={onChange}
      options={employees}
      placeholder={placeholder}
      multiple={false}
      disabled={disabled || (disabledOnEdit && Boolean(initialId))}
    />
  </div>
);

EmployeePickerField.propTypes = {
  employees: PropTypes.array.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  initialId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.string,
  placeholder: PropTypes.string,
  disabledOnEdit: PropTypes.bool,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
};

export { EmployeePickerField };
