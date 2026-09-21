import PropTypes from 'prop-types';

import { BaseReport } from '@startup/components/base_report/BaseReport';
import { NotificationLogReportFilters } from './notificationLogFilters';
import { statusChip } from '@startup/components/base_report/statusChip';


const STATUS_CHIP = statusChip('status_label', {
  Sent: 'good',
  Failed: 'bad',
  Skipped: 'neutral'
});


const NotificationLogReport = ({ report, locationState }) => (
  <BaseReport
    report={report}
    locationState={locationState}
    documentName={report.slug}
    filters={NotificationLogReportFilters}
    frozenColumns={['user_name']}
    decorateColumns={STATUS_CHIP}
    defaultSortField="sent_at"
  />
);

NotificationLogReport.propTypes = {
  report: PropTypes.object.isRequired,
  locationState: PropTypes.object
};

export { NotificationLogReport };
