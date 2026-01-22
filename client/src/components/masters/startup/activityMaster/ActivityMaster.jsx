import { useState, useEffect, useMemo } from 'react';
import { MasterHeader } from '@startup/BaseMasterComponents/MasterHeader/MasterHeader';
import { MasterSearchInput } from '@startup/BaseMasterComponents/MasterSearchInput';
import { MasterTable } from '@startup/BaseMasterComponents/MasterTable/MasterTable';
import { MasterModal } from '@startup/BaseMasterComponents/MasterModal/MasterModal';
import { ActivityForm } from './ActivityForm';
import { activityService } from '@/services/startup/activityService';
import { useDataContext, hasPermission } from '@/context/startup/useDataContext';
import { X, Plus } from 'lucide-react';
import { toast } from 'react-toastify';


const ActivityMaster = () => {
  const [columns, setColumns] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    head: '',
    log: '',
    timestamp: Date.now(),
    objectName: '',
    objectId: ''
  });
  const dataContext = useDataContext();

  // Fetch activities from server
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await activityService.getAllActivities(200);
      
      // Server returns { columns, data } format
      if (response.columns && response.data) {
        setColumns(response.columns);
        setActivities(response.data);
      } else {
        // Fallback for old format
        setActivities(response.data || response || []);
      }
    } catch (error) {
      toast.error(error?.error || 'Failed to fetch activity logs');
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  //  Handle form field changes
  const handleFormChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  //Reset form and open modal
  const handleAdd = () => {
    setFormData({
      head: '',
      log: '',
      timestamp: Date.now(),
      objectName: '',
      objectId: ''
    });
    setIsModalOpen(true);
  };

  // Save activity
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
      setIsModalOpen(false);
      fetchActivities();
    } catch (error) {
      toast.error(error?.error || 'Failed to create activity log');
      console.error('Error creating activity:', error);
    }
  };

  //  Close modal
  const handleClose = () => {
    setIsModalOpen(false);
  };

  const canCreate = hasPermission('create_activity', dataContext);
  const canRead = hasPermission('read_activity', dataContext);

  //Filter activities based on search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) {
      return activities;
    }

    const query = searchQuery.toLowerCase();
    return activities.filter(activity => {
      return (
        (activity.head && activity.head.toLowerCase().includes(query)) ||
        (activity.log && activity.log.toLowerCase().includes(query)) ||
        (activity.objectName && activity.objectName.toLowerCase().includes(query)) ||
        (activity.objectId && activity.objectId.toLowerCase().includes(query)) ||
        (activity.createdByName && activity.createdByName.toLowerCase().includes(query)) ||
        (activity.id && String(activity.id).includes(query))
      );
    });
  }, [activities, searchQuery]);

  // Permission check
  if (!canRead) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">You don&apos;t have permission to view activity logs</div>
      </div>
    );
  }

  // Convert server columns to MasterTable format if needed
  const tableColumns = columns.length > 0 
    ? columns.map(col => ({
        key: col.key,
        label: col.display_name || col.label || col.key,
        type: col.type || 'string'
      }))
    : [];


  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-8xl mx-auto">
      <MasterHeader
        title="Activity Logs"
        description="Track and review all user actions and CRUD operations across every system module and model."
        onAdd={canCreate ? handleAdd : null}
        onRefresh={fetchActivities}
        userData={dataContext.userData}
        permissionKey="create_activity"
        addButtonText="Add Activity"
        showBack={true}
        backUrl="/admin/master"
      />

      {/* Search Input */}
      <div className="mb-4 justify-center flex">
        <MasterSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search activities by head, log, object name, object ID, or created by..."
        />
      </div>

      <MasterTable
        columns={tableColumns}
        data={filteredActivities}
        loading={loading}
        actions={[]}
        emptyMessage="No activity logs found"
        loadingMessage="Loading activity logs..."
      />

      {canCreate && (
        <MasterModal
          isOpen={isModalOpen}
          onClose={handleClose}
          title="Add Activity Log"
          maxWidth="md"
          actions={
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4 inline mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create
              </button>
            </>
          }
        >
          <ActivityForm formData={formData} onChange={handleFormChange} />
        </MasterModal>
      )}
    </div>
  );
};

export { ActivityMaster };
