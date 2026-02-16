import { memo } from "react";
import PropTypes from "prop-types";
import { Lock, LockOpen, Filter } from "lucide-react";
import { MasterSearchInput } from "@startup/BaseMasterComponents";

const SearchHeader = ({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  allCategories,
  headerRef
}) => {
  return (
    <div 
      ref={headerRef}
      className="mb-2 p-6 rounded-xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg"
    >
      <div className="flex items-center justify-between gap-6 flex-wrap">
        {/* Left: Title and Legend */}
        <div className="flex items-center gap-6 flex-1">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight mb-1">
              Application Navigator
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              Explore all modules and reports in your workspace
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-5 pl-6 ml-2 border-l-2 border-gray-300">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50">
              <LockOpen size={18} className="text-green-600" />
              <span className="text-sm font-semibold text-green-800">Accessible</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
              <Lock size={18} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Restricted</span>
            </div>
          </div>
        </div>

        {/* Right: Filter and Search */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
            >
              {allCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="w-full md:w-auto md:min-w-[300px] md:max-w-md">
            <MasterSearchInput
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="Search modules and reports..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

SearchHeader.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  categoryFilter: PropTypes.string.isRequired,
  onCategoryFilterChange: PropTypes.func.isRequired,
  allCategories: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
  })).isRequired,
  headerRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
};

const MemoizedSearchHeader = memo(SearchHeader);
export { MemoizedSearchHeader as SearchHeader };

