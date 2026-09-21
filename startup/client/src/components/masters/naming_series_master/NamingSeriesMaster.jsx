import { BaseMaster } from '@startup/components/base_components/master';
import { namingSeriesService } from '@services/namingSeriesService';
import { NamingSeriesMasterForm } from './NamingSeriesMasterForm';

const PERMISSION_KEYS = {
  read: 'read_naming_series',
  create: 'create_naming_series',
  update: 'update_naming_series',
  delete: 'delete_naming_series'
};

const loadSeries = () => namingSeriesService.list();
const deleteSeries = (id) => namingSeriesService.remove(id);

const NamingSeriesMaster = () => (
  <BaseMaster
    title="Naming Series"
    description="Decide how new records are coded when nobody types a code — e.g. EMP-0001, EMP-0002."
    addButtonText="Add Series"
    searchPlaceholder="Search by master or template..."
    modalAddTitle="New Naming Series"
    modalEditTitle="Edit Naming Series"
    modalMaxWidth="sm"
    auditHead="NamingSeries"
    permissionKeys={PERMISSION_KEYS}
    rowsKey="namingSeries"
    loadRows={loadSeries}
    deleteRow={deleteSeries}
    deleteConfirmText="Delete this series? If it is the default, new records of its master go back to needing a typed code."
    unauthorizedToast="You are not authorized to view naming series"
    unauthorizedDeleteToast="You are not authorized to delete a naming series"
    fetchFailureToast="Failed to load naming series"
    FormComponent={NamingSeriesMasterForm}
    formSuccessProp="onSaved"
    exportReport={{ title: 'Naming Series', slug: 'naming-series' }}
  />
);

export { NamingSeriesMaster };
