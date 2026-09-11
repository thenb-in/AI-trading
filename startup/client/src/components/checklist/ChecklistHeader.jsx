import PropTypes from 'prop-types';
import { ListChecks, RefreshCw } from 'lucide-react';
import { DateRangeFilter } from '@startup/components/base_filter/DateRangeFilter';
import { ChecklistSummary } from './ChecklistSummary';


const ChecklistHeader = ({
  dateRange, onDateRangeChange, checkedAt, running, onRefresh, summary, selectedStatus, onStatusChange
}) => (
  <div>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-gray-200 bg-slate-100 px-6 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shrink-0">
          <ListChecks className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-gray-900 leading-tight">Checklist</h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {checkedAt
              ? `Checked at ${checkedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Running checks…'}
          </p>
        </div>
      </div>

      <div className="ml-auto">
        <DateRangeFilter
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={onDateRangeChange}
        />
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="flex items-center gap-1.5 shrink-0 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
      >
        <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>

    <div className="border-b border-gray-200">
      <ChecklistSummary summary={summary} selectedStatus={selectedStatus} onStatusChange={onStatusChange} />
    </div>
  </div>
);

ChecklistHeader.propTypes = {
  dateRange: PropTypes.object.isRequired,
  onDateRangeChange: PropTypes.func.isRequired,
  checkedAt: PropTypes.instanceOf(Date),
  running: PropTypes.bool,
  onRefresh: PropTypes.func.isRequired,
  summary: PropTypes.object.isRequired,
  selectedStatus: PropTypes.string.isRequired,
  onStatusChange: PropTypes.func.isRequired
};

export { ChecklistHeader };
