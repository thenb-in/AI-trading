import { useState, useCallback } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { Filter as FilterIcon } from 'lucide-react';
import PropTypes from 'prop-types';
import { Filter } from './filter';
import { MasterModal } from '@startup/components/base_components/master/master_modal/MasterModal';

const BaseFilter = ({
  onFiltersApply,
  filtersConfig = [],
  isLoading = false,
  disabled = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = useCallback(async (applied) => {
    const result = await onFiltersApply?.(applied);
    setIsOpen(false);
    return result;
  }, [onFiltersApply]);

  if (!isMobile) {
    return (
      <Filter
        filtersConfig={filtersConfig}
        onFiltersApply={onFiltersApply}
        isLoading={isLoading}
        disabled={disabled}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-4 rounded-md text-sm font-medium transition-colors ${
          disabled
            ? 'bg-blue-50 text-blue-300 border border-blue-100 cursor-not-allowed'
            : 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 hover:border-blue-700 active:bg-blue-800 shadow-sm'
        }`}
      >
        <FilterIcon size={16} />
        <span>Filters</span>
      </button>

      <MasterModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Apply Your Filter"
        showAudit={false}
        disableContentScroll
      >
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3">
          <Filter
            filtersConfig={filtersConfig}
            onFiltersApply={handleApply}
            isLoading={isLoading}
            disabled={disabled}
            hideToggle
          />
        </div>
      </MasterModal>
    </>
  );
};

BaseFilter.propTypes = {
  onFiltersApply: PropTypes.func,
  filtersConfig: PropTypes.array,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
};

export { BaseFilter };
