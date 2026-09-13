import { BaseMaster } from '@startup/components/base_components/master';
import { getGroupTint } from '@startup/components/nbnext_data_grid/utils/styles';
import { activityService } from '@services/activityService';
import { ActivityForm } from './ActivityForm';
import { ActivityLogDetails } from './ActivityLogDetails';

const PERMISSION_KEYS = {
  read: 'read_activity',
  create: 'create_activity',
};

const loadActivities = ({ page, pageSize }) => activityService.getAllActivities(pageSize, (page - 1) * pageSize);

// activityService already unwraps the HTTP response to { columns, data }.
const extractResponse = (response) => ({
  rows: response.data,
  columns: response.columns,
});

const recordKeyOf = (activity) => (
  activity.objectName && activity.objectId ? `${activity.objectName}:${activity.objectId}` : null
);

// Tint every entry that touches the same record, so a page of logs reads as
// "these five lines are all about supplier 42" instead of a flat list. Only
// records that appear more than once are tinted — colouring a one-off entry
// says nothing and makes the page noisy.
const tintSharedRecords = (activities) => {
  const counts = new Map();
  activities.forEach((activity) => {
    const key = recordKeyOf(activity);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return activities.map((activity) => {
    const key = recordKeyOf(activity);
    return counts.get(key) > 1 ? { ...activity, _highlightColor: getGroupTint(key) } : activity;
  });
};

const ActivityMaster = () => (
  <BaseMaster
    title="Activity Logs"
    description="Track and review all user actions and CRUD operations across every system module and model."
    addButtonText="Add Activity"
    searchPlaceholder="Search activities by head, message, record ID, or audit by..."
    modalAddTitle="Add Activity Log"
    modalEditTitle="Activity Details"
    modalMaxWidth="lg"
    baseMasterContainerWidth="max-w-8xl"
    permissionKeys={PERMISSION_KEYS}
    loadRows={loadActivities}
    extractResponse={extractResponse}
    infiniteScroll
    pageSize={100}
    mapRows={tintSharedRecords}
    FormComponent={ActivityForm}
    DetailComponent={ActivityLogDetails}
    unauthorizedToast="You are not authorized to view activity logs"
    fetchFailureToast="Failed to fetch activity logs"
    exportReport={{ title: 'Activity Logs', slug: 'activity-logs' }}
  />
);

export { ActivityMaster };
