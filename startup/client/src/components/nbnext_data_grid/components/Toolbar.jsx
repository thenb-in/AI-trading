import PropTypes from "prop-types";
import { useCallback, useMemo } from "react";
import { Maximize2, Minimize2, LayoutGrid, SlidersHorizontal, FilterX } from "lucide-react";
import { toast } from "react-toastify";
import { PaginationControls } from "./PaginationControls.jsx";
import { ToolbarExportButtons } from "./ToolbarExportButtons.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { ViewModeToggle } from "./ViewModeToggle.jsx";
import {
  TOOLBAR_BTN_CLASS,
  TOOLBAR_DIVIDER_CLASS,
  TOOLBAR_HIGHLIGHT_BTN_CLASS,
} from "../utils/toolbarStyles.js";
import { ShortcutHint } from "@startup/components/base_components/ShortcutHint";
import { SHORTCUTS } from "@startup/constants/shortcuts";
import { shortcutTitle } from "@utils/keyboardShortcut";

function Toolbar({
  totalRows,
  visibleColumnsCount,
  setShowColumnMenu,
  showColumnMenu,
  showLayoutMenu,
  setShowLayoutMenu,
  documentName,
  activeLayoutName = null,
  isLayoutDirty = false,
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
  viewMode = null,
  onCycleViewMode = null,
}) {
  const isTop = position === "top";
  const showThemeToggle = !isTop && themeLabel && typeof onCycleTheme === "function";
  const showViewModeToggle = !isTop && viewMode && typeof onCycleViewMode === "function";

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
      className={`flex flex-wrap items-center justify-between gap-y-2 min-h-[44px] bg-gradient-to-b from-slate-50 to-slate-100 border-slate-200 ${isTop ? "px-2 sm:px-4 py-2 sm:py-2.5 border-b" : "px-2 sm:px-4 py-2 border-t"}`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
        {hasActiveFilters && typeof onClearFilters === "function" && (
          <button
            type="button"
            onClick={onClearFilters}
            className={TOOLBAR_HIGHLIGHT_BTN_CLASS}
            title="Remove all column filters"
            aria-label="Clear all filters"
          >
            <FilterX size={14} strokeWidth={2} className="text-amber-800" aria-hidden />
            <span className="hidden sm:inline">Clear filters</span>
          </button>
        )}
        <span className=" sm:inline text-sm font-semibold text-slate-800 tracking-tight">NbNext DataGrid</span>
        <span className="text-xs sm:text-[13px] text-slate-600" aria-live="polite">
          {totalRows} rows · {visibleColumnsCount} cols
        </span>
      </div>

      <div className="flex items-center flex-wrap gap-1.5 sm:gap-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleColumnMenuClick}
            className={TOOLBAR_BTN_CLASS}
            title="Show or hide columns"
            aria-label="Columns"
          >
            <SlidersHorizontal size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Columns</span>
          </button>
          <button
            type="button"
            onClick={handleLayoutMenuClick}
            disabled={layoutDisabled}
            className={activeLayoutName ? TOOLBAR_HIGHLIGHT_BTN_CLASS : TOOLBAR_BTN_CLASS}
            title={
              layoutDisabled
                ? "Set documentName to manage layouts"
                : activeLayoutName
                  ? `Active layout: ${activeLayoutName}${isLayoutDirty ? " (unsaved manual changes)" : ""}`
                  : isLayoutDirty
                    ? "Manage saved layouts (unsaved manual changes)"
                    : "Manage saved layouts"
            }
            aria-label={activeLayoutName ? `Layouts — ${activeLayoutName} active${isLayoutDirty ? ", unsaved" : ""}` : "Layouts"}
          >
            <LayoutGrid size={14} strokeWidth={2} />
            <span className="hidden sm:inline">
              {activeLayoutName ? `Layout: ${activeLayoutName}${isLayoutDirty ? "*" : ""}` : `Layouts${isLayoutDirty ? "*" : ""}`}
            </span>
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
              title={shortcutTitle(fullScreen ? "Exit fullscreen" : "Enter fullscreen", SHORTCUTS.FULL_SCREEN)}
              aria-label={fullScreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {fullScreen ? <Minimize2 size={14} strokeWidth={2} /> : <Maximize2 size={14} strokeWidth={2} />}
              <span className="hidden sm:inline">{fullScreen ? "Exit" : "Fullscreen"}</span>
              <ShortcutHint shortcut={SHORTCUTS.FULL_SCREEN} className="ml-1" />
            </button>
          </>
        )}

        {(showViewModeToggle || showThemeToggle) && (
          <>
            <div className={TOOLBAR_DIVIDER_CLASS} aria-hidden />
            <div className="flex items-center gap-1.5">
              {showViewModeToggle && (
                <ViewModeToggle viewMode={viewMode} onCycle={onCycleViewMode} />
              )}
              {showThemeToggle && (
                <ThemeToggle themeLabel={themeLabel} onCycle={onCycleTheme} />
              )}
            </div>
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
  activeLayoutName: PropTypes.string,
  isLayoutDirty: PropTypes.bool,
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
  viewMode: PropTypes.oneOf(["table", "cards"]),
  onCycleViewMode: PropTypes.func,
};

export { Toolbar };
