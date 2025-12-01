import PropTypes from "prop-types";

function PaginationControls({ page, totalPages, autoPageSize, goToPrevPage, goToNextPage }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600">
        Rows/page (auto): {autoPageSize}
      </span>
      <button
        type="button"
        onClick={goToPrevPage}
        disabled={page <= 0}
        className={`px-2.5 py-1.5 rounded-md border border-gray-300 bg-white ${
          page <= 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
        }`}
      >
        Prev
      </button>
      <span className="text-xs">
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        onClick={goToNextPage}
        disabled={page >= totalPages - 1}
        className={`px-2.5 py-1.5 rounded-md border border-gray-300 bg-white ${
          page >= totalPages - 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
        }`}
      >
        Next
      </button>
    </div>
  );
}

PaginationControls.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  autoPageSize: PropTypes.number.isRequired,
  goToPrevPage: PropTypes.func.isRequired,
  goToNextPage: PropTypes.func.isRequired,
};

export { PaginationControls };

