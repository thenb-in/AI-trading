import PropTypes from "prop-types";
import { getKeyForRow } from "../utils/helpers.js";
import { GridCard } from "./GridCard.jsx";

/**
 * Card layout for the grid. Same row data as the table — just rendered as a
 * vertical stack of cards instead of <tr>s. First visible column becomes the
 * card title; the rest render as label:value rows below it.
 *
 * Sorting, filtering, pagination, and row-click handling stay in the parent
 * grid; this component only renders the already-prepared `rows` + `columns`.
 */
function CardView({
  rows,
  columns,
  selectedRowId = null,
  handleRowClick,
  getRowIdFunc = null,
  isAlertRow = null,
}) {
  if (!rows?.length || !columns?.length) return null;

  const [titleColumn, ...detailColumns] = columns;

  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {rows.map((wrappedRow, index) => {
        const row = wrappedRow?._row || wrappedRow;
        const rowId = getKeyForRow(wrappedRow, getRowIdFunc, index);
        return (
          <GridCard
            key={rowId ?? index}
            row={row}
            rowId={rowId}
            titleColumn={titleColumn}
            detailColumns={detailColumns}
            isSelected={selectedRowId != null && selectedRowId === rowId}
            isAlert={typeof isAlertRow === "function" && isAlertRow(row)}
            handleRowClick={handleRowClick}
          />
        );
      })}
    </div>
  );
}

CardView.propTypes = {
  rows: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  selectedRowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleRowClick: PropTypes.func,
  getRowIdFunc: PropTypes.func,
  isAlertRow: PropTypes.func,
};

export { CardView };
