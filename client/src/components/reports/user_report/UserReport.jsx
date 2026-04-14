import PropTypes from "prop-types";
import { BaseReport } from "../../startup/base_report/BaseReport";
import { ApiService } from "@services/startup/ApiService";

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
  // Create a report API service wrapper
  // This adapts your application's API service to the BaseReport's expected interface
  const reportApi = {
    async getReportData(slug, filters) {
      // Adapt your API service call to match BaseReport's expected format
      // Example: const response = await ApiService.get(`/reports/${slug}`, { params: filters });
      // Return format: { data: { columns: [], data: [], status_definitions: {} } }
      
      // TODO: Implement your actual API call here
      // For now, this is a placeholder that will throw an error if filters are applied
      const response = await ApiService.request('GET', `/reports/${slug}`, null, { params: filters });
      return response;
    }
  };

  // Define any additional filters specific to this report
  const additionalFilters = [
    // Example: { name: 'status', label: 'Status', type: 'select', options: [], is_standard: false }
  ];

  return (
    <BaseReport
      report={report}
      locationState={locationState}
      additionalFilters={additionalFilters}
      reportApi={reportApi}
      // Optional: You can pass custom components if needed
      // customTitleSection={CustomTitleSection}
      // customHeader={CustomHeader}
    />
  );
};

UserReport.propTypes = {
  report: PropTypes.object.isRequired,
  locationState: PropTypes.object,
};

export { UserReport };
