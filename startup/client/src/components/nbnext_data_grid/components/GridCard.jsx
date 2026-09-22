import PropTypes from "prop-types";
import { renderCellContent } from "../utils/helpers.js";

/**
 * One row drawn as a card: the first visible column as its heading, the rest as
 * label/value lines under it. Both card layouts draw their rows with this — the
 * card grid and the kanban board — so a row looks the same wherever it is read.
 */
function GridCard({
  row,
  rowId,
  titleColumn,
  detailColumns,
  isSelected = false,
  isAlert = false,
  handleRowClick = null,
}) {
  const isClickable = typeof handleRowClick === "function";

  const onCardClick = isClickable
    ? (e) => handleRowClick(rowId, row, e)
    : undefined;

  const onCardKeyDown = !isClickable
    ? undefined
    : (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleRowClick(rowId, row, e);
        }
      };

  const titleContent = renderCellContent(titleColumn, row);

  const surfaceClass = isSelected
    ? "border-[var(--grid-row-selected-accent)] ring-2 ring-[var(--grid-row-selected-accent)] ring-opacity-30 bg-[var(--grid-row-selected)]"
    : isAlert
      ? "border-red-200 bg-red-50 ring-1 ring-red-100"
      : "border-gray-200 bg-white";
  const hoverBorder = isClickable && !isAlert ? " hover:border-gray-300" : "";
  const hoverClass = isClickable ? `cursor-pointer hover:shadow-md${hoverBorder}` : "";

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
      className={`rounded-lg border shadow-sm transition-colors ${hoverClass} ${surfaceClass}`}
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
}

GridCard.propTypes = {
  row: PropTypes.object.isRequired,
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  titleColumn: PropTypes.object.isRequired,
  detailColumns: PropTypes.array.isRequired,
  isSelected: PropTypes.bool,
  isAlert: PropTypes.bool,
  handleRowClick: PropTypes.func,
};

export { GridCard };
