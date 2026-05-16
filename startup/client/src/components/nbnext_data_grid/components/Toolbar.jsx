import PropTypes from "prop-types";
import { useCallback, useMemo } from "react";
import { Maximize2, Minimize2, LayoutGrid, SlidersHorizontal, FilterX } from "lucide-react";
import { toast } from "react-toastify";
import { PaginationControls } from "./PaginationControls.jsx";
import { ToolbarExportButtons } from "./ToolbarExportButtons.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";
import {
  TOOLBAR_BTN_CLASS,
  TOOLBAR_DIVIDER_CLASS,
  TOOLBAR_HIGHLIGHT_BTN_CLASS,
} from "../utils/toolbarStyles.js";

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
  showExcelExport = false,
  onExcelExport,
  isExcelExporting = false,
  hasData = true,
  getExportPayload = null,
  renderToolbarExtras = null,
  hasActiveFilters = false,
  onClearFilters = null,
  hidePagination = false,
  themeLabel = null,
  onCycleTheme = null,
}) {
  const isTop = position === "top";
  const showThemeToggle = !isTop && themeLabel && typeof onCycleTheme === "function";

  const toggleColumnMenu = useCallback((v) => !v, []);

  const handleColumnMenuClick = useCallback(() => {
    if (showLayoutMenu) setShowLayoutMenu(false);
    setShowColumnMenu(toggleColumnMenu);
  }, [showLayoutMenu, setShowLayoutMenu, setShowColumnMenu, toggleColumnMenu]);

  const toggleLayoutMenu = useCallback((v) => !v, []);

  const handleLayoutMenuClick = useCallback(() => {
    if (!documentName) {
      toast.info("Layouts require a document name. Pass documentName to NbNextDataGrid.");
      return;
    }
    if (showColumnMenu) setShowColumnMenu(false);
    setShowLayoutMenu(toggleLayoutMenu);
  }, [documentName, showColumnMenu, setShowColumnMenu, setShowLayoutMenu, toggleLayoutMenu]);

  const extrasNode = useMemo(() => {
    if (typeof renderToolbarExtras !== "function" || typeof getExportPayload !== "function") {
      return null;
    }
    return renderToolbarExtras({
      getExportPayload,
      disabled: !hasData,
      position,
    });
  }, [renderToolbarExtras, getExportPayload, hasData, position]);

  const showExport = showExcelExport || Boolean(extrasNode);
  const layoutDisabled = !documentName;

  return (
    <div
      className={`flex items-center justify-between min-h-[44px] bg-gradient-to-b from-slate-50 to-slate-100 border-slate-200 ${isTop ? "px-4 py-2.5 border-b" : "px-4 py-2 border-t"}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-wrap">
        {hasActiveFilters && typeof onClearFilters === "function" && (
          <button
            type="button"
            onClick={onClearFilters}
            className={TOOLBAR_HIGHLIGHT_BTN_CLASS}
            title="Remove all column filters"
            aria-label="Clear all filters"
          >
            <FilterX size={14} strokeWidth={2} className="text-amber-800" aria-hidden />
            Clear filters
          </button>
        )}
        <span className="text-sm font-semibold text-slate-800 tracking-tight">NbNext DataGrid</span>
        <span className="text-[13px] text-slate-600" aria-live="polite">
          {totalRows} rows · {visibleColumnsCount} columns
        </span>
      </div>

      <div className="flex items-center">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleColumnMenuClick}
            className={TOOLBAR_BTN_CLASS}
            title="Show or hide columns"
            aria-label="Columns"
          >
            <SlidersHorizontal size={14} strokeWidth={2} />
            Columns
          </button>
          <button
            type="button"
            onClick={handleLayoutMenuClick}
            disabled={layoutDisabled}
            className={TOOLBAR_BTN_CLASS}
            title={layoutDisabled ? "Set documentName to manage layouts" : "Manage saved layouts"}
            aria-label="Layouts"
          >
            <LayoutGrid size={14} strokeWidth={2} />
            Layouts
          </button>
        </div>

        {!hidePagination && (
          <>
            <div className={TOOLBAR_DIVIDER_CLASS} aria-hidden />

            <PaginationControls
              page={page}
              totalPages={totalPages}
              autoPageSize={autoPageSize}
              goToPrevPage={goToPrevPage}
              goToNextPage={goToNextPage}
              fullScreen={fullScreen}
              totalRows={totalRows}
            />
          </>
        )}

        {showExport && (
          <>
            <div className={TOOLBAR_DIVIDER_CLASS} aria-hidden />
            <div className="flex items-center gap-1.5">
              <ToolbarExportButtons
                showExcel={showExcelExport}
                onExcelExport={onExcelExport}
                isExcelExporting={isExcelExporting}
                disabled={!hasData}
              />
              {extrasNode}
            </div>
          </>
        )}

        {onToggleFullScreen && (
          <>
            <div className={TOOLBAR_DIVIDER_CLASS} aria-hidden />
            <button
              type="button"
              onClick={onToggleFullScreen}
              className={TOOLBAR_BTN_CLASS}
              title={fullScreen ? "Exit fullscreen" : "Enter fullscreen"}
              aria-label={fullScreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {fullScreen ? <Minimize2 size={14} strokeWidth={2} /> : <Maximize2 size={14} strokeWidth={2} />}
              <span>{fullScreen ? "Exit" : "Fullscreen"}</span>
            </button>
          </>
        )}

        {showThemeToggle && (
          <>
            <div className={TOOLBAR_DIVIDER_CLASS} aria-hidden />
            <ThemeToggle themeLabel={themeLabel} onCycle={onCycleTheme} />
          </>
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
  documentName: PropTypes.string,
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  autoPageSize: PropTypes.number.isRequired,
  goToPrevPage: PropTypes.func.isRequired,
  goToNextPage: PropTypes.func.isRequired,
  fullScreen: PropTypes.bool,
  onToggleFullScreen: PropTypes.func,
  position: PropTypes.oneOf(["top", "bottom"]),
  showExcelExport: PropTypes.bool,
  onExcelExport: PropTypes.func,
  isExcelExporting: PropTypes.bool,
  hasData: PropTypes.bool,
  getExportPayload: PropTypes.func,
  renderToolbarExtras: PropTypes.func,
  hasActiveFilters: PropTypes.bool,
  onClearFilters: PropTypes.func,
  hidePagination: PropTypes.bool,
  themeLabel: PropTypes.string,
  onCycleTheme: PropTypes.func,
};

export { Toolbar };
