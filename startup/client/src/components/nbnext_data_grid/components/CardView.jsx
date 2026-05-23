import PropTypes from "prop-types";
import { renderCellContent, getKeyForRow } from "../utils/helpers.js";

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
}) {
  if (!rows?.length || !columns?.length) return null;

  const [titleColumn, ...detailColumns] = columns;

  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {rows.map((wrappedRow, index) => {
        const row = wrappedRow?._row || wrappedRow;
        const rowId = getKeyForRow(wrappedRow, getRowIdFunc, index);
        const isSelected = selectedRowId != null && selectedRowId === rowId;
        const isClickable = typeof handleRowClick === "function";

        const onCardClick = isClickable
          ? () => handleRowClick(rowId, row)
          : undefined;

        const onCardKeyDown = !isClickable
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleRowClick(rowId, row);
              }
            };

        const titleContent = renderCellContent(titleColumn, row);

        return (
          <div
            key={rowId ?? index}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={onCardClick}
            onKeyDown={onCardKeyDown}
            className={`rounded-lg border shadow-sm transition-colors ${
              isClickable ? "cursor-pointer hover:shadow-md hover:border-gray-300" : ""
            } ${
              isSelected
                ? "border-[var(--grid-row-selected-accent)] ring-2 ring-[var(--grid-row-selected-accent)] ring-opacity-30"
                : "border-gray-200"
            } ${isSelected ? "bg-[var(--grid-row-selected)]" : "bg-white"}`}
          >
            <div
              className="px-4 py-3 border-b text-sm font-semibold text-white truncate bg-[var(--grid-header-bg)]"
              title={typeof titleContent === "string" ? titleContent : titleColumn.headerName}
            >
              {titleContent || titleColumn.headerName || "—"}
            </div>
            <dl className="px-4 py-3 space-y-2">
              {detailColumns.map((col) => {
                const value = renderCellContent(col, row);
                const isEmpty = value == null || value === "";
                return (
                  <div
                    key={col.field}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <dt className="text-gray-500 flex-shrink-0">
                      {col.headerName || col.field}
                    </dt>
                    <dd className="text-gray-900 text-right min-w-0 break-words">
                      {isEmpty ? <span className="text-gray-400">—</span> : value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
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
};

export { CardView };
