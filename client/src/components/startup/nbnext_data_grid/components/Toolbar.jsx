import PropTypes from "prop-types";
import { useCallback } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { PaginationControls } from "./PaginationControls.jsx";

function Toolbar({
  totalRows,
  visibleColumnsCount,
  setShowColumnMenu,
  showColumnMenu,
  showLayoutMenu,
  setShowLayoutMenu,
  documentName,
  page,
  totalPages,
  autoPageSize,
  goToPrevPage,
  goToNextPage,
  fullScreen = false,
  onToggleFullScreen = null,
  position = "top",
}) {

  const borderClass = position === "top" ? "border-b" : "border-t";
  const gradientClass = position === "top" ? "bg-gradient-to-b" : "bg-gradient-to-t";

  const toggleColumnMenu = useCallback((v) => !v, []);

  const handleColumnMenuClick = useCallback(() => {
    // Close layout menu if open
    if (showLayoutMenu) {
      setShowLayoutMenu(false);
    }
    // Toggle column menu
    setShowColumnMenu(toggleColumnMenu);
  }, [showLayoutMenu, setShowLayoutMenu, setShowColumnMenu, toggleColumnMenu]);

  const toggleLayoutMenu = useCallback((v) => !v, []);

  const handleLayoutMenuClick = useCallback(() => {
    if (!documentName) {
      alert("Layout functionality requires a documentName prop to be passed to NbNextDataGrid");
      return;
    }
    // Close column menu if open
    if (showColumnMenu) {
      setShowColumnMenu(false);
    }
    // Toggle layout menu
    setShowLayoutMenu(toggleLayoutMenu);
  }, [documentName, showColumnMenu, setShowColumnMenu, setShowLayoutMenu, toggleLayoutMenu]);

  const baseButtonClasses = "px-2.5 py-1.5 rounded-md border border-gray-200";

  return (
    <div className={`flex items-center justify-between px-4 py-3 ${borderClass} border-slate-200 ${gradientClass} from-slate-50 to-slate-100`}>
      <div className="flex items-center gap-2.5">
        <strong className="text-sm">NbNext DataGrid</strong>
        <span className="text-xs text-gray-600">
          {totalRows} rows • {visibleColumnsCount} columns
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleColumnMenuClick}
          className={`${baseButtonClasses} bg-white cursor-pointer`}
        >
          Columns
        </button>
        <button
          type="button"
          onClick={handleLayoutMenuClick}
          className={documentName ? `${baseButtonClasses} bg-white cursor-pointer` : `${baseButtonClasses} bg-gray-100 cursor-not-allowed text-gray-400 opacity-60`}
          title={!documentName ? "Layout functionality requires documentName prop" : "Manage layouts"}
        >
          Layouts
        </button>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          autoPageSize={autoPageSize}
          goToPrevPage={goToPrevPage}
          goToNextPage={goToNextPage}
        />
        {!fullScreen && (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            autoPageSize={autoPageSize}
            goToPrevPage={goToPrevPage}
            goToNextPage={goToNextPage}
          />
        )}
        {onToggleFullScreen && (
          <button
            type="button"
            onClick={onToggleFullScreen}
            className="px-2.5 py-1.5 rounded-md border border-gray-300 bg-white cursor-pointer hover:bg-gray-50 flex items-center gap-1.5"
            title={fullScreen ? "Exit fullscreen" : "Enter fullscreen"}
            aria-label={fullScreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullScreen ? (
              <>
                <Minimize2 size={16} />
                <span className="text-xs">Exit</span>
              </>
            ) : (
              <>
                <Maximize2 size={16} />
                <span className="text-xs">Fullscreen</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

Toolbar.propTypes = {
  totalRows: PropTypes.number.isRequired,
  visibleColumnsCount: PropTypes.number.isRequired,
  setShowColumnMenu: PropTypes.func.isRequired,
  showColumnMenu: PropTypes.bool,
  showLayoutMenu: PropTypes.bool,
  setShowLayoutMenu: PropTypes.func,
  documentName: PropTypes.string, // Required for layout functionality
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  autoPageSize: PropTypes.number.isRequired,
  goToPrevPage: PropTypes.func.isRequired,
  goToNextPage: PropTypes.func.isRequired,
  fullScreen: PropTypes.bool,
  onToggleFullScreen: PropTypes.func,
  position: PropTypes.oneOf(["top", "bottom"]),
};

export { Toolbar };

