import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';
import { groupOfCompaniesService } from '@services/groupOfCompaniesService';
import { getApiErrorMessage } from '@utils/apiErrorMessage';

const companyOption = (company) => ({ value: company.id, label: company.name });
const userOption = (user) => ({
  value: user.id,
  label: `${user.name || user.username} (${user.username})${user.is_support_user ? ' — Support' : ''}`
});

const GroupOfCompaniesForm = ({ initialData, companies, onSubmit, onCancel, submitting }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [companyIds, setCompanyIds] = useState((initialData?.companies || []).map((c) => c.id));
  const [userIds, setUserIds] = useState((initialData?.users || []).map((u) => u.id));
  // The users offered are the users of the picked companies, fetched as the
  // company selection changes.
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const companyIdsKey = companyIds.join(',');

  useEffect(() => {
    if (companyIds.length === 0) {
      setUsers([]);
      setUserIds([]);
      return undefined;
    }
    let cancelled = false;
    setUsersLoading(true);
    groupOfCompaniesService.usersForCompanies(companyIds)
      .then((res) => {
        if (cancelled) return;
        const loaded = res?.data?.data?.users || [];
        setUsers(loaded);
        // Drop any picked user who is no longer a user of a picked company.
        const allowed = new Set(loaded.map((u) => u.id));
        setUserIds((prev) => prev.filter((id) => allowed.has(id)));
      })
      .catch((e) => {
        if (!cancelled) toast.error(getApiErrorMessage(e, 'Failed to load users for the selected companies'));
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => { cancelled = true; };
    // companyIdsKey is the string form of companyIds, so it is the real dependency.
  }, [companyIdsKey]);

  const canSubmit = name.trim().length >= 2 && !submitting;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), companyIds, userIds });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextTypeField
        label="Group Name"
        placeholder="Name of the group of companies"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        error={name.length > 0 && name.trim().length < 2 ? 'Group name must be at least 2 characters.' : ''}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Companies</label>
        <SearchableDropdown
          multiple
          options={companies.map(companyOption)}
          value={companyIds}
          onChange={setCompanyIds}
          placeholder="Add companies to this group..."
          optionName="Company"
        />
        <p className="text-xs text-gray-500 mt-1">The member companies of this group.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
          Users
          {usersLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        </label>
        <SearchableDropdown
          multiple
          options={users.map(userOption)}
          value={userIds}
          onChange={setUserIds}
          placeholder={companyIds.length === 0 ? 'Pick companies first...' : 'Add users from the selected companies...'}
          disabled={companyIds.length === 0}
          optionName="User"
        />
        <p className="text-xs text-gray-500 mt-1">
          Only users of the selected companies can be added. They show up for assignment on the
          group&apos;s companies, alongside support users.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {initialData ? 'Save Group' : 'Create Group'}
        </button>
      </div>
    </form>
  );
};

GroupOfCompaniesForm.propTypes = {
  initialData: PropTypes.object,
  companies: PropTypes.array.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  submitting: PropTypes.bool
};

export { GroupOfCompaniesForm };
