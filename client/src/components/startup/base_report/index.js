/**
 * BaseReport - Generic report components for reusable report functionality
 * 
 * This module provides generic, reusable components for building reports:
 * - BaseReport: Main report component with filtering, data display, loading states, and export
 * - ReportHeader: Navigation header component
 * - ReportTitleSection: Title, description, and export button component
 * - ReportFilter: Filter component wrapper
 * - ReportUtils: Utility functions for data processing and API calls
 * - LoadingBarReport: Loading overlay component
 * - reportFormatter: Data formatting utilities
 * - reportExport: Excel export functionality
 * 
 * Usage:
 * ```jsx
 * import { BaseReport } from '@components/startup/BaseReport';
 * 
 * const MyCustomReport = ({ report, locationState }) => {
 *   const reportApi = {
 *     async getReportData(slug, filters) {
 *       // Your API implementation
 *     }
 *   };
 *   
 *   return (
 *     <BaseReport
 *       report={report}
 *       locationState={locationState}
 *       reportApi={reportApi}
 *       additionalFilters={[...]}
 *     />
 *   );
 * };
 * ```
 */

export { BaseReport } from './BaseReport';
export { ReportHeader } from './ReportHeader';
export { ReportTitleSection } from './ReportTitleSection';
export { ReportFilter } from './ReportFilter';
export { LoadingBarReport } from './LoadingBarReport';
export {
  fetchReportData,
  handleFiltersApply,
  processApiData,
  getFiltersFromSearchParams,
  updateSearchParams,
  convertCellToText,
  filterRelevantData,
} from './ReportUtils';
