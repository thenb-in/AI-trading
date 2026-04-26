import { memo } from "react";
import PropTypes from "prop-types";
import { Folder } from "lucide-react";
import { ModuleCard } from "./ModuleCard";

const OptimizedCategoryGrid = ({ categories, categoryDataMap, type, onModuleClick }) => {
  const isReport = type === "report";

  // Flatten all modules with category info for continuous grid
  const allItems = [];
  
  categories.forEach((category) => {
    const categoryName = category.name || category;
    const modules = categoryDataMap.get(categoryName) || categoryDataMap.get(category.id) || [];
    
    if (modules.length === 0) return;

    // Add category header as an item
    allItems.push({
      type: 'header',
      category: categoryName,
      count: modules.length,
    });

    // Add all modules
    modules.forEach((module) => {
      allItems.push({
        type: 'module',
        module,
        category: categoryName,
      });
    });
  });

  if (allItems.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 items-start">
      {allItems.map((item, index) => {
        if (item.type === 'header') {
          return (
            <div 
              key={`header-${item.category}-${index}`}
              className="col-span-3 flex items-center gap-2 mt-2 first:mt-0 mb-1.5 pb-1 border-b border-gray-200"
            >
              <div className={`p-1 rounded ${
                isReport 
                  ? "bg-purple-100 text-purple-600" 
                  : "bg-blue-100 text-blue-600"
              }`}>
                <Folder size={12} />
              </div>
              <h3 className="text-xs font-semibold text-gray-700">
                {item.category}
              </h3>
              <div className="flex-1 h-px bg-gray-200" />
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                isReport
                  ? "bg-purple-50 text-purple-600"
                  : "bg-blue-50 text-blue-600"
              }`}>
                {item.count}
              </span>
            </div>
          );
        }

        return (
          <ModuleCard
            key={`module-${item.module.id || item.module.title}-${index}`}
            module={item.module}
            type={type}
            onClick={() => onModuleClick(item.module)}
          />
        );
      })}
    </div>
  );
};

OptimizedCategoryGrid.propTypes = {
  categories: PropTypes.array.isRequired,
  categoryDataMap: PropTypes.instanceOf(Map).isRequired,
  type: PropTypes.oneOf(["master", "report"]).isRequired,
  onModuleClick: PropTypes.func.isRequired,
};

const MemoizedOptimizedCategoryGrid = memo(OptimizedCategoryGrid);
export { MemoizedOptimizedCategoryGrid as OptimizedCategoryGrid };


