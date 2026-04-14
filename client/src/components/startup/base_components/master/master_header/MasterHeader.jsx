import { ArrowLeft, Plus, RefreshCw, Download, Upload, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { hasPermission } from "@utils/startup/hasPermission";
import { exportMaster, importMaster } from "@utils/masterExportimport.js";
import { FileTypeField } from '@base_components/fields/FileTypeField';

const MasterHeader = forwardRef(({
  title,
  description,
  onAdd,
  onRefresh,
  userData,
  permissionKey,
  showRefresh = true,
  showBack = true,
  backUrl = "/admin/master",
  addButtonText = "Add",
  refreshButtonText = "Refresh",
  // Export/Import props
  showExport = false,
  showImport = false,
  exportColumns = [],
  exportRows = [],
  exportFileName,
  importApi,
  onExport, // Custom export function
  onImport, // Custom import function
  exportButtonText = "Export",
  importButtonText = "Import",
  onDownloadTemplate,
  templateButtonText = "Template",
  headerDisabled = false
}, ref) => {
  const navigate = useNavigate();
  const importInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);

  useImperativeHandle(ref, () => ({
    clickImportInput: () => {
      if (onImport) onImport();
      else importInputRef.current?.click();
    },
    clickDownloadTemplate: () => onDownloadTemplate?.()
  }), [onImport, onDownloadTemplate]);
  
  const onExportClick = () => {
    if (onExport) {
      // Use custom export function if provided
      onExport();
    } else if (exportColumns?.length || exportRows?.length) {
      // Use generic export function
      exportMaster({ columns: exportColumns, rows: exportRows, fileName: exportFileName || title });
    }
  };

  const onImportClick = () => {
    if (onImport) {
      // Use custom import function if provided
      onImport();
    } else if (importInputRef.current) {
      // Use generic import function
      importInputRef.current.click();
    }
  };

  const onImportChange = async (e) => {
    if (!importApi) return;
    await importMaster({ event: e, api: importApi, setImporting: setIsImporting });
  };
 
  return (
    <div className="bg-white text-gray-800 p-4 sm:p-6 mb-4 sm:mb-6 rounded-lg shadow-md flex flex-col md:flex-row items-start md:items-center justify-between border border-gray-100">
      {/* Left: Back Button + Title */}
      <div className="flex items-center gap-4 mb-4 md:mb-0">
        {showBack && (
          <>
            <button
              onClick={() => navigate(backUrl)}
              className="hover:bg-gray-100 p-2 rounded-full transition duration-200"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
          </>
        )}
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{title}</h1>
          {description && (
            <p className="text-sm text-gray-600 font-medium mt-1">{description}</p>
          )}
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        {showRefresh && onRefresh && (
          <button
            onClick={onRefresh}
            disabled={headerDisabled}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {refreshButtonText}
          </button>
        )}
        {showExport && (
          <button
            onClick={onExportClick}
            disabled={headerDisabled}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportButtonText}
          </button>
        )}
        {showImport && (
          <>
            <FileTypeField
              id="master-import-file"
              name="masterImportFile"
              inputRef={importInputRef}
              accept=".csv,.xlsx,.xls"
              onChange={onImportChange}
              fileChangeMode="native"
              containerClassName="hidden"
              className=""
              label=""
              showClearButton={false}
              icon={<span className="hidden" />}
            />
            <button
              onClick={onImportClick}
              disabled={isImporting}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {importButtonText}
                </>
              )}
            </button>
          </>
        )}
        {onDownloadTemplate && (
          <button
            type="button"
            onClick={onDownloadTemplate}
            disabled={headerDisabled}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            title="Download Import Template"
          >
            <FileText className="h-4 w-4 mr-2" />
            {templateButtonText}
          </button>
        )}
        {onAdd && (!permissionKey || hasPermission(userData, permissionKey)) && (
          <button
            onClick={onAdd}
            disabled={headerDisabled}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {addButtonText}
          </button>
        )}
      </div>
    </div>
  );
});

MasterHeader.displayName = 'MasterHeader';

MasterHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  onAdd: PropTypes.func,
  onRefresh: PropTypes.func,
  userData: PropTypes.object,
  permissionKey: PropTypes.string,
  showRefresh: PropTypes.bool,
  showBack: PropTypes.bool,
  backUrl: PropTypes.string,
  addButtonText: PropTypes.string,
  refreshButtonText: PropTypes.string,
  showExport: PropTypes.bool,
  showImport: PropTypes.bool,
  exportColumns: PropTypes.array,
  exportRows: PropTypes.array,
  exportFileName: PropTypes.string,
  importApi: PropTypes.func,
  onExport: PropTypes.func,
  onImport: PropTypes.func,
  exportButtonText: PropTypes.string,
  importButtonText: PropTypes.string,
  onDownloadTemplate: PropTypes.func,
  templateButtonText: PropTypes.string,
  headerDisabled: PropTypes.bool
};

export { MasterHeader };

