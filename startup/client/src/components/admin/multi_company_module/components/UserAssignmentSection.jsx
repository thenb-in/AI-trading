import { useState } from 'react';
import PropTypes from 'prop-types';
import { Loader2, UserMinus, UserPlus, Lock } from 'lucide-react';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';

const userOption = (user) => ({
  value: String(user.id),
  label: `${user.name || user.username} (${user.username || user.email || 'no username'})`
});

// One kind of user (support or business) in the assignment modal: its own
// picker to add a user of that kind, and the list of that kind already assigned,
// where a locked row (e.g. a direct user) shows why it cannot be removed.
const UserAssignmentSection = ({
  title,
  note,
  assignableUsers,
  assignedUsers,
  onAssign,
  onRemove,
  assigningId,
  removingId,
  loading,
  lockedReason
}) => {
  const [selectedUser, setSelectedUser] = useState('');

  const assignedKeys = new Set(assignedUsers.map((user) => String(user.id)));
  const options = assignableUsers
    .filter((user) => !assignedKeys.has(String(user.id)))
    .map(userOption);

  const handleAssign = async () => {
    if (!selectedUser) return;
    const ok = await onAssign(selectedUser);
    if (ok) setSelectedUser('');
  };

  return (
    <section className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
        <UserPlus className="w-5 h-5 mr-2" />
        {title}
      </h3>
      {note && <p className="text-xs text-gray-500 mb-3">{note}</p>}

      <div className="flex items-end gap-2 mb-4">
        <div className="flex-1">
          <SearchableDropdown
            options={options}
            value={selectedUser}
            onChange={(value) => setSelectedUser(value ?? '')}
            placeholder={options.length ? `Choose a ${title.toLowerCase().replace(/s$/, '')}...` : 'No users available to assign'}
            disabled={Boolean(assigningId) || loading || options.length === 0}
          />
        </div>
        <button
          onClick={handleAssign}
          disabled={Boolean(assigningId) || !selectedUser}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shrink-0"
        >
          {assigningId === selectedUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          <span className="ml-1">Assign</span>
        </button>
      </div>

      {assignedUsers.length === 0 ? (
        <div className="text-sm text-gray-400">None assigned yet.</div>
      ) : (
        <div className="space-y-2">
          {assignedUsers.map((user) => {
            const reason = lockedReason ? lockedReason(user) : null;
            return (
              <div key={user.id || user.username} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                    {user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.username}</div>
                  </div>
                </div>
                {reason ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md" title={reason}>
                    <Lock className="w-4 h-4" /> {reason}
                  </span>
                ) : (
                  <button
                    onClick={() => onRemove(user.id)}
                    disabled={removingId === user.id}
                    className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {removingId === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4 mr-1" /> Remove
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

UserAssignmentSection.propTypes = {
  title: PropTypes.string.isRequired,
  note: PropTypes.string,
  assignableUsers: PropTypes.array.isRequired,
  assignedUsers: PropTypes.array.isRequired,
  onAssign: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  assigningId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  removingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  loading: PropTypes.bool,
  /** (user) => string|null — a reason locks the row's Remove (e.g. direct user). */
  lockedReason: PropTypes.func
};

export { UserAssignmentSection };
