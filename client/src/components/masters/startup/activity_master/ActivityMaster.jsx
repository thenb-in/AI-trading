import { MasterHeader } from '@base_components/master/master_header/MasterHeader';
import { MasterSearch } from '@startup/base_components/master/MasterSearch';
import { MasterTable } from '@base_components/master/master_table/MasterTable';
import { MasterModal } from '@base_components/master/master_modal/MasterModal';
import { ActivityForm } from './ActivityForm';
import { activityService } from '@/services/startup/activityService';
import { useDataContext, hasPermission } from '@/context/startup/useDataContext';
import { MasterModalActions } from '@base_components/master/MasterModalActions';
import { useMasterData } from '@/hooks/useMasterData';
import { toast } from 'react-toastify';

const INITIAL_FORM = {
  head: '',
  log: '',
  timestamp: Date.now(),
  objectName: '',
  objectId: ''
};

const SEARCH_KEYS = ['head', 'log', 'objectName', 'objectId', 'createdByName', 'id'];

const fetchActivities = () => activityService.getAllActivities(200);

const ActivityMaster = () => {
  const dataContext = useDataContext();
  const canCreate = hasPermission('create_activity', dataContext);
  const canRead = hasPermission('read_activity', dataContext);

  const {
    tableColumns,
    filteredData,
    loading,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    formData,
    handleFormChange,
    openModal,
    closeModal,
    fetchData,
  } = useMasterData({
    fetchService: fetchActivities,
    initialFormData: INITIAL_FORM,
    searchKeys: SEARCH_KEYS,
    errorMessage: 'Failed to fetch activity logs',
  });

  const handleSave = async () => {
    try {
      const timestamp = formData.timestamp || Date.now();
      await activityService.createActivity(
        formData.head,
        formData.log,
        timestamp,
        formData.objectName || null,
        formData.objectId || null
      );
      toast.success('Activity log created successfully');
      closeModal();
      fetchData();
    } catch (error) {
      toast.error(error?.error || 'Failed to create activity log');
      console.error('Error creating activity:', error);
    }
  };

  if (!canRead) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">You don&apos;t have permission to view activity logs</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-8xl mx-auto">
      <MasterHeader
        title="Activity Logs"
        description="Track and review all user actions and CRUD operations across every system module and model."
        onAdd={canCreate ? openModal : null}
        onRefresh={fetchData}
        userData={dataContext.userData}
        permissionKey="create_activity"
        addButtonText="Add Activity"
        showBack={true}
        backUrl="/admin/master"
      />

      <div className="mb-4 justify-center flex">
        <MasterSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search activities by head, log, object name, object ID, or created by..."
        />
      </div>

      <MasterTable
        columns={tableColumns}
        data={filteredData}
        loading={loading}
        actions={[]}
        emptyMessage="No activity logs found"
        loadingMessage="Loading activity logs..."
      />

      {canCreate && (
        <MasterModal
          isOpen={isModalOpen}
          onClose={closeModal}
          title="Add Activity Log"
          maxWidth="md"
          actions={<MasterModalActions onCancel={closeModal} onConfirm={handleSave} confirmLabel="Create" />}
        >
          <ActivityForm formData={formData} onChange={handleFormChange} />
        </MasterModal>
      )}
    </div>
  );
};

export { ActivityMaster };
