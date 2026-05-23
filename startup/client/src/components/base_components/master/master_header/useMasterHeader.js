import { useRef, useState } from 'react';
import { Plus, RefreshCw, Download, Upload, FileText } from 'lucide-react';
import { hasPermission } from '@utils/hasPermission';
import { exportMaster, importMaster } from '@utils/masterExportimport.js';

/**
 * Builds the action callbacks + action arrays consumed by MasterHeader.
 * Keeps the component focused on rendering; this hook owns the wiring
 * between the header's props and the buttons/menu items it renders.
 *
 * Returns:
 *  - `importInputRef`, `isImporting`, `onImportChange` — for the hidden file input
 *  - `secondaryActions` — Refresh / Export / Import / Template (inline buttons on desktop)
 *  - `mobileMenuActions` — secondaryActions + Add (as `primary`) for the kebab menu
 *  - `canAdd` — whether the Add button should render
 */
const useMasterHeader = ({
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
}) => {
  const importInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);

  const onExportClick = () => {
    if (onExport) {
      onExport();
    } else if (exportColumns?.length || exportRows?.length) {
      exportMaster({ columns: exportColumns, rows: exportRows, fileName: exportFileName || title });
    }
  };

  const onImportClick = () => {
    if (onImport) onImport();
    else importInputRef.current?.click();
  };

  const onImportChange = async (e) => {
    if (!importApi) return;
    await importMaster({ event: e, api: importApi, setImporting: setIsImporting });
  };

  const canAdd = onAdd && (!permissionKey || hasPermission(userData, permissionKey));

  const secondaryActions = [
    showRefresh && onRefresh && { icon: RefreshCw, label: refreshButtonText, onClick: onRefresh, disabled: headerDisabled },
    showExport && { icon: Download, label: exportButtonText, onClick: onExportClick, disabled: headerDisabled },
    showImport && {
      icon: isImporting ? RefreshCw : Upload,
      label: isImporting ? 'Importing...' : importButtonText,
      onClick: onImportClick,
      disabled: isImporting,
      spinning: isImporting,
    },
    onDownloadTemplate && { icon: FileText, label: templateButtonText, onClick: onDownloadTemplate, disabled: headerDisabled },
  ].filter(Boolean);

  // Mobile menu includes the Add action too (with primary styling).
  const mobileMenuActions = [
    ...secondaryActions,
    canAdd && { icon: Plus, label: addButtonText, onClick: onAdd, disabled: headerDisabled, primary: true },
  ].filter(Boolean);

  return {
    importInputRef,
    isImporting,
    onImportChange,
    onImportClick,
    canAdd,
    secondaryActions,
    mobileMenuActions,
  };
};

export { useMasterHeader };
