import PropTypes from 'prop-types';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';

function RoleSelector({ roles, selectedRoleId, onSelect, loading }) {
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
};

export { RoleSelector };
