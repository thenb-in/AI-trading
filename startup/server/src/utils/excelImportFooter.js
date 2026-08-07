const { getCellText } = require('./excelCellValue');

const cellText = (row, colNumber) => getCellText(row.getCell(colNumber).value);

/** Skip rows produced by excelRenderer.addFooterInfo (Report / Date / Filters in cols A–C). */
const isExportFooterRow = (row) => {
  const col1 = cellText(row, 1);
  const col2 = cellText(row, 2);
  const col3 = cellText(row, 3);
  return col1.includes('Report:') && col2.includes('Date:') && col3.includes('Filters:');
};

module.exports = { isExportFooterRow };
