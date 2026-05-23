import PropTypes from "prop-types";
import { getColorClasses } from "@startup/constants/theme";
import { CalendarDays } from "lucide-react";
import { formatLastActive } from "@utils/dateTimeUtils";

/**
 * Generic ReportTitleSection component displaying report title, description, last updated time, and export button.
 * Can be customized by passing custom props or replaced entirely in BaseReport.
 */
const ReportTitleSection = ({ report }) => {
  const colorClasses = getColorClasses(report.color);
  const lastUpdated = formatLastActive(new Date());

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-gray-200">
      {/* Left: Title & Description */}
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 flex items-center gap-2 sm:gap-3">
          <span
            className={`flex-shrink-0 w-2 sm:w-3 h-8 sm:h-10 rounded-full shadow-sm transition-transform transform hover:scale-105 ${colorClasses.accent}`}
            title="Report color"
          ></span>
          <span className="break-words">{report.title}</span>
        </h1>
        {report.desc && (
          <p className="text-gray-500 text-xs sm:text-sm mt-1">{report.desc}</p>
        )}
      </div>

      {/* Right: Last Updated & Export */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2 sm:gap-3">
        {/* Last Updated */}
        <div className="flex items-center text-xs sm:text-sm text-gray-500 gap-1.5 sm:gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">Last updated: {lastUpdated}</span>
        </div>
      </div>
    </div>
  );
};

ReportTitleSection.propTypes = {
  report: PropTypes.shape({
    title: PropTypes.string.isRequired,
    desc: PropTypes.string,
    color: PropTypes.string,
  }).isRequired,
};

export { ReportTitleSection };
