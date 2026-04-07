import { useState, useEffect, useMemo } from 'react';
import { MasterHeader } from '@base_components/master/master_header/MasterHeader';
import { MasterSearch } from '@startup/base_components/master/MasterSearch';
import { MasterTable } from '@base_components/master/master_table/MasterTable';
import { MasterModal } from '@base_components/master/master_modal/MasterModal';
import { ActivityForm } from './ActivityForm';
import { activityService } from '@/services/startup/activityService';
import { useDataContext, hasPermission } from '@/context/startup/useDataContext';
import { MasterModalActions } from '@base_components/master/MasterModalActions';
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
        <MasterSearch
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
          actions={<MasterModalActions onCancel={handleClose} onConfirm={handleSave} confirmLabel="Create" />}
        >
          <ActivityForm formData={formData} onChange={handleFormChange} />
        </MasterModal>
      )}
    </div>
  );
};

export { ActivityMaster };
