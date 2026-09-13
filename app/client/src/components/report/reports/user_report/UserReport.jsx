import PropTypes from "prop-types";
import { BaseReport } from "@startup/components/base_report/BaseReport";
import { ApiService } from "@services/ApiService";
import { commonFilters as userReportFilters } from "@app/filter/reportFilterConfig";
import { useFilterDynamicOptions } from "@startup/hooks/useFilterDynamicOptions";
import { useFilterConfig } from "@startup/components/base_filter/filterUtils";

/**
 * UserReport - Example custom report implementation using BaseReport.
 * This demonstrates how to create a custom report by extending BaseReport.
 *
 * You can customize:
 * - Additional filters specific to this report
 * - Custom title section or header
 * - Report-specific API service wrapper
 * - Custom data processing
 */
const UserReport = ({ report, locationState }) => {
  const reportApi = {
    async getReportData(slug, filters) {
      const response = await ApiService.request('GET', `/reports/${slug}`, null, { params: filters });
      return response;
    }
  };

  // Filters in reportFilterConfig.js that declare `fetchData` fetch their
  // own lists the first time they are opened.
  const { dynamicOptions } = useFilterDynamicOptions(userReportFilters);
  const filtersConfig = useFilterConfig(userReportFilters, dynamicOptions);

  return (
    <BaseReport
      report={report}
      locationState={locationState}
      filtersConfig={filtersConfig}
      reportApi={reportApi}
    />
  );
};

UserReport.propTypes = {
  report: PropTypes.object.isRequired,
  locationState: PropTypes.object,
};

export { UserReport };
