import PropTypes from "prop-types";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BTN_CLASS =
  "inline-flex items-center justify-center h-8 w-8 shrink-0 text-slate-700 rounded-md border border-slate-200 bg-white transition-colors hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

function PaginationControls({ page, totalPages, autoPageSize, goToPrevPage, goToNextPage, fullScreen = false, totalRows = 0 }) {
  if (fullScreen) {
    return (
      <div className="flex items-center h-8 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700">
        All {totalRows} rows
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600 shrink-0">Rows/page: {autoPageSize}</span>
      <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
        <button
          type="button"
          onClick={goToPrevPage}
          disabled={page <= 0}
          className={BTN_CLASS}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <span className="min-w-[4rem] py-1 text-center text-sm font-medium text-slate-700 tabular-nums">
          {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          onClick={goToNextPage}
          disabled={page >= totalPages - 1}
          className={BTN_CLASS}
          aria-label="Next page"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

PaginationControls.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  autoPageSize: PropTypes.number.isRequired,
  goToPrevPage: PropTypes.func.isRequired,
  goToNextPage: PropTypes.func.isRequired,
  fullScreen: PropTypes.bool,
  totalRows: PropTypes.number,
};

export { PaginationControls };
