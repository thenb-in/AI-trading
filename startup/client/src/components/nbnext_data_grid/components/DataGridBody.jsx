import PropTypes from "prop-types";
import {
  cellBaseStyle,
  getRowStyle,
  getCellBackgroundColor,
  totalRowStyle,
  SECTION_HEADER_CELL_BACKGROUND,
  sectionHeaderCellStyle,
  ALERT_ROW_CELL_BACKGROUND,
  ALERT_ROW_ACCENT
} from "../utils/styles.js";
import { renderCellContent, getKeyForRow, fallbackColumnWidth, calculateTotals, getColumnForFormatting } from "../utils/helpers.js";
import { convertCellToText } from "../../base_report/ReportUtils.js";

function DataGridBody({
  firstRowRef,
  pagedRows,
  frozenColumns,
  nonFrozenColumns,
  cumulativeFrozenLeftOffsets,
  selectedRowId = null,
  handleRowClick,
  handleRowHover,
  handleRowLeave,
  rowHeight,
  autoHeight = false,
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
  selection = null,
  isSectionHeaderRow = null,
  sectionHeaderRuleOnly = false,
  isAlertRow = null,
  density = "comfortable",
}) {
  const baseCellStyle = cellBaseStyle(rowHeight, autoHeight, density);
  const selectionEnabled = Boolean(selection?.enabled);
  const selectionWidth = selectionEnabled ? selection.columnWidth || 40 : 0;
  const totalColSpan = frozenColumns.length + nonFrozenColumns.length + (selectionEnabled ? 1 : 0);

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

  const sectionBandByIndex = [];
  if (typeof isSectionHeaderRow === "function") {
    let band = -1;
    pagedRows.forEach((wrapped, index) => {
      const row = wrapped._row;
      if (row?._isGroupTotal !== true && isSectionHeaderRow(row)) {
        band += 1;
      }
      sectionBandByIndex[index] = band;
    });
  }

  return (
    <tbody>
      {virtualScrolling && offsetY > 0 && (
        <tr>
          <td 
            className="p-0 border-none" 
            ref={setOffsetHeight}
            colSpan={totalColSpan}
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
        const band = sectionBandByIndex[idx];
        const isEven = band === undefined || band < 0
          ? displayIndex % 2 === 0
          : band % 2 === 0;
        const isSelected = key === selectedRowId;
        const isDisabled = row._isDisabled === true || isGroupTotal === true;
        // The row that opens a section (one employee's set of rows, say) is drawn as
        // its header: a rule above it and a tint, so the section's extent is obvious.
        const isSectionHeader = !isGroupTotal && typeof isSectionHeaderRow === "function" && isSectionHeaderRow(row);
        // Caller-flagged problem row (duplicate entry, failed record …): tinted red.
        const isAlert = !isGroupTotal && typeof isAlertRow === "function" && isAlertRow(row);

        const rowStyle = {
          ...getRowStyle(isEven, isSelected),
          ...(isAlert && !isSelected && {
            background: ALERT_ROW_CELL_BACKGROUND,
            boxShadow: `inset 3px 0 0 0 ${ALERT_ROW_ACCENT}`,
          }),
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

        const isRowSelected = selectionEnabled ? selection.isSelected(key) : false;

        const handleSelectionChange = (e) => {
          e.stopPropagation();
          if (!isDisabled && typeof selection?.onToggleRow === "function") {
            selection.onToggleRow(key);
          }
        };

        const stopPropagation = (e) => e.stopPropagation();

        const renderDataCell = (col, frozen) => {
          const content = isGroupTotal ? renderGroupTotalCell(col, row) : renderCellContent(col, row);
          const width = columnWidths[col.field] || fallbackColumnWidth(col);
          let cellBg = isGroupTotal ? "#f3f4f6" : getCellBackgroundColor(isEven, isSelected);
          if (isSectionHeader && !isSelected && !sectionHeaderRuleOnly) {
            cellBg = SECTION_HEADER_CELL_BACKGROUND;
          }
          if (isAlert && !isSelected) {
            cellBg = ALERT_ROW_CELL_BACKGROUND;
          }

          const setCellStyles = (element) => {
            if (!element) {
              return;
            }
            Object.assign(element.style, baseCellStyle);
            if (frozen) {
              const left = (cumulativeFrozenLeftOffsets[col.field] || 0) + selectionWidth;
              element.style.setProperty('--cell-left', `${left}px`);
            }
            element.style.setProperty('--cell-width', `${width}px`);
            element.style.setProperty('--cell-bg', cellBg);
            if (isSectionHeader) {
              element.style.borderTop = sectionHeaderCellStyle.borderTop;
              if (!sectionHeaderRuleOnly) {
                Object.assign(element.style, sectionHeaderCellStyle);
              }
            }
            if (isGroupTotal) {
              element.style.fontWeight = '600';
              element.style.color = '#1f2937';
            }
          };

          return (
            <td
              key={col.field}
              ref={setCellStyles}
              className={frozen ? "data-grid-cell-frozen" : "data-grid-cell"}
              title={frozen ? content : undefined}
            >
              {content}
            </td>
          );
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
            {selectionEnabled && (() => {
              const cellBg = isGroupTotal ? "#f3f4f6" : getCellBackgroundColor(isEven, isSelected);
              const setSelectionCellStyles = (element) => {
                if (element) {
                  Object.assign(element.style, baseCellStyle);
                  element.style.setProperty('--cell-left', `0px`);
                  element.style.setProperty('--cell-width', `${selectionWidth}px`);
                  element.style.setProperty('--cell-bg', cellBg);
                  element.style.padding = '0';
                  element.style.textAlign = 'center';
                }
              };
              return (
                <td
                  key="__selection__"
                  ref={setSelectionCellStyles}
                  className="data-grid-cell-frozen"
                  onClick={stopPropagation}
                >
                  {!isGroupTotal && (
                    <input
                      type="checkbox"
                      checked={isRowSelected}
                      onChange={handleSelectionChange}
                      onClick={stopPropagation}
                      disabled={isDisabled}
                      aria-label="Select row"
                      className="cursor-pointer"
                    />
                  )}
                </td>
              );
            })()}
            {frozenColumns.map((col) => renderDataCell(col, true))}
            {nonFrozenColumns.map((col) => renderDataCell(col, false))}
          </tr>
        );
      })}
      {virtualScrolling && totalHeight > 0 && (
        <tr>
          <td 
            className="p-0 border-none"
            ref={setTotalHeight}
            colSpan={totalColSpan}
          />
        </tr>
      )}
      {shouldShowTotalRow && (
        <tr style={totalRowStyle}>
          {selectionEnabled && (() => {
            const setSelectionTotalStyles = (element) => {
              if (element) {
                Object.assign(element.style, baseCellStyle);
                element.style.setProperty('--cell-left', `0px`);
                element.style.setProperty('--cell-width', `${selectionWidth}px`);
                element.style.setProperty('--cell-bg', '#f3f4f6');
                element.style.padding = '0';
              }
            };
            return (
              <td
                key="total-__selection__"
                ref={setSelectionTotalStyles}
                className="data-grid-cell-frozen"
              />
            );
          })()}
          {frozenColumns.map((col) => {
            const left = (cumulativeFrozenLeftOffsets[col.field] || 0) + selectionWidth;
            const totalWidth = columnWidths[col.field] || fallbackColumnWidth(col);
            
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
            const totalWidth = columnWidths[col.field] || fallbackColumnWidth(col);
            
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
  handleRowClick: PropTypes.func.isRequired,
  handleRowHover: PropTypes.func.isRequired,
  handleRowLeave: PropTypes.func.isRequired,
  rowHeight: PropTypes.number.isRequired,
  autoHeight: PropTypes.bool,
  getRowIdFunc: PropTypes.func,
  virtualScrolling: PropTypes.bool,
  offsetY: PropTypes.number,
  totalHeight: PropTypes.number,
  startIndex: PropTypes.number,
  showTotalRow: PropTypes.bool,
  allRows: PropTypes.array,
  allColumns: PropTypes.array,
  selection: PropTypes.shape({
    enabled: PropTypes.bool,
    columnWidth: PropTypes.number,
    isSelected: PropTypes.func,
    onToggleRow: PropTypes.func,
  }),
  isSectionHeaderRow: PropTypes.func,
  sectionHeaderRuleOnly: PropTypes.bool,
  isAlertRow: PropTypes.func,
  density: PropTypes.oneOf(["compact", "standard", "comfortable"]),
};

export { DataGridBody };

