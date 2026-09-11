import PropTypes from 'prop-types';
import { CheckCircle2 } from 'lucide-react';
import { STATUS_TABS } from './constants/checklistConstants';

const StatusTab = ({ icon: Icon, label, count, iconColor, active, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={active}
    className={`flex w-[116px] flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
      active ? 'bg-white shadow-sm ring-1 ring-gray-300' : 'hover:bg-white/70'
    }`}
  >
    <span className="flex items-center gap-1.5">
      <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
      <span className="text-xl font-semibold leading-none text-gray-900 tabular-nums">{count}</span>
    </span>
    <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
  </button>
);

StatusTab.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  iconColor: PropTypes.string.isRequired,
  active: PropTypes.bool,
  onSelect: PropTypes.func.isRequired
};

const StatusTabs = ({ summary, selectedStatus, onStatusChange }) => (
  <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
    {STATUS_TABS
      .filter((tab) => !tab.hideWhenEmpty || summary[tab.key] > 0)
      .map((tab) => (
        <StatusTab
          key={tab.key}
          icon={tab.icon}
          label={tab.label}
          count={tab.key === 'all' ? summary.total : summary[tab.key]}
          iconColor={tab.iconColor}
          active={selectedStatus === tab.key}
          onSelect={() => onStatusChange(tab.key)}
        />
      ))}
  </div>
);

StatusTabs.propTypes = {
  summary: PropTypes.object.isRequired,
  selectedStatus: PropTypes.string.isRequired,
  onStatusChange: PropTypes.func.isRequired
};

const AllClearSummary = ({ summary, selectedStatus, onStatusChange }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-6">
    <div className="flex items-center gap-3">
      <CheckCircle2 className="h-9 w-9 text-emerald-500 shrink-0" />
      <div>
        <p className="text-lg font-semibold text-gray-900 leading-tight">Nothing left on this list</p>
        <p className="text-sm text-gray-500 mt-0.5">{`All ${summary.total} checks came back clear.`}</p>
      </div>
    </div>
    <StatusTabs summary={summary} selectedStatus={selectedStatus} onStatusChange={onStatusChange} />
  </div>
);

AllClearSummary.propTypes = {
  summary: PropTypes.object.isRequired,
  selectedStatus: PropTypes.string.isRequired,
  onStatusChange: PropTypes.func.isRequired
};

const ChecklistSummary = ({ summary, selectedStatus, onStatusChange }) => {
  if (summary.allClear) {
    return (
      <AllClearSummary summary={summary} selectedStatus={selectedStatus} onStatusChange={onStatusChange} />
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-6">
      <div className="flex items-baseline gap-4 min-w-0">
        <span className="text-5xl font-semibold text-gray-900 leading-none tracking-tight">
          {summary.outstanding.toLocaleString()}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700">
            {summary.outstanding === 1 ? 'item outstanding' : 'items outstanding'}
            {summary.pending > 0 && <span className="font-normal text-gray-400"> so far</span>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{summary.caption}</p>
        </div>
      </div>
      <StatusTabs summary={summary} selectedStatus={selectedStatus} onStatusChange={onStatusChange} />
    </div>
  );
};

ChecklistSummary.propTypes = {
  summary: PropTypes.object.isRequired,
  selectedStatus: PropTypes.string.isRequired,
  onStatusChange: PropTypes.func.isRequired
};

export { ChecklistSummary };
