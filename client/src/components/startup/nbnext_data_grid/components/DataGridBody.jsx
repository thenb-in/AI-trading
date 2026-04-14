import PropTypes from "prop-types";
import { cellBaseStyle, getRowStyle, getCellBackgroundColor, totalRowStyle } from "../utils/styles.js";
import { renderCellContent, getKeyForRow, getColumnWidthWithIcons, calculateTotals, getColumnForFormatting } from "../utils/helpers.js";
import { convertCellToText } from "../../base_report/ReportUtils.js";

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
  // Virtual scrolling props
  virtualScrolling = false,
  offsetY = 0,
  totalHeight = 0,
  startIndex = 0,
  // Total row props
  showTotalRow = false,
  allRows = [],
  allColumns = [],
  // Row color props
  evenRowColor = "#ffffff",
  oddRowColor = "#eff6ff",
}) {
  const baseCellStyle = cellBaseStyle(rowHeight);

  // Only show total row if there's more than 1 row
  const shouldShowTotalRow = showTotalRow && allRows.length > 1;

  // Calculate totals if total row is enabled
  const totals = shouldShowTotalRow && allRows.length > 0 
    ? calculateTotals(allRows.map(w => w._row || w), allColumns)
    : {};

  const setOffsetHeight = (el) => {
    if (el) {
      el.style.height = `${offsetY}px`;
    }
  };

  const setTotalHeight = (el) => {
    if (el) {
      const totalRowHeight = shouldShowTotalRow ? rowHeight : 0;
      el.style.height = `${Math.max(0, totalHeight - offsetY - (pagedRows.length * rowHeight) - totalRowHeight)}px`;
    }
  };

  // Render total row cell content
  const renderTotalCell = (col) => {
    const totalValue = totals[col.field];
    if (totalValue !== undefined && totalValue !== null) {
      // Format the total value similar to regular cells
      const formatted = convertCellToText(getColumnForFormatting(col), totalValue);
      return formatted != null ? String(formatted) : '';
    }
    // For non-numeric columns, show empty or "Total" label for first column
    if (col === frozenColumns[0] || col === nonFrozenColumns[0]) {
      return 'Total';
    }
    return '';
  };

  const renderGroupTotalCell = (col, row) => {
    const groupTotals = row?._groupTotals || {};
    const totalValue = groupTotals[col.field];
    if (totalValue !== undefined && totalValue !== null) {
      const formatted = convertCellToText(getColumnForFormatting(col), totalValue);
      return formatted != null ? String(formatted) : '';
    }
    if (col === frozenColumns[0] || col === nonFrozenColumns[0]) {
      return row?._groupLabel != null ? String(row._groupLabel) : '';
    }
    return '';
  };

  return (
    <tbody>
      {virtualScrolling && offsetY > 0 && (
        <tr>
          <td 
            className="p-0 border-none" 
            ref={setOffsetHeight}
            colSpan={frozenColumns.length + nonFrozenColumns.length} 
          />
        </tr>
      )}
      {pagedRows.map((wrapped, idx) => {
        const row = wrapped._row;
        const key = getKeyForRow(row, wrapped._origIndex, getRowIdFunc);
        const isGroupTotal = row?._isGroupTotal === true;
        // Use current display index for alternating colors (not original index)
        // This ensures alternating colors work correctly after filtering/sorting/grouping
        const displayIndex = virtualScrolling ? startIndex + idx : idx;
        const isEven = displayIndex % 2 === 0;
        const isSelected = key === selectedRowId;
        const isHovered = key === hoveredRowId;
        const isDisabled = row._isDisabled === true || isGroupTotal === true;

        const rowStyle = {
          ...getRowStyle(isEven, isSelected, isHovered, evenRowColor, oddRowColor),
          ...(isGroupTotal && {
            background: "#f3f4f6",
            fontWeight: 600,
            cursor: "default",
            transform: undefined,
            boxShadow: undefined,
          }),
          ...(isDisabled && {
            opacity: 0.5,
            pointerEvents: 'none',
            cursor: 'not-allowed',
            backgroundColor: '#f3f4f6'
          })
        };

        // Extract event handlers to avoid inline arrow functions
        const handleMouseEnter = () => {
          if (!isDisabled) {
            handleRowHover(key);
          }
        };

        const handleMouseLeave = () => {
          if (!isDisabled) {
            handleRowLeave(key);
          }
        };

        const handleClick = () => {
          if (!isDisabled) {
            handleRowClick(key, row);
          }
        };

        return (
          <tr
            key={key}
            ref={idx === 0 ? firstRowRef : null}
            style={rowStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            className={isDisabled ? 'data-grid-row-disabled' : ''}
          >
            {frozenColumns.map((col) => {
              const left = cumulativeFrozenLeftOffsets[col.field] || 0;
              const cellBg = isGroupTotal ? "#f3f4f6" : getCellBackgroundColor(isEven, isSelected, isHovered, evenRowColor, oddRowColor);
              const totalWidth = columnWidths[col.field] || getColumnWidthWithIcons(col);
              
              const setCellStyles = (element) => {
                if (element) {
                  Object.assign(element.style, baseCellStyle);
                  element.style.setProperty('--cell-left', `${left}px`);
                  element.style.setProperty('--cell-width', `${totalWidth}px`);
                  element.style.setProperty('--cell-bg', cellBg);
                  if (isGroupTotal) {
                    element.style.fontWeight = '600';
                    element.style.color = '#1f2937';
                  }
                }
              };
              
              return (
                <td
                  key={col.field}
                  ref={setCellStyles}
                  className="data-grid-cell-frozen"
                  title={isGroupTotal ? renderGroupTotalCell(col, row) : renderCellContent(col, row)}
                >
                  {isGroupTotal ? renderGroupTotalCell(col, row) : renderCellContent(col, row)}
                </td>
              );
            })}
            {nonFrozenColumns.map((col) => {
              const cellBg = isGroupTotal ? "#f3f4f6" : getCellBackgroundColor(isEven, isSelected, isHovered, evenRowColor, oddRowColor);
              const totalWidth = columnWidths[col.field] || getColumnWidthWithIcons(col);
              
              const setCellStyles = (element) => {
                if (element) {
                  Object.assign(element.style, baseCellStyle);
                  element.style.setProperty('--cell-width', `${totalWidth}px`);
                  element.style.setProperty('--cell-bg', cellBg);
                  if (isGroupTotal) {
                    element.style.fontWeight = '600';
                    element.style.color = '#1f2937';
                  }
                }
              };
              
              return (
                <td
                  key={col.field}
                  ref={setCellStyles}
                  className="data-grid-cell"
                  // title={renderCellContent(col, row)}
                >
                  {isGroupTotal ? renderGroupTotalCell(col, row) : renderCellContent(col, row)}
                </td>
              );
            })}
          </tr>
        );
      })}
      {virtualScrolling && totalHeight > 0 && (
        <tr>
          <td 
            className="p-0 border-none"
            ref={setTotalHeight}
            colSpan={frozenColumns.length + nonFrozenColumns.length} 
          />
        </tr>
      )}
      {shouldShowTotalRow && (
        <tr style={totalRowStyle}>
          {frozenColumns.map((col) => {
            const left = cumulativeFrozenLeftOffsets[col.field] || 0;
            const totalWidth = columnWidths[col.field] || getColumnWidthWithIcons(col);
            
            const setCellStyles = (element) => {
              if (element) {
                Object.assign(element.style, baseCellStyle);
                element.style.setProperty('--cell-left', `${left}px`);
                element.style.setProperty('--cell-width', `${totalWidth}px`);
                element.style.setProperty('--cell-bg', '#f3f4f6');
                element.style.fontWeight = '600';
                element.style.color = '#1f2937';
              }
            };
            
            return (
              <td
                key={`total-${col.field}`}
                ref={setCellStyles}
                className="data-grid-cell-frozen"
              >
                {renderTotalCell(col)}
              </td>
            );
          })}
          {nonFrozenColumns.map((col) => {
            const totalWidth = columnWidths[col.field] || getColumnWidthWithIcons(col);
            
            const setCellStyles = (element) => {
              if (element) {
                Object.assign(element.style, baseCellStyle);
                element.style.setProperty('--cell-width', `${totalWidth}px`);
                element.style.setProperty('--cell-bg', '#f3f4f6');
                element.style.fontWeight = '600';
                element.style.color = '#1f2937';
              }
            };
            
            return (
              <td
                key={`total-${col.field}`}
                ref={setCellStyles}
                className="data-grid-cell"
              >
                {renderTotalCell(col)}
              </td>
            );
          })}
        </tr>
      )}
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
  virtualScrolling: PropTypes.bool,
  offsetY: PropTypes.number,
  totalHeight: PropTypes.number,
  startIndex: PropTypes.number,
  showTotalRow: PropTypes.bool,
  allRows: PropTypes.array,
  allColumns: PropTypes.array,
  evenRowColor: PropTypes.string,
  oddRowColor: PropTypes.string,
};

export { DataGridBody };

