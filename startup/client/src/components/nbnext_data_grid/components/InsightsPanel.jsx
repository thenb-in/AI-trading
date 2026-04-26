import PropTypes from "prop-types";
import { Summary } from "./Summary.jsx";
import { ConstantColumnsSummary } from "./ConstantColumnsSummary.jsx";

// Content-only panel: renders the Summary + ConstantColumnsSummary blocks
// when there's anything to show. Collapse state is owned by the parent grid
// (see useInsightsCollapse + GridTabs for the toggle UI).
function InsightsPanel({
  summary = null,
  columns = [],
  constantColumns = null,
  showCommonValues = true,
}) {
  const shouldShowSummary = summary && Object.keys(summary).length > 0;
  const shouldShowCommonValues =
    showCommonValues && constantColumns && constantColumns.size > 0;

  if (!shouldShowSummary && !shouldShowCommonValues) {
    return null;
  }

  return (
    <div className="mb-3 space-y-1">
      {shouldShowSummary && (
        <Summary summary={summary} columns={columns} compact={true} />
      )}
      {shouldShowCommonValues && (
        <ConstantColumnsSummary constantColumns={constantColumns} compact={true} />
      )}
    </div>
  );
}

InsightsPanel.propTypes = {
  summary: PropTypes.object,
  columns: PropTypes.array,
  constantColumns: PropTypes.instanceOf(Map),
  showCommonValues: PropTypes.bool,
};

export { InsightsPanel };
