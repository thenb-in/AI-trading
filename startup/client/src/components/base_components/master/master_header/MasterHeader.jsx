import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { FileTypeField } from '@startup/components/base_components/fields/FileTypeField';
import { KebabMenu } from '@startup/components/base_components/menu/KebabMenu';
import { useMasterHeader } from './useMasterHeader';

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
  const {
    importInputRef,
    onImportChange,
    canAdd,
    secondaryActions,
    mobileMenuActions,
  } = useMasterHeader({
    title,
    onAdd,
    onRefresh,
    userData,
    permissionKey,
    showRefresh,
    showExport,
    showImport,
    exportColumns,
    exportRows,
    exportFileName,
    importApi,
    onExport,
    onImport,
    onDownloadTemplate,
    addButtonText,
    refreshButtonText,
    exportButtonText,
    importButtonText,
    templateButtonText,
    headerDisabled,
  });

  useImperativeHandle(ref, () => ({
    clickImportInput: () => {
      if (onImport) onImport();
      else importInputRef.current?.click();
    },
    clickDownloadTemplate: () => onDownloadTemplate?.()
  }), [onImport, onDownloadTemplate, importInputRef]);
 
  return (
    <div className="bg-white text-gray-800 px-4 py-3 sm:p-6 mb-3 sm:mb-6 rounded-lg shadow-md flex flex-row items-start md:items-center justify-between gap-3 md:gap-6 border border-gray-100">
      {/* Left: Back Button + Title */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {showBack && (
          <>
            <button
              onClick={() => navigate(backUrl)}
              className="flex-shrink-0 hover:bg-gray-100 p-1.5 sm:p-2 rounded-full transition duration-200"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
          </>
        )}
        <div className="flex flex-col min-w-0">
          <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 truncate leading-tight">{title}</h1>
          {description && (
            <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-2">{description}</p>
          )}
        </div>
      </div>

      {/* Hidden import file input (always rendered when import is enabled) */}
      {showImport && (
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
      )}

      {/* Right: Action Buttons */}
      <div className="flex flex-row items-center justify-end gap-2 sm:gap-3 flex-shrink-0">
        {/* Mobile: kebab menu containing ALL actions (including Add) */}
        <KebabMenu actions={mobileMenuActions} className="sm:hidden" />

        {/* Desktop (sm+): inline labeled secondary buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {secondaryActions.map(({ icon: Icon, label, onClick, disabled, spinning }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              disabled={disabled}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors whitespace-nowrap"
            >
              <Icon className={`h-4 w-4 mr-2 flex-shrink-0 ${spinning ? 'animate-spin' : ''}`} />
              {label}
            </button>
          ))}
        </div>

        {/* Primary Add button — desktop only (mobile has it in the menu) */}
        {canAdd && (
          <button
            onClick={onAdd}
            disabled={headerDisabled}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
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

