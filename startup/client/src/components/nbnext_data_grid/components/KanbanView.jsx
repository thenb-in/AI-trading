import PropTypes from "prop-types";
import { getKeyForRow, renderCellContent } from "../utils/helpers.js";
import { GridCard } from "./GridCard.jsx";

const NO_VALUE = "__none__";
const NO_VALUE_LABEL = "Not set";

/**
 * The rows as a board: one lane per value of `field`, each holding that value's
 * rows as cards. It answers "what is where" at a glance — how many are waiting
 * for approval, what is still a draft — which a table can only show by reading
 * down a column.
 *
 * Lanes follow `laneValues` where the screen names the order it thinks in (a
 * workflow's own order of statuses), and otherwise the order the values first
 * appear in the rows. A lane named but empty is still drawn, so an empty stage
 * reads as empty rather than missing, and rows whose value is blank gather in a
 * "Not set" lane at the end.
 *
 * Reading only; moving a card between lanes is a change to the record, which
 * the record's own screen owns.
 */
function KanbanView({
  rows,
  columns,
  field,
  laneValues = null,
  selectedRowId = null,
  handleRowClick,
  getRowIdFunc = null,
  isAlertRow = null,
}) {
  const laneColumn = columns.find((col) => col.field === field);
  if (!rows?.length || !columns?.length || !laneColumn) return null;

  // The lane a row belongs to, and the card columns — the lane's own field is
  // the heading of its lane, so repeating it on every card says nothing.
  const laneOf = (row) => {
    const value = row?.[field];
    return value === null || value === undefined || value === "" ? NO_VALUE : String(value);
  };
  const cardColumns = columns.filter((col) => col.field !== field);
  const [titleColumn, ...detailColumns] = cardColumns.length ? cardColumns : columns;

  const unwrapped = rows.map((wrappedRow, index) => ({
    row: wrappedRow?._row || wrappedRow,
    rowId: getKeyForRow(wrappedRow, getRowIdFunc, index),
  }));

  const named = (laneValues || []).map(String);
  const seen = unwrapped.map(({ row }) => laneOf(row));
  const lanes = [...new Set([...named, ...seen])].sort(
    (a, b) => (a === NO_VALUE) - (b === NO_VALUE),
  );

  return (
    <div className="flex items-start gap-4 overflow-x-auto px-3 py-3 sm:px-4 sm:py-4">
      {lanes.map((lane) => {
        const laneRows = unwrapped.filter(({ row }) => laneOf(row) === lane);
        // The lane's own heading is drawn the way the column draws it, so a
        // status arrives as its badge rather than as its stored spelling.
        const heading = lane === NO_VALUE
          ? NO_VALUE_LABEL
          : renderCellContent(laneColumn, laneRows[0]?.row ?? { [field]: lane }) || lane;

        return (
          <section key={lane} className="flex w-72 flex-shrink-0 flex-col rounded-lg bg-gray-100">
            <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
              <div className="min-w-0 truncate text-sm font-semibold text-gray-800">{heading}</div>
              <span className="flex-shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                {laneRows.length}
              </span>
            </header>

            <div className="flex flex-col gap-3 p-3">
              {laneRows.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Nothing here</p>
              ) : (
                laneRows.map(({ row, rowId }, index) => (
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
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

KanbanView.propTypes = {
  rows: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  /** The column whose value decides a row's lane. */
  field: PropTypes.string.isRequired,
  /** The lanes to draw, in the order the screen thinks in; others follow as they appear. */
  laneValues: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
  selectedRowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleRowClick: PropTypes.func,
  getRowIdFunc: PropTypes.func,
  isAlertRow: PropTypes.func,
};

export { KanbanView };
