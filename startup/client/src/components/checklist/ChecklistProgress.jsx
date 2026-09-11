import PropTypes from 'prop-types';
import { STATUS_STYLES } from './constants/checklistConstants';


const ChecklistMeter = ({ status, outstanding, total, completion }) => {
  const statusStyles = STATUS_STYLES[status] ?? STATUS_STYLES.warn;
  const outstandingShare = total > 0 ? Math.min(100, Math.round((outstanding / total) * 100)) : 100;

  return (
    <div className="flex items-center gap-2.5 mt-1.5">
      <svg
        className="h-2 flex-1"
        role="img"
        aria-label={`${outstanding} of ${total} outstanding, ${completion}% complete`}
      >
        <rect className={statusStyles.barTrack} width="100%" height="100%" rx="3" />
        <rect className={statusStyles.bar} width={`${outstandingShare}%`} height="100%" rx="3" />
      </svg>
      <span className="text-[11px] font-medium text-gray-600 shrink-0 tabular-nums">
        {`${outstanding} of ${total} left · ${completion}% complete`}
      </span>
    </div>
  );
};

ChecklistMeter.propTypes = {
  status: PropTypes.string,
  outstanding: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  completion: PropTypes.number.isRequired
};


const ChecklistBreakdown = ({ status, breakdown }) => {
  if (!breakdown?.length) {
    return null;
  }
  const statusStyles = STATUS_STYLES[status] ?? STATUS_STYLES.warn;
  const largestGroupCount = Math.max(...breakdown.map((group) => group.count));

  return (
    <ul className="space-y-1.5 mb-3">
      {breakdown.map((group) => (
        <li key={group.label} className="flex items-center gap-2.5 text-xs">
          <span className="text-gray-600 w-44 shrink-0 truncate" title={group.label}>{group.label}</span>
          <svg className="flex-1 h-1.5 min-w-0">
            <rect
              className={statusStyles.bar}
              width={`${largestGroupCount > 0 ? Math.max(2, (group.count / largestGroupCount) * 100) : 0}%`}
              height="100%"
              rx="1"
            />
          </svg>
          <span className="text-gray-500 tabular-nums w-10 text-right shrink-0">{group.count}</span>
        </li>
      ))}
    </ul>
  );
};

ChecklistBreakdown.propTypes = {
  status: PropTypes.string,
  breakdown: PropTypes.array
};

export { ChecklistMeter, ChecklistBreakdown };
