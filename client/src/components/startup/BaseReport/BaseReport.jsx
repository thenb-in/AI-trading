import PropTypes from "prop-types";
import { useSearchParams } from "react-router-dom";
import { ReportHeader } from "./ReportHeader.jsx";
import { ReportTitleSection } from "./ReportTitleSection.jsx";
import { NbNextDataGrid } from "../nbnext_data_grid/NbNextDataGrid.jsx";
import { useState, useEffect } from "react";

import { fetchReportData, getFiltersFromSearchParams, handleFiltersApply, processApiData } from "./ReportUtils.js";
import { LoadingBarReport } from "./LoadingBarReport.jsx";
import { ReportFilter } from "./ReportFilters.jsx";

/**
 * Generic BaseReport component that can be used for any report type.
 * Provides standard report functionality: filtering, data display, loading states, and export.
 * 
 * @param {Object} props
 * @param {Object} props.report - Report configuration object with title, desc, color, slug, etc.
 * @param {Object} props.locationState - Optional state passed from navigation (reportData, columns, filters, etc.)
 * @param {Array} props.additionalFilters - Optional additional filters specific to this report
 * @param {Function} props.onReportDataChange - Optional callback when report data changes
 * @param {Function} props.customTitleSection - Optional custom title section component
 * @param {Function} props.customHeader - Optional custom header component
 * @param {Object} props.reportApi - Optional report API service with getReportData(slug, filters) method
 */
const BaseReport = ({ 
  report, 
  locationState,
  additionalFilters = [],
  onReportDataChange,
  customTitleSection,
  customHeader,
  reportApi
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filters, setFilters] = useState(getFiltersFromSearchParams(searchParams));

  // Fetch initial report data
  useEffect(() => {
    fetchReportData(
      report,
      locationState,
      setRows,
      setColumns,
      setLoading,
      setInitialLoad,
      () => {}, // setStatusDefinitions - not used by default
      setSearchParams,
      false // hasStatusDefinitions
    );
  }, [report.title, locationState]);

  // Handle filter application
  const onFiltersApply = (newFilters) => {
    setFilters(newFilters);
    handleFiltersApply(
      newFilters,
      report,
      setRows,
      setColumns,
      setLoading,
      setIsFiltering,
      setSearchParams,
      () => {}, // setStatusDefinitions - not used by default
      false, // hasStatusDefinitions
      reportApi // Pass the report API service
    );
  };

  // Process location state data if provided
  useEffect(() => {
    if (locationState?.reportData && locationState?.columns) {
      const { gridColumns, gridRows } = processApiData(
        {
          columns: locationState.columns,
          data: locationState.reportData,
          status_definitions: locationState.statusDefinitions || {},
        },
        () => {}, // setStatusDefinitions - not used by default
        false // hasStatusDefinitions
      );
      setColumns(gridColumns);
      setRows(gridRows);
    }
  }, [locationState]);

  // Notify parent component of data changes if callback provided
  useEffect(() => {
    if (onReportDataChange && rows.length > 0) {
      onReportDataChange({ rows, columns, filters });
    }
  }, [rows, columns, filters, onReportDataChange]);

  const isLoadingData = loading || initialLoad;

  // Use custom components if provided, otherwise use defaults
  const TitleSection = customTitleSection || ReportTitleSection;
  const Header = customHeader || ReportHeader;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isFiltering={isFiltering} />

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <TitleSection report={report} rows={rows} columns={columns} />
          <ReportFilter
            onFiltersApply={onFiltersApply}
            initialFilters={filters}
            additionalFilters={additionalFilters}
            disabled={isFiltering || isLoadingData}
          />
        </div>

        <div className="relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden h-full w-full">
          <LoadingBarReport isVisible={isLoadingData} isFiltering={isFiltering} />
          <NbNextDataGrid
            rows={rows}
            columns={columns}
          />
        </div>
      </div>
    </div>
  );
};

BaseReport.propTypes = {
  report: PropTypes.object.isRequired,
  locationState: PropTypes.object,
  additionalFilters: PropTypes.array,
  onReportDataChange: PropTypes.func,
  customTitleSection: PropTypes.elementType,
  customHeader: PropTypes.elementType,
  reportApi: PropTypes.object,
};

export { BaseReport };

