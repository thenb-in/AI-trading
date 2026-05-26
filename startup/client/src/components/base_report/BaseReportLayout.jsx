import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { ReportHeader } from './ReportHeader';
import { ReportTitleSection } from './ReportTitleSection';
import { BaseFilter } from '@startup/components/base_filter/BaseFilter';
import { LoadingBarReport } from './LoadingBarReport';

/**
 * Shared "report header + filter + body card" chrome. Reports that need to bring their own
 * data grid (e.g. an actions column, special grid component, multi-section body) wrap the
 * grid in this shell so they don't recreate the surrounding markup.
 */
const BaseReportLayout = ({
  report,
  isFiltering,
  isLoadingData,
  filtersConfig,
  isFilterLoading,
  onFiltersApply,
  children,
}) => {
  const [showApplyButton, setShowApplyButton] = useState(false);

  const handleTitleClick = useCallback((e) => {
    if (e.detail === 3) setShowApplyButton((v) => !v);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <ReportHeader isFiltering={isFiltering} />

      <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <ReportTitleSection report={report} onTitleClick={handleTitleClick} />
          <BaseFilter
            onFiltersApply={onFiltersApply}
            filtersConfig={filtersConfig}
            isLoading={isFilterLoading}
            disabled={isFiltering || isLoadingData}
            showApplyButton={showApplyButton}
          />
        </div>

        <div className="relative bg-white rounded-lg sm:rounded-2xl shadow-sm sm:shadow-lg border border-gray-200 overflow-hidden h-full w-full min-w-0">
          <LoadingBarReport isVisible={isLoadingData} isFiltering={isFiltering} />
          {children}
        </div>
      </div>
    </div>
  );
};

BaseReportLayout.propTypes = {
  report: PropTypes.object.isRequired,
  isFiltering: PropTypes.bool,
  isLoadingData: PropTypes.bool,
  filtersConfig: PropTypes.array,
  isFilterLoading: PropTypes.bool,
  onFiltersApply: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export { BaseReportLayout };
