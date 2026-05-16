import PropTypes from 'prop-types';
import { Filter as FilterIcon, ChevronDown, Loader2 } from 'lucide-react';


const FilterHeader = ({
  activeFiltersCount,
  isBusy,
  isLoading,
  isExpanded,
  onLabelClick,
  onToggleExpanded,
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-t-lg overflow-hidden">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 bg-blue-500 rounded-lg">
        <FilterIcon size={16} className="text-white" />
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-bold text-gray-900 tracking-wide"
          onClick={onLabelClick}
        >
          FILTERS
        </span>
        {activeFiltersCount > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-blue-600 text-white shadow-md border-2 border-blue-700">
            {activeFiltersCount} ACTIVE
          </span>
        )}
      </div>
    </div>

    <div className="flex items-center gap-2">
      {isBusy && (
        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-blue-500 rounded-md text-xs font-bold text-white shadow-sm">
          <Loader2 size={12} className="animate-spin" />
          <span className="hidden sm:inline">{isLoading ? 'LOADING...' : 'APPLYING...'}</span>
        </div>
      )}

      <button
        onClick={onToggleExpanded}
        disabled={isBusy}
        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-blue-200"
        aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
      >
        <ChevronDown
          size={16}
          className={`transform transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>
    </div>
  </div>
);

FilterHeader.propTypes = {
  activeFiltersCount: PropTypes.number.isRequired,
  isBusy: PropTypes.bool,
  isLoading: PropTypes.bool,
  isExpanded: PropTypes.bool.isRequired,
  onLabelClick: PropTypes.func.isRequired,
  onToggleExpanded: PropTypes.func.isRequired,
};

export { FilterHeader };
