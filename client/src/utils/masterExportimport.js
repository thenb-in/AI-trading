import { handleExport as renderExcelExport } from './report_export/index.js';
import { handleImport as genericImport } from './export_import_Utils.js';

// Export master data to Excel
const exportMaster = async ({ columns = [], rows = [], fileName = 'master' } = {}) => {
  const report = { slug: fileName };
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  await renderExcelExport(report, rows, columns, currentUrl);
};

// Import master data from Excel/CSV via provided API call
const importMaster = async ({ event, api, setImporting, fetchData, successMessage, acceptedFileTypes }) => {
  if (!event || typeof api !== 'function') return;
  await genericImport({
    event,
    apiCall: api,
    fetchData,
    setImporting: typeof setImporting === 'function' ? setImporting : () => {},
    successMessage: successMessage || 'Imported successfully',
    acceptedFileTypes: acceptedFileTypes || '.csv,.xlsx,.xls'
  });
};

export { exportMaster, importMaster };