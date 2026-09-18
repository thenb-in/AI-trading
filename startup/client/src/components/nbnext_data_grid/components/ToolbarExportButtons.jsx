import PropTypes from "prop-types";
import { FileSpreadsheet } from "lucide-react";
import { TOOLBAR_BTN_CLASS } from "../utils/toolbarStyles.js";

function ToolbarExportButtons({
  showExcel = false,
  onExcelExport,
  isExcelExporting = false,
  disabled = false,
}) {
  if (!showExcel) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        data-tour="grid-export"
        type="button"
        onClick={onExcelExport}
        disabled={disabled || isExcelExporting}
        className={`${TOOLBAR_BTN_CLASS} hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800`}
        title="Export to Excel"
        aria-label="Export to Excel"
      >
        {isExcelExporting ? (
          <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" aria-hidden />
        ) : (
          <FileSpreadsheet size={14} className="text-emerald-600 shrink-0" strokeWidth={2} aria-hidden />
        )}
        <span className=" sm:inline">Excel</span>
      </button>
    </div>
  );
}

ToolbarExportButtons.propTypes = {
  showExcel: PropTypes.bool,
  onExcelExport: PropTypes.func,
  isExcelExporting: PropTypes.bool,
  disabled: PropTypes.bool,
};

export { ToolbarExportButtons };
