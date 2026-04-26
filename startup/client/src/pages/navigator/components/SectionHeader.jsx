import { memo } from "react";
import PropTypes from "prop-types";
import { TrendingUp } from "lucide-react";

const SectionHeader = ({ title, stats, type }) => {
  const isReport = type === "report";
  
  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-blue-100">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg flex items-center justify-center ${
          isReport 
            ? "bg-gradient-to-br from-purple-600 to-purple-800 shadow-purple-300" 
            : "bg-gradient-to-br from-blue-600 to-blue-800 shadow-blue-300"
        } shadow-lg`}>
          <TrendingUp size={20} className="text-white" />
        </div>
        <h2 className={`text-xl font-bold ${
          isReport ? "text-purple-600" : "text-blue-600"
        }`}>
          {title}
        </h2>
      </div>
      <div className="flex gap-2">
        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-800 border border-green-200">
          {stats.accessible} Active
        </span>
        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
          {stats.restricted} Locked
        </span>
      </div>
    </div>
  );
};

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  stats: PropTypes.shape({
    accessible: PropTypes.number.isRequired,
    restricted: PropTypes.number.isRequired,
  }).isRequired,
  type: PropTypes.oneOf(["master", "report"]),
};

const MemoizedSectionHeader = memo(SectionHeader);
export { MemoizedSectionHeader as SectionHeader };

