import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { List, Network } from 'lucide-react';
import { toast } from 'react-toastify';

import { BaseMaster, FormModal, MasterHeader } from '@startup/components/base_components/master';
import { MASTERS } from '@startup/constants/masters';
import { useDataContext } from '@context/useDataContext';
import { hasPermission } from '@startup/hooks/hasPermission';
import { geographyService } from '@services/geographyService';
import { GeographyMasterForm } from './GeographyMasterForm';
import { GeographyTree } from './GeographyTree';

const PERMISSION_KEYS = {
  read: 'read_geography',
  create: 'create_geography',
  update: 'update_geography',
  delete: 'delete_geography'
};

const DESCRIPTION = 'Country, state, city, site — one tree the whole app reads its places from.';

const deletePlace = (id) => geographyService.remove(id);

const ViewToggle = ({ view, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(view === 'tree' ? 'list' : 'tree')}
    className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    title={view === 'tree' ? 'Show every place as a list' : 'Show the places as a tree'}
  >
    {view === 'tree' ? <List className="h-4 w-4" /> : <Network className="h-4 w-4" />}
    {view === 'tree' ? 'List' : 'Tree'}
  </button>
);

ViewToggle.propTypes = {
  view: PropTypes.oneOf(['tree', 'list']).isRequired,
  onChange: PropTypes.func.isRequired
};

const GeographyMaster = () => {
  // The tree is what this master is for, so it opens on it; the list is there
  // for the searching, sorting and exporting a grid does better.
  const [view, setView] = useState('tree');
  const [rows, setRows] = useState([]);
  // The place open in the form, or the parent a new one starts under.
  const [editing, setEditing] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { userData } = useDataContext();

  const canCreate = hasPermission(PERMISSION_KEYS.create, userData);
  const canUpdate = hasPermission(PERMISSION_KEYS.update, userData);
  const canDelete = hasPermission(PERMISSION_KEYS.delete, userData);

  // Both views read the same list, and the form needs it whole to offer parents,
  // so the page keeps what was last loaded whichever view asked for it.
  const loadRows = useCallback(async () => {
    const response = await geographyService.list();
    setRows(response.data?.data?.places ?? []);
    return response;
  }, []);

  useEffect(() => {
    loadRows().catch((error) => toast.error(`Failed to load places: ${error.message}`));
  }, [loadRows]);

  const openForm = (record, startFrom) => {
    setEditing(record);
    setDefaults(startFrom);
    setIsFormOpen(true);
  };

  const handleAdd = useCallback((parent) => {
    openForm(null, parent ? { parent_id: parent.id, level: parent.level } : null);
  }, []);

  const handleEdit = useCallback((record) => openForm(record, null), []);

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setDefaults(null);
  };

  const handleSaved = () => loadRows();

  // Offered on the tree only for a place holding nothing; the server refuses one
  // that does and says what is under it, which is the toast below.
  const handleDelete = useCallback(async (record) => {
    if (!window.confirm(`Delete ${record.path}?`)) {
      return;
    }
    try {
      await deletePlace(record.id);
      toast.success(`${record.name} deleted`);
      await loadRows();
    } catch (error) {
      toast.error(error?.response?.data?.message || `Could not delete ${record.name}: ${error.message}`);
    }
  }, [loadRows]);

  const formProps = useCallback(() => ({ rows }), [rows]);

  if (view === 'list') {
    return (
      <BaseMaster
        masterName={MASTERS.GEOGRAPHY}
        title="Geography"
        description={DESCRIPTION}
        addButtonText="Add Place"
        searchPlaceholder="Search by place, code or where it sits..."
        searchKeys={['path']}
        auditHead="Geography"
        permissionKeys={PERMISSION_KEYS}
        rowsKey="places"
        loadRows={loadRows}
        deleteRow={deletePlace}
        deleteConfirmText="Delete this place? A place with anything under it cannot be deleted."
        unauthorizedToast="You are not authorized to view geography"
        unauthorizedDeleteToast="You are not authorized to delete a place"
        fetchFailureToast="Failed to load places"
        FormComponent={GeographyMasterForm}
        formProps={formProps}
        formSuccessProp="onSaved"
        createLabel="Create Place"
        updateLabel="Update Place"
        extraHeaderActions={<ViewToggle view={view} onChange={setView} />}
        exportReport={{ title: 'Geography', slug: 'geography' }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <MasterHeader
          title="Geography"
          description={DESCRIPTION}
          onAdd={canCreate ? () => handleAdd(null) : undefined}
          userData={userData}
          permissionKey={PERMISSION_KEYS.create}
          addButtonText="Add Place"
          onRefresh={loadRows}
          extraHeaderActions={<ViewToggle view={view} onChange={setView} />}
        />
        <GeographyTree
          rows={rows}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <FormModal
          isOpen={isFormOpen}
          onClose={closeForm}
          masterName={MASTERS.GEOGRAPHY}
          permissions={PERMISSION_KEYS}
          record={editing}
          createLabel="Create Place"
          updateLabel="Update Place"
          maxWidth="md"
        >
          <GeographyMasterForm
            key={editing?.id ?? `new-${defaults?.parent_id ?? 'root'}`}
            isOpen
            onClose={closeForm}
            initialData={editing}
            defaults={defaults}
            rows={rows}
            onSaved={handleSaved}
          />
        </FormModal>
      </div>
    </div>
  );
};

export { GeographyMaster };
