import React from "react";
import PropTypes from "prop-types";
import { getColorClasses } from "@theme";
import { CalendarDays } from "lucide-react";
import { handleExport } from "./report_export/index";
const { useState } = React;

/**
 * Generic ReportTitleSection component displaying report title, description, last updated time, and export button.
 * Can be customized by passing custom props or replaced entirely in BaseReport.
 */
const ReportTitleSection = ({ report, rows, columns, summary = null, showPdfButton = false, handlePDFExport = null, isPDFExporting = false }) => {
  const colorClasses = getColorClasses(report.color);
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const currentUrl = window.location.href;

  // Function to extract date range from URL parameters

  const handleExcelExport = async (report, rows, columns, currentUrl, summary) => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 0)); // update immediately
    try {
      await handleExport(report, rows, columns, currentUrl, summary);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
      {/* Left: Title & Description */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span
            className={`w-3 h-10 rounded-full shadow-sm transition-transform transform hover:scale-105 ${colorClasses.accent}`}
            title="Report color"
          ></span>
          <span>{report.title}</span>
        </h1>
        {report.desc && (
          <p className="text-gray-500 text-sm mt-1">{report.desc}</p>
        )}
      </div>

      {/* Right: Last Updated & Export */}
     <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mt-2 md:mt-0">
        {/* Last Updated */}
        <div className="flex items-center text-sm text-gray-500 gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <span>
            Last updated: {formattedDate}, {formattedTime}
          </span>
        </div>

        {/* Export Button */}
        {showPdfButton && (
          <button 
            id = "exportPdfBtn"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              isPDFExporting || !rows?.length
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-900 hover:shadow-md active:scale-95'
              }`}
              disabled={isPDFExporting || !rows?.length}
              onClick={handlePDFExport}
            >
              {isPDFExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  Exporting PDF...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </>
              )}
            </button>
          )}
        <button 
          id = "exportExcelBtn"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            isExporting || !rows?.length
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-black text-white hover:bg-gray-900 hover:shadow-md active:scale-95'
          }`}
          disabled={isExporting || !rows?.length}
          onClick={() => handleExcelExport(report, rows, columns, currentUrl, summary)}
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </>
          )}
        </button>
      </div>
    </div>
  );
};

ReportTitleSection.propTypes = {
  report: PropTypes.shape({
    title: PropTypes.string.isRequired,
    desc: PropTypes.string,
    color: PropTypes.string,
  }).isRequired,
  rows: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  summary: PropTypes.object,
  dataGridRef: PropTypes.object,
  showPdfButton: PropTypes.bool,
  handlePDFExport: PropTypes.func,
  isPDFExporting: PropTypes.bool,
};

export { ReportTitleSection };
