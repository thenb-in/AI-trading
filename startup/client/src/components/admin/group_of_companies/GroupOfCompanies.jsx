import { useState, useCallback } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { BaseModal, ConfirmModal } from '@startup/components/base_components/master';
import { useGroupOfCompanies } from './useGroupOfCompanies';
import { GroupOfCompaniesList } from './GroupOfCompaniesList';
import { GroupOfCompaniesForm } from './GroupOfCompaniesForm';

const GroupOfCompanies = () => {
  const { groups, companies, loading, saving, saveGroup, removeGroup } = useGroupOfCompanies();
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [pendingDelete, setPendingDelete] = useState(null);

  const openCreate = useCallback(() => setEditing(null), []);
  const openEdit = useCallback((group) => setEditing(group), []);
  const closeForm = useCallback(() => setEditing(undefined), []);

  const handleSubmit = useCallback(async (payload) => {
    const ok = await saveGroup(editing?.id, payload);
    if (ok) closeForm();
  }, [editing, saveGroup, closeForm]);

  const confirmDelete = useCallback(async () => {
    const group = pendingDelete;
    setPendingDelete(null);
    if (group) await removeGroup(group);
  }, [pendingDelete, removeGroup]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Group of Companies</h1>
          <p className="text-sm text-gray-600 mt-1">
            Group companies together and name the business users who work across them. Group users
            show up for assignment on the group&apos;s companies, alongside support users.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" /> New Group
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <GroupOfCompaniesList groups={groups} onEdit={openEdit} onDelete={setPendingDelete} />
      )}

      <BaseModal
        isOpen={editing !== undefined}
        onClose={closeForm}
        title={editing ? `Edit ${editing.name}` : 'New Group of Companies'}
        maxWidth="md"
        showAudit={false}
      >
        {editing !== undefined && (
          <GroupOfCompaniesForm
            initialData={editing}
            companies={companies}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            submitting={saving}
          />
        )}
      </BaseModal>

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete group of companies"
        message={pendingDelete ? `Delete "${pendingDelete.name}"? This removes the grouping only — the companies and users are untouched.` : ''}
        confirmText="Delete"
      />
    </div>
  );
};

export { GroupOfCompanies };
