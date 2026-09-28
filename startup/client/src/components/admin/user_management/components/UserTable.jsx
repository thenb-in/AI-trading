import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { parseDateValue } from '@utils/dateTimeUtils';
import { UserTableRow } from './UserTableRow';

const UserTable = ({
  users,
  emptyMessage,
  statusColor,
  bulkDeleteMode,
  selectedUsers,
  toggleUserSelection,
  showConfirmation,
  selectAllUsersFromTable,
  deselectAllUsersFromTable,
  handleRoleChange,
  // deviceAccessOptions,
  handleDeviceOptionUpdate,
  handleSignOutDevice,
  updateUser,
  walletUserManagementUrl,
  sessions = {},
  extraColumns = []
}) => {
  const allUsersInTableSelected = users.length > 0 && users.every(user => selectedUsers.includes(user.id));

  const formatLastActive = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const date = parseDateValue(dateString);
    const options = {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    return date.toLocaleDateString('en-GB', options).replace(',', '');
  }, []);

  const handleSelectAllClick = () => {
    if (allUsersInTableSelected) {
      deselectAllUsersFromTable(users);
    } else {
      selectAllUsersFromTable(users);
    }
  };
  


  return (
    <div className={`mb-4 rounded-lg overflow-hidden shadow-md border ${statusColor || 'bg-gray-100'}`}>
      <div className="overflow-x-auto">
        {users.length === 0 ? (
          <p className="p-4 text-center text-gray-500">{emptyMessage}</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                   {bulkDeleteMode && users.length > 0 && (
                    <button
                      onClick={handleSelectAllClick}
                      className="px-3 py-1 mt-2 ml-2 text-xs font-semibold rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                    >
                      {allUsersInTableSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                {extraColumns.map((col) => (
                  <th key={col.key || col.header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col.header}</th>
                ))}
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Access</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  selectedUsers={selectedUsers}
                  bulkDeleteMode={bulkDeleteMode}
                  toggleUserSelection={toggleUserSelection}
                  showConfirmation={showConfirmation}
                  formatLastActive={formatLastActive}
                  handleRoleChange={handleRoleChange}
                  // deviceAccessOptions={deviceAccessOptions}
                  handleDeviceOptionUpdate={handleDeviceOptionUpdate}
                  handleSignOutDevice={handleSignOutDevice}
                  updateUser={updateUser}
                  walletUserManagementUrl={walletUserManagementUrl}
                  session={sessions[user.id]}
                  extraColumns={extraColumns}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

UserTable.propTypes = {
  users: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    firstname: PropTypes.string,
    lastname: PropTypes.string,
    name: PropTypes.string,
    phone: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string
    }),
    is_approved: PropTypes.bool,
    last_active: PropTypes.string,
  })).isRequired,
  emptyMessage: PropTypes.string.isRequired,
  statusColor: PropTypes.string,
  bulkDeleteMode: PropTypes.bool.isRequired,
  selectedUsers: PropTypes.arrayOf(PropTypes.string).isRequired,
  toggleUserSelection: PropTypes.func.isRequired,
  showConfirmation: PropTypes.func.isRequired,
  selectAllUsersFromTable: PropTypes.func.isRequired,
  deselectAllUsersFromTable: PropTypes.func.isRequired,
  handleRoleChange: PropTypes.func.isRequired,
  // deviceAccessOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  handleDeviceOptionUpdate: PropTypes.func.isRequired,
  handleSignOutDevice: PropTypes.func,
  updateUser: PropTypes.func.isRequired,
  walletUserManagementUrl: PropTypes.string,
  /** { [userId]: { online, signedIn, devices } } — who is connected right now. */
  sessions: PropTypes.object,
  extraColumns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    header: PropTypes.string.isRequired,
    render: PropTypes.func.isRequired
  }))
};

export { UserTable };
