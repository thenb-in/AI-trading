import PropTypes from 'prop-types';
import { Building2, Users, Pencil, Trash2 } from 'lucide-react';

const Chips = ({ items, empty }) => (
  items.length === 0
    ? <span className="text-xs text-gray-400">{empty}</span>
    : (
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span key={item.key} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
            {item.label}
          </span>
        ))}
      </div>
    )
);

Chips.propTypes = { items: PropTypes.array.isRequired, empty: PropTypes.string.isRequired };

const toCompanyChips = (companies) => companies.map((company) => ({ key: company.id, label: company.name }));
const toUserChips = (users) => users.map((user) => ({
  key: user.id,
  label: `${user.name || user.username}${user.is_support_user ? ' (Support)' : ''}`
}));

const GroupOfCompaniesList = ({ groups, onEdit, onDelete }) => {
  if (groups.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border">
        No groups of companies yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <div key={group.id} className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onEdit(group)}
                className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 flex items-center gap-1"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => onDelete(group)}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Building2 className="w-4 h-4" /> Companies ({group.companies.length})
              </div>
              <Chips
                items={toCompanyChips(group.companies)}
                empty="No companies in this group."
              />
            </div>
            <div>
              <div className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Users className="w-4 h-4" /> Users ({group.users.length})
              </div>
              <Chips
                items={toUserChips(group.users)}
                empty="No users in this group."
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

GroupOfCompaniesList.propTypes = {
  groups: PropTypes.array.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export { GroupOfCompaniesList };
