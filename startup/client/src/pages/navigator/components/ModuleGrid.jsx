import { memo } from "react";
import PropTypes from "prop-types";
import { ModuleCard } from "./ModuleCard";
import { EmptyState } from "./EmptyState";

const ModuleGrid = ({
  appModules,
  masters,
  reports,
  other = [],
  appModuleStats,
  masterStats,
  reportStats,
  onAppModuleClick,
  onMasterClick,
  onReportClick,
  onOtherClick = () => {},
  searchTerm,
  gridColsClassName = "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
}) => {
  const hasAppModules = appModules.length > 0;
  const hasMasters = masters.length > 0;
  const hasReports = reports.length > 0;
  const hasOther = other.length > 0;
  const hasAnyContent = hasAppModules || hasMasters || hasReports || hasOther;


  if (!hasAnyContent) {
    return <EmptyState searchTerm={searchTerm} />;
  }

  return (
    <div className="space-y-4">
      {/* Compact Stats Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="text-sm font-medium text-gray-700">
            <span className="text-indigo-600 font-semibold">{appModuleStats.total}</span> Modules
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-blue-600 font-semibold">{masterStats.total}</span> Masters
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-purple-600 font-semibold">{reportStats.total}</span> Reports
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{appModuleStats.accessible + masterStats.accessible + reportStats.accessible} Accessible</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>{appModuleStats.restricted + masterStats.restricted + reportStats.restricted} Restricted</span>
            </div>
          </div>
        </div>
      </div>

      {/* App Modules Section */}
      {hasAppModules && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1 h-4 bg-indigo-500 rounded"></div>
            <h3 className="text-sm font-semibold text-indigo-700">App Modules</h3>
            <span className="text-xs text-gray-500 bg-indigo-50 px-2 py-0.5 rounded-full">
              {appModules.length}
            </span>
          </div>
          <div className={`grid ${gridColsClassName} gap-1.5`}>
            {appModules.map((module) => (
              <div key={module.id || module.title} className="h-20">
                <ModuleCard
                  module={module}
                  type="module"
                  onClick={() => onAppModuleClick(module)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports Section */}
      {hasReports && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1 h-4 bg-purple-500 rounded"></div>
            <h3 className="text-sm font-semibold text-purple-700">Reports</h3>
            <span className="text-xs text-gray-500 bg-purple-50 px-2 py-0.5 rounded-full">
              {reports.length}
            </span>
          </div>
          <div className={`grid ${gridColsClassName} gap-1.5`}>
            {reports.map((report) => (
              <div key={report.id || report.title} className="h-20">
                <ModuleCard
                  module={report}
                  type="report"
                  onClick={() => onReportClick(report)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Masters Section */}
      {hasMasters && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1 h-4 bg-blue-500 rounded"></div>
            <h3 className="text-sm font-semibold text-blue-700">Master Modules</h3>
            <span className="text-xs text-gray-500 bg-blue-50 px-2 py-0.5 rounded-full">
              {masters.length}
            </span>
          </div>
          <div className={`grid ${gridColsClassName} gap-1.5`}>
            {masters.map((module) => (
              <div key={module.id || module.title} className="h-20">
                <ModuleCard
                  module={module}
                  type="master"
                  onClick={() => onMasterClick(module)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Section — permissions with no module/report/master definition */}
      {hasOther && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1 h-4 bg-gray-400 rounded"></div>
            <h3 className="text-sm font-semibold text-gray-700">Other</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {other.length}
            </span>
          </div>
          <div className={`grid ${gridColsClassName} gap-1.5`}>
            {other.map((module) => (
              <div key={module.id || module.title} className="h-20">
                <ModuleCard
                  module={module}
                  type="other"
                  onClick={() => onOtherClick(module)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

ModuleGrid.propTypes = {
  appModules: PropTypes.arrayOf(PropTypes.object).isRequired,
  masters: PropTypes.arrayOf(PropTypes.object).isRequired,
  reports: PropTypes.arrayOf(PropTypes.object).isRequired,
  other: PropTypes.arrayOf(PropTypes.object),
  onOtherClick: PropTypes.func,
  appModuleStats: PropTypes.shape({
    total: PropTypes.number.isRequired,
    accessible: PropTypes.number.isRequired,
    restricted: PropTypes.number.isRequired,
  }).isRequired,
  masterStats: PropTypes.shape({
    total: PropTypes.number.isRequired,
    accessible: PropTypes.number.isRequired,
    restricted: PropTypes.number.isRequired,
  }).isRequired,
  reportStats: PropTypes.shape({
    total: PropTypes.number.isRequired,
    accessible: PropTypes.number.isRequired,
    restricted: PropTypes.number.isRequired,
  }).isRequired,
  onAppModuleClick: PropTypes.func.isRequired,
  onMasterClick: PropTypes.func.isRequired,
  onReportClick: PropTypes.func.isRequired,
  searchTerm: PropTypes.string.isRequired,
  gridColsClassName: PropTypes.string,
};

const MemoizedModuleGrid = memo(ModuleGrid);
export { MemoizedModuleGrid as ModuleGrid };
