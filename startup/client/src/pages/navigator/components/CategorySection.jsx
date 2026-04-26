import { memo } from "react";
import PropTypes from "prop-types";
import { Folder } from "lucide-react";
import { ModuleCard } from "./ModuleCard";

const CategorySection = ({ category, modules, type, onModuleClick }) => {
  if (modules.length === 0) return null;

  const isReport = type === "report";

  return (
    <div className="mb-8">
      {/* Category Header */}
      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-200">
        <div className={`p-1.5 rounded-md ${
          isReport 
            ? "bg-purple-100 text-purple-600" 
            : "bg-blue-100 text-blue-600"
        }`}>
          <Folder size={16} />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 tracking-wide">
          {category}
        </h3>
        <div className="flex-1 h-px bg-gray-200" />
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          isReport
            ? "bg-purple-50 text-purple-600"
            : "bg-blue-50 text-blue-600"
        }`}>
          {modules.length}
        </span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {modules.map((module) => (
          <ModuleCard
            key={module.id || module.title}
            module={module}
            type={type}
            onClick={() => onModuleClick(module)}
          />
        ))}
      </div>
    </div>
  );
};

CategorySection.propTypes = {
  category: PropTypes.string.isRequired,
  modules: PropTypes.arrayOf(PropTypes.object).isRequired,
  type: PropTypes.oneOf(["master", "report"]).isRequired,
  onModuleClick: PropTypes.func.isRequired,
};

const MemoizedCategorySection = memo(CategorySection);
export { MemoizedCategorySection as CategorySection };

