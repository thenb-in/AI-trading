import PropTypes from "prop-types";
import { cellBaseStyle, getRowStyle, getCellBackgroundColor } from "../utils/styles.js";
import { renderCellContent, getKeyForRow, getColumnWidthWithIcons } from "../utils/helpers.js";

function DataGridBody({
  firstRowRef,
  pagedRows,
  frozenColumns,
  nonFrozenColumns,
  cumulativeFrozenLeftOffsets,
  selectedRowId = null,
  hoveredRowId = null,
  handleRowClick,
  handleRowHover,
  handleRowLeave,
  rowHeight,
  getRowIdFunc = null,
  columnWidths = {},
}) {
  const baseCellStyle = cellBaseStyle(rowHeight);

  return (
    <tbody>
      {pagedRows.map((wrapped, idx) => {
        const row = wrapped._row;
        const key = getKeyForRow(row, wrapped._origIndex, getRowIdFunc);
        const isEven = idx % 2 === 0;
        const isSelected = key === selectedRowId;
        const isHovered = key === hoveredRowId;

        const rowStyle = getRowStyle(isEven, isSelected, isHovered);

        return (
          <tr
            key={key}
            ref={idx === 0 ? firstRowRef : null}
            style={rowStyle}
            onMouseEnter={() => handleRowHover(key)}
            onMouseLeave={() => handleRowLeave(key)}
            onClick={() => handleRowClick(key, row)}
          >
            {frozenColumns.map((col) => {
              const left = cumulativeFrozenLeftOffsets[col.field] || 0;
              const cellBg = getCellBackgroundColor(isEven, isSelected, isHovered);
              const totalWidth = columnWidths[col.field] || getColumnWidthWithIcons(col);
              
              const setCellStyles = (element) => {
                if (element) {
                  Object.assign(element.style, baseCellStyle);
                  element.style.setProperty('--cell-left', `${left}px`);
                  element.style.setProperty('--cell-width', `${totalWidth}px`);
                  element.style.setProperty('--cell-bg', cellBg);
                }
              };
              
              return (
                <td
                  key={col.field}
                  ref={setCellStyles}
                  className="data-grid-cell-frozen"
                  title={renderCellContent(col, row)}
                >
                  {renderCellContent(col, row)}
                </td>
              );
            })}
            {nonFrozenColumns.map((col) => {
              const cellBg = getCellBackgroundColor(isEven, isSelected, isHovered);
              const totalWidth = columnWidths[col.field] || getColumnWidthWithIcons(col);
              
              const setCellStyles = (element) => {
                if (element) {
                  Object.assign(element.style, baseCellStyle);
                  element.style.setProperty('--cell-width', `${totalWidth}px`);
                  element.style.setProperty('--cell-bg', cellBg);
                }
              };
              
              return (
                <td
                  key={col.field}
                  ref={setCellStyles}
                  className="data-grid-cell"
                  // title={renderCellContent(col, row)}
                >
                  {renderCellContent(col, row)}
                </td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  );
}

DataGridBody.propTypes = {
  columnWidths: PropTypes.object,
  firstRowRef: PropTypes.object.isRequired,
  pagedRows: PropTypes.array.isRequired,
  frozenColumns: PropTypes.array.isRequired,
  nonFrozenColumns: PropTypes.array.isRequired,
  cumulativeFrozenLeftOffsets: PropTypes.object.isRequired,
  selectedRowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hoveredRowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleRowClick: PropTypes.func.isRequired,
  handleRowHover: PropTypes.func.isRequired,
  handleRowLeave: PropTypes.func.isRequired,
  rowHeight: PropTypes.number.isRequired,
  getRowIdFunc: PropTypes.func,
};

export { DataGridBody };

