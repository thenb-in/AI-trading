import PropTypes from 'prop-types';
import { ChevronRight, CalendarRange } from 'lucide-react';
import { STATUS_STYLES } from '../constants/checklistConstants';
import { ChecklistMeter } from '../ChecklistProgress';
import { RowActions } from './RowActions';

const TaskRow = ({ check, result, showStatusStripe, onOpenDetail }) => {
  const statusStyles = STATUS_STYLES[check.outstandingStatus] ?? STATUS_STYLES.warn;
  const Icon = check.icon;
  const outstanding = result.count;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      className={`group relative py-3.5 pr-5 flex items-start gap-3 cursor-pointer select-none transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${showStatusStripe ? 'pl-6' : 'pl-5'}`}
      onClick={onOpenDetail}
    >
      {showStatusStripe && <span className={`absolute inset-y-0 left-0 w-1 ${statusStyles.stripe}`} aria-hidden="true" />}
      <div className={`p-2 rounded-lg shrink-0 ${statusStyles.iconWrapper}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">{check.title}</span>
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium shrink-0 ${statusStyles.badge}`}>{outstanding}</span>
        </div>
        {check.whyItMatters && <p className="text-xs text-gray-600 mt-0.5 truncate">{check.whyItMatters}</p>}
        {result.window?.label && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded bg-gray-100 text-[11px] font-medium text-gray-600">
            <CalendarRange className="h-3 w-3" />
            {result.window.label}
          </span>
        )}
        <ChecklistMeter
          status={check.outstandingStatus}
          outstanding={outstanding}
          total={result.total ?? outstanding}
          completion={result.completion ?? 0}
        />
      </div>
      <RowActions result={result} />
      <div className="flex w-5 justify-end text-gray-400 shrink-0 mt-2 transition-transform group-hover:translate-x-0.5">
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  );
};

TaskRow.propTypes = {
  check: PropTypes.object.isRequired,
  result: PropTypes.object.isRequired,
  showStatusStripe: PropTypes.bool,
  onOpenDetail: PropTypes.func.isRequired
};

export { TaskRow };
