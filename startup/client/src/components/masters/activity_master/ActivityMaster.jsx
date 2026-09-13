import { useState, useEffect, useMemo, useCallback } from 'react';
import { MasterHeader } from '@startup/components/base_components/master/master_header/MasterHeader';
import { MasterSearch } from '@startup/components/base_components/master/MasterSearch';
import { MasterTable } from '@startup/components/base_components/master/master_table/MasterTable';
import { getGroupTint } from '@startup/components/nbnext_data_grid/utils/styles';
import { MasterModal } from '@startup/components/base_components/master/master_modal/MasterModal';
import { MasterModalActions } from '@startup/components/base_components/master/MasterModalActions';
import { ActivityForm } from './ActivityForm';
import { ActivityLogDetails } from './ActivityLogDetails';
import { activityService } from '@services/activityService';
import { useDataContext, hasPermission } from '@context/useDataContext';
import { Eye } from 'lucide-react';
import { toast } from 'react-toastify';


const ActivityMaster = () => {
  const [columns, setColumns] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [formData, setFormData] = useState({
    head: '',
    log: '',
    timestamp: Date.now(),
    objectName: '',
    objectId: ''
  });
  const dataContext = useDataContext();
  const pageSize = 100;

  // Fetch activities from server
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setHasMore(true);
      const response = await activityService.getAllActivities(pageSize, 0);
      
      // Server returns { columns, data } format
      if (response.columns && response.data) {
        setColumns(response.columns);
        setActivities(response.data);
        setHasMore(response.data.length === pageSize);
      } else {
        // Fallback for old format
        const rows = response.data || response || [];
        setActivities(rows);
        setHasMore(Array.isArray(rows) ? rows.length === pageSize : false);
      }
    } catch (error) {
      toast.error(error?.error || 'Failed to fetch activity logs');
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleLoadMore = useCallback(async () => {
    if (loading || isLoadingMore) return;
    if (!hasMore) return;
    // Keep ActivityMaster infinite scroll simple: disable while filtering locally
    if (searchQuery.trim()) return;

    try {
      setIsLoadingMore(true);
      const offset = activities.length;
      const response = await activityService.getAllActivities(pageSize, offset);
      const nextRows = Array.isArray(response?.data) ? response.data : [];

      setActivities((prev) => [...prev, ...nextRows]);
      setHasMore(nextRows.length === pageSize);
    } catch (error) {
      toast.error(error?.error || 'Failed to load more activity logs');
    } finally {
      setIsLoadingMore(false);
    }
  }, [activities.length, hasMore, isLoadingMore, loading, searchQuery, pageSize]);

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

  const handleViewClose = () => {
    setIsViewModalOpen(false);
    setSelectedActivity(null);
  };

  const handleViewLogs = useCallback((row) => {
    setSelectedActivity(row);
    setIsViewModalOpen(true);
  }, []);

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

  // Tint every entry that touches the same record, so a page of logs reads as
  // "these five lines are all about supplier 42" instead of a flat list. Only
  // records that appear more than once are tinted — colouring a one-off entry
  // says nothing and makes the page noisy.
  const highlightedActivities = useMemo(() => {
    const keyOf = (activity) =>
      activity.objectName && activity.objectId
        ? `${activity.objectName}:${activity.objectId}`
        : null;

    const counts = new Map();
    filteredActivities.forEach((activity) => {
      const key = keyOf(activity);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });

    return filteredActivities.map((activity) => {
      const key = keyOf(activity);
      return counts.get(key) > 1
        ? { ...activity, _highlightColor: getGroupTint(key) }
        : activity;
    });
  }, [filteredActivities]);

  const viewActions = useMemo(
    () => [
      {
        label: 'View',
        icon: <Eye className="w-3 h-3" />,
        type: 'primary',
        onClick: (_id, row) => handleViewLogs(row)
      }
    ],
    [handleViewLogs]
  );

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

      {canRead ? (
        <MasterTable
          columns={tableColumns}
          data={highlightedActivities}
          loading={loading}
          actions={viewActions}
          emptyMessage="No activity logs found"
          loadingMessage="Loading activity logs..."
          infiniteScroll={!searchQuery.trim()}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
        />
      ) : (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">You don&apos;t have permission to view activity logs</div>
        </div>
      )}

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

      {selectedActivity && (
        <MasterModal
          isOpen={isViewModalOpen}
          onClose={handleViewClose}
          title="Activity Details"
          maxWidth="lg"
          actions={
            <button
              onClick={handleViewClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          }
        >
          <ActivityLogDetails activity={selectedActivity} />
        </MasterModal>
      )}
    </div>
  );
};

export { ActivityMaster };
