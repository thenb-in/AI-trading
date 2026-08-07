import PropTypes from 'prop-types';
import { Loader2, UserPlus } from 'lucide-react';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';

const UserAssignmentForm = ({
  selectedUser,
  assigning,
  loading,
  onSelectUser,
  onAssign,
  availableUsers
}) => {
  const userOptions = availableUsers.map((user) => ({
    value: String(user.id || user.username),
    label: `${user.name || user.username} (${user.username || user.email || 'No username'})`
  }));

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <UserPlus className="w-5 h-5 mr-2" />
        Assign New User
      </h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Super Admin User
        </label>
        <SearchableDropdown
          options={userOptions}
          selectedValues={String(selectedUser ?? '')}
          onChange={onSelectUser}
          placeholder="Choose a user..."
          multiple={false}
          disabled={assigning || loading}
          loading={loading}
        />
      </div>

      <button
        onClick={onAssign}
        disabled={assigning || !selectedUser}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {assigning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Assigning...
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-2" />
            Assign User
          </>
        )}
      </button>
    </div>
  );
};

UserAssignmentForm.propTypes = {
  selectedUser: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  assigning: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  onSelectUser: PropTypes.func.isRequired,
  onAssign: PropTypes.func.isRequired,
  availableUsers: PropTypes.array.isRequired
};

export { UserAssignmentForm };


