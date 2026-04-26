/** Shared toolbar control styles (NbNext DataGrid) */
const TOOLBAR_BTN_CLASS =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm font-medium text-slate-700 rounded-md border border-slate-200 bg-white transition-colors hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

const TOOLBAR_DIVIDER_CLASS = "w-px h-5 bg-slate-200 mx-3 shrink-0";

/** Emphasized toolbar control (e.g. clear filters when active) */
const TOOLBAR_HIGHLIGHT_BTN_CLASS =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm font-semibold rounded-md border border-amber-400 bg-amber-100 text-amber-950 shadow-sm transition-colors hover:bg-amber-200 hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1";

/** Optional accent for extra toolbar buttons (e.g. PDF) */
const TOOLBAR_BTN_VARIANT_CLASS = {
  default: "",
  rose: "hover:bg-rose-50 hover:border-rose-200 hover:text-rose-800",
  emerald: "hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800",
};

const TOOLBAR_ICON_TONE_CLASS = {
  default: "text-slate-600",
  rose: "text-rose-600",
  emerald: "text-emerald-600",
};

export {
  TOOLBAR_BTN_CLASS,
  TOOLBAR_DIVIDER_CLASS,
  TOOLBAR_HIGHLIGHT_BTN_CLASS,
  TOOLBAR_BTN_VARIANT_CLASS,
  TOOLBAR_ICON_TONE_CLASS,
};
