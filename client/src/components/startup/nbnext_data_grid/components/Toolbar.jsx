import PropTypes from "prop-types";
import { useCallback } from "react";
import { PaginationControls } from "./PaginationControls.jsx";

function Toolbar({
  totalRows,
  visibleColumnsCount,
  // showColumnMenu,
  setShowColumnMenu,
  page,
  totalPages,
  autoPageSize,
  goToPrevPage,
  goToNextPage,
}) {
  const handleToggleColumnMenu = useCallback(() => {
    setShowColumnMenu((v) => !v);
  }, [setShowColumnMenu]);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="flex items-center gap-2.5">
        <strong className="text-sm">NbNext DataGrid</strong>
        <span className="text-xs text-gray-600">
          {totalRows} rows • {visibleColumnsCount} columns
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggleColumnMenu}
          className="px-2.5 py-1.5 rounded-md border border-gray-300 bg-white cursor-pointer hover:bg-gray-50"
        >
          Columns
        </button>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          autoPageSize={autoPageSize}
          goToPrevPage={goToPrevPage}
          goToNextPage={goToNextPage}
        />
      </div>
    </div>
  );
}

Toolbar.propTypes = {
  totalRows: PropTypes.number.isRequired,
  visibleColumnsCount: PropTypes.number.isRequired,
  // showColumnMenu: PropTypes.bool.isRequired,
  setShowColumnMenu: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  autoPageSize: PropTypes.number.isRequired,
  goToPrevPage: PropTypes.func.isRequired,
  goToNextPage: PropTypes.func.isRequired,
};

export { Toolbar };

