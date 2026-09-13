import PropTypes from 'prop-types';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';

function RoleSelector({ roles, selectedRoleId, onSelect, loading, onCreateRole }) {
  const roleOptions = roles.map((role) => {
    const roleLabel = role.description
      ? `${role.name} - ${role.description}`
      : role.name;
    const typeLabel = role.isGlobal
      ? ' (Global)'
      : ' (Company)';
    return { value: String(role.id), label: roleLabel + typeLabel };
  });

  const handleChange = (value) => {
    onSelect(value === '' ? null : Number(value));
  };

  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Select Role
      </label>
      <SearchableDropdown
        options={roleOptions}
        selectedValues={selectedRoleId ? String(selectedRoleId) : ''}
        onChange={handleChange}
        placeholder="-- Select a role --"
        multiple={false}
        disabled={loading}
        loading={loading}
        optionName="Role"
        onCreateOption={onCreateRole}
      />
    </div>
  );
}

RoleSelector.propTypes = {
  roles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ).isRequired,
  selectedRoleId: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  /** Called with the typed term to open the create-role modal. Omitted, the
   *  menu offers no create row. */
  onCreateRole: PropTypes.func,
};

export { RoleSelector };
