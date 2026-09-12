import PropTypes from 'prop-types';

import { BaseReport } from '@startup/components/base_report/BaseReport';
import { useFilterDynamicOptions } from '@startup/hooks/useFilterDynamicOptions';
import { useFilterConfig } from '@startup/components/base_filter/filterUtils';
import { NotificationLogReportFilters } from '@startup/filter/reportFilterConfig';
import { FILTER_DYNAMIC_LOADERS } from '@startup/filter/filterDynamicLoaders';
import { statusChip } from '@startup/components/base_report/statusChip';


const STATUS_CHIP = statusChip('status_label', {
  Sent: 'good',
  Failed: 'bad',
  Skipped: 'neutral'
});


const NotificationLogReport = ({ report, locationState }) => {
  const { dynamicOptions, isLoading } = useFilterDynamicOptions(NotificationLogReportFilters, FILTER_DYNAMIC_LOADERS);
  const filtersConfig = useFilterConfig(NotificationLogReportFilters, dynamicOptions);

  return (
    <BaseReport
      report={report}
      locationState={locationState}
      documentName={report.slug}
      filtersConfig={filtersConfig}
      isFilterLoading={isLoading}
      frozenColumns={['user_name']}
      decorateColumns={STATUS_CHIP}
      defaultSortField="sent_at"
    />
  );
};

NotificationLogReport.propTypes = {
  report: PropTypes.object.isRequired,
  locationState: PropTypes.object
};

export { NotificationLogReport };
