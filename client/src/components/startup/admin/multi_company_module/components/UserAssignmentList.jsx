import PropTypes from 'prop-types';
import { Loader2, UserMinus, Users } from 'lucide-react';

const UserAssignmentList = ({ companyName, companyUsers, removing, onRemove }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
      <Users className="w-5 h-5 mr-2" />
      Current Assignments for {companyName || 'N/A'}
    </h3>

    {(!Array.isArray(companyUsers) || companyUsers.length === 0) ? (
      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
        No users assigned to this company yet.
      </div>
    ) : (
      <div className="space-y-3">
        {companyUsers.map((user) => (
          <div
            key={user.id || user.username}
            className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                {user.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-500">{user.username}</div>
              </div>
            </div>
            <button
              onClick={() => onRemove(user.id)}
              disabled={removing === user.id}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {removing === user.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserMinus className="w-4 h-4 mr-1" />
                  Remove
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

UserAssignmentList.propTypes = {
  companyName: PropTypes.string,
  companyUsers: PropTypes.array.isRequired,
  removing: PropTypes.oneOfType([PropTypes.bool, PropTypes.string, PropTypes.number]).isRequired,
  onRemove: PropTypes.func.isRequired
};

export { UserAssignmentList };


