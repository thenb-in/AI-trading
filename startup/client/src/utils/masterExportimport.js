import ExcelJS from 'exceljs';
import { handleImport as genericImport } from './export_import_Utils.js';

// Export master data to Excel
const exportMaster = async ({ columns = [], rows = [], fileName = 'master' } = {}) => {
  if (!rows || rows.length === 0) {
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Data');

  sheet.columns = columns.map(col => ({
    header: col.display_name || col.label || col.key,
    key: col.key,
    width: 20
  }));

  rows.forEach(row => {
    const rowData = {};
    columns.forEach(col => {
      rowData[col.key] = row[col.key] ?? '';
    });
    sheet.addRow(rowData);
  });

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
