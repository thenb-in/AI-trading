import PropTypes from 'prop-types';
import { Check, X, Loader2 } from 'lucide-react';


const FilterActions = ({
  disabled,
  onReset,
  onApply,
  onApplyViaRunner,
  isApplyingFilters = false,
  isApplyingViaRunner = false,
  showApplyButton = false,
}) => (
  <div className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-3 mt-3 border-t-2 border-blue-200 bg-gradient-to-r from-gray-50 to-blue-50/30 -mx-3 sm:-mx-4 px-3 sm:px-4 pb-3">
    <div className="flex flex-col sm:flex-row gap-2">
      {showApplyButton && (
        <button
          onClick={onApply}
          disabled={disabled}
          className={`
            inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-wide text-white rounded-md transition-all duration-200 w-full sm:w-auto shadow-md
            ${disabled
              ? 'bg-blue-400 cursor-not-allowed shadow-sm'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg active:scale-95'
            }
          `}
        >
          {isApplyingFilters ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Check size={14} />
              Apply Filters
            </>
          )}
        </button>
      )}
    </div>

    <div className="flex flex-col sm:flex-row gap-2">
      <button
        onClick={onReset}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-md border-2 transition-all duration-200 w-full sm:w-auto shadow-sm
          ${disabled
            ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
            : 'text-gray-800 bg-white border-gray-400 hover:bg-red-50 hover:border-red-400 hover:shadow-md active:scale-95'
          }
        `}
      >
        <X size={14} />
        Clear All
      </button>

      {onApplyViaRunner && (
        <button
          onClick={onApplyViaRunner}
          disabled={disabled}
          title="Run this report on the dedicated report-runner server (offloads CPU from the app server)"
          className={`
            inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-wide text-white rounded-md transition-all duration-200 w-full sm:w-auto shadow-md
            ${disabled
              ? 'bg-emerald-400 cursor-not-allowed shadow-sm'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 hover:shadow-lg active:scale-95'
            }
          `}
        >
          {isApplyingViaRunner ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Check size={14} />
              Apply filters
            </>
          )}
        </button>
      )}
    </div>
  </div>
);

FilterActions.propTypes = {
  disabled: PropTypes.bool,
  onReset: PropTypes.func.isRequired,
  onApply: PropTypes.func.isRequired,
  onApplyViaRunner: PropTypes.func,
  isApplyingFilters: PropTypes.bool,
  isApplyingViaRunner: PropTypes.bool,
  showApplyButton: PropTypes.bool,
};

export { FilterActions };
