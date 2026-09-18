import PropTypes from 'prop-types';

import { BaseReport } from '@startup/components/base_report/BaseReport';
import { useFilterDynamicOptions } from '@startup/hooks/useFilterDynamicOptions';
import { useFilterConfig } from '@startup/components/base_filter/filterUtils';
import { NotificationLogReportFilters } from './notificationLogFilters';
import { statusChip } from '@startup/components/base_report/statusChip';


const STATUS_CHIP = statusChip('status_label', {
  Sent: 'good',
  Failed: 'bad',
  Skipped: 'neutral'
});


const NotificationLogReport = ({ report, locationState }) => {
  const { dynamicOptions } = useFilterDynamicOptions(NotificationLogReportFilters);
  const filtersConfig = useFilterConfig(NotificationLogReportFilters, dynamicOptions);

  return (
    <BaseReport
      report={report}
      locationState={locationState}
      documentName={report.slug}
      filtersConfig={filtersConfig}
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
