import PropTypes from 'prop-types';
import { ActivityChangesTable } from '@/components/admin/audit_timeline/ActivityChangesTable';
import { parseDateValue } from '@utils/dateTimeUtils';

const ActivityLogDetails = ({ activity }) => {
  if (!activity) {
    return null;
  }

  let parsedLog;
  try {
    parsedLog = activity.log ? JSON.parse(activity.log) : null;
  } catch {
    parsedLog = null;
  }

  const action = parsedLog?.action || activity.action || '-';
  const head = activity.head;
  const objectName = activity.objectName || parsedLog?.objectName || '-';
  const recordId = activity.objectId ?? null;
  const timestamp = activity.timestamp || activity.createdAt || '-';
  const actor = activity.createdByName || activity.userName || '-';

  const renderUpdateChanges = () => {
    const changes = parsedLog?.changes;
    return <ActivityChangesTable changes={changes} title="Changed Fields" />;
  };

  const renderCreateDelete = () => {
    const createdIds = parsedLog?.createdIds;
    const deletedIds = parsedLog?.deletedIds;

    if (Array.isArray(createdIds) && createdIds.length > 0) {
      return (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Created IDs</h4>
          <div className="text-sm text-gray-800">{createdIds.join(', ')}</div>
        </div>
      );
    }

    if (Array.isArray(deletedIds) && deletedIds.length > 0) {
      return (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Deleted IDs</h4>
          <div className="text-sm text-gray-800">{deletedIds.join(', ')}</div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-500">Head </div>
          <div className="text-gray-900 font-medium">{head}</div>
        </div>
        <div>
          <div className="text-gray-500">Message</div>
          <div className="text-gray-900 font-medium">{objectName}</div>
        </div>
        <div>
          <div className="text-gray-500">Action</div>
          <div className="text-gray-900 font-medium">{action}</div>
        </div>
        {recordId != null && (
          <div>
            <div className="text-gray-500">Record ID</div>
            <div className="text-gray-900 font-medium">{recordId}</div>
          </div>
        )}
        <div>
          <div className="text-gray-500">Performed By</div>
          <div className="text-gray-900">{actor}</div>
        </div>
        <div>
          <div className="text-gray-500">Timestamp</div>
          <div className="text-gray-900">
            {timestamp ? (parseDateValue(timestamp)?.toLocaleString() ?? '-') : '-'}
          </div>
        </div>
      </div>

      {parsedLog?.action === 'UPDATE' && renderUpdateChanges()}

      {parsedLog?.action !== 'UPDATE' && renderCreateDelete()}

      {!parsedLog && activity.log && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Raw Log</h4>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-md p-2 overflow-x-auto">
            {activity.log}
          </pre>
        </div>
      )}
    </div>
  );
};
export { ActivityLogDetails };

ActivityLogDetails.propTypes = {
  activity: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    head: PropTypes.string,
    objectName: PropTypes.string,
    objectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    action: PropTypes.string,
    log: PropTypes.string,
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    createdByName: PropTypes.string,
    userName: PropTypes.string
  })
};



