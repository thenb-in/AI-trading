import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import RestorePageIcon from '@mui/icons-material/RestorePage';
import { REPORTS_ROOT_PATH, REPORTING_MANAGER_PATH } from '@startup/constants/reportRuns';

/**
 * Generic ReportHeader component for navigation and report actions.
 * Can be customized by passing custom props or replaced entirely in BaseReport.
 */
const ReportHeader = ({
  isFiltering,
  showReportingManager = true,
  backPath = REPORTS_ROOT_PATH
}) => {
  const navigate = useNavigate();
  const goToReportingManager = () => navigate(REPORTING_MANAGER_PATH);

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-16">
          <button
            onClick={() => navigate(backPath)}
            disabled={isFiltering}
            className={`flex items-center gap-2 transition-colors ${
              isFiltering ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ArrowLeft size={18} />
            <span className="font-medium">Back to Reports</span>
          </button>
          {showReportingManager && (
          <button
            onClick={goToReportingManager}
            disabled={isFiltering}
            className={`flex items-center gap-2 transition-colors ${
              isFiltering
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <RestorePageIcon size={18} />
            <span className="font-medium">Reporting Manager</span>
          </button>
          )}
        </div>
      </div>
    </div>
  );
};

ReportHeader.propTypes = {
  isFiltering: PropTypes.bool.isRequired,
  showReportingManager: PropTypes.bool,
  backPath: PropTypes.string,
};

export { ReportHeader };
