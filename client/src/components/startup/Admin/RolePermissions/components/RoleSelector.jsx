import { Shield } from 'lucide-react';
import PropTypes from 'prop-types';

function RoleSelector({ roles, selectedRoleId, onSelect, loading }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Select Role
      </label>
      <div className="relative">
        <select
          value={selectedRoleId || ''}
          onChange={(e) => onSelect(Number(e.target.value))}
          disabled={loading}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none pr-8"
        >
          <option value="">-- Select a role --</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name} {role.description ? `- ${role.description}` : ''}
            </option>
          ))}
        </select>
        <Shield className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
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
