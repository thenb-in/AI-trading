import PropTypes from "prop-types";
import { getColorClasses } from "@startup/constants/theme";
import { CalendarDays } from "lucide-react";

/**
 * Generic ReportTitleSection component displaying report title, description, last updated time, and export button.
 * Can be customized by passing custom props or replaced entirely in BaseReport.
 */
const ReportTitleSection = ({ report }) => {
  const colorClasses = getColorClasses(report.color);
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
      {/* Left: Title & Description */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span
            className={`w-3 h-10 rounded-full shadow-sm transition-transform transform hover:scale-105 ${colorClasses.accent}`}
            title="Report color"
          ></span>
          <span>{report.title}</span>
        </h1>
        {report.desc && (
          <p className="text-gray-500 text-sm mt-1">{report.desc}</p>
        )}
      </div>

      {/* Right: Last Updated & Export */}
     <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mt-2 md:mt-0">
        {/* Last Updated */}
        <div className="flex items-center text-sm text-gray-500 gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <span>
            Last updated: {formattedDate}, {formattedTime}
          </span>
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
