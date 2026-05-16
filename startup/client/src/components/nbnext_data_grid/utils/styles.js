const getGridContainerStyle = (computedContainerHeight, fullScreen = false, sidebarWidth = 0, borderless = false) => {
  const stripChrome = fullScreen || borderless;
  return {
    width: fullScreen ? undefined : "100%",
    height: fullScreen ? "100vh" : computedContainerHeight,
    position: fullScreen ? "fixed" : "relative",
    top: fullScreen ? 0 : undefined,
    left: fullScreen ? sidebarWidth : undefined,
    right: fullScreen ? 0 : undefined,
    bottom: fullScreen ? 0 : undefined,
    zIndex: fullScreen ? 5 : undefined,
    border: stripChrome ? "none" : "1px solid #e2e8f0",
    borderRadius: stripChrome ? 0 : 12,
    overflow: "hidden",
    boxShadow: stripChrome ? "none" : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
  };
};

const toolbarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: "1px solid #e2e8f0",
  background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
};

const columnMenuStyle = {
  position: "absolute",
  top: 44,
  right: 12,
  zIndex: 100000,
  background: "#fff",
  border: "1px solid rgba(229,231,235,1)",
  boxShadow: "0 6px 18px rgba(14, 30, 37, 0.08)",
  borderRadius: 8,
  padding: 12,
  maxHeight: 280,
  overflow: "auto",
  minWidth: 220,
};

const scrollAreaStyle = (fullScreen = false) => ({
  position: "relative",
  overflowX: "auto",
  overflowY: "auto",
  flex: 1,
  height: fullScreen ? "calc(100vh - 44px)" : undefined,
});

const tableStyle = {
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: "100%",
  tableLayout: "fixed",
};

const headerCellBaseStyle = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  background: "var(--grid-header-bg)",
  borderBottom: "3px solid var(--grid-header-border)",
  borderRight: "2px solid var(--grid-header-border-soft)",
  padding: "12px 16px",
  boxSizing: "border-box",
  fontWeight: 700,
  fontSize: 12,
  color: "#ffffff",
  userSelect: "none",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const cellBaseStyle = (rowHeight, autoHeight = false) => ({
  borderBottom: "2px solid #d1d5db",
  borderRight: "2px solid #e5e7eb",
  padding: "12px 16px",
  // autoHeight=true: row grows to fit wrapped content; rowHeight is a floor.
  // autoHeight=false: fixed-height row, content truncates with ellipsis.
  // Emit both keys with explicit reset values so Object.assign overwrites
  // stale inline styles cleanly across re-renders.
  height: autoHeight ? "auto" : rowHeight,
  minHeight: autoHeight ? rowHeight : 0,
  whiteSpace: autoHeight ? "pre-wrap" : "nowrap",
  overflow: autoHeight ? "visible" : "hidden",
  textOverflow: autoHeight ? "clip" : "ellipsis",
  overflowWrap: autoHeight ? "anywhere" : "normal",
  boxSizing: "border-box",
  color: "#1f2937",
  fontSize: 13,
  lineHeight: "1.5",
});

const headerButtonStyle = {
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const pinButtonStyle = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.2)",
  padding: "4px",
  marginLeft: 8,
  cursor: "pointer",
  color: "#ffffff",
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 120ms ease",
};

const smallButtonStyle = {
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
};

const getSortedHeaderStyle = (isSorted) => {
  if (!isSorted) return null;
  return {
    background: "var(--grid-header-bg-sorted)",
    borderBottom: "2px solid var(--grid-header-border-sorted)",
    boxShadow: "inset 0 -3px 0 var(--grid-header-border-sorted)",
    color: "#ffffff",
  };
};

const getRowStyle = (isEven, isSelected) => ({
  background: isSelected
    ? "var(--grid-row-selected)"
    : isEven
      ? "var(--grid-row-even)"
      : "var(--grid-row-odd)",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "pointer",
  boxShadow: isSelected ? "inset 4px 0 0 0 var(--grid-row-selected-accent)" : undefined,
});

const getCellBackgroundColor = (isEven, isSelected) =>
  isSelected
    ? "var(--grid-row-selected)"
    : isEven
      ? "var(--grid-row-even)"
      : "var(--grid-row-odd)";

const totalRowStyle = {
  background: "#f3f4f6",
  fontWeight: 600,
  borderTop: "3px solid var(--grid-total-border)",
  borderBottom: "3px solid var(--grid-total-border)",
  position: "sticky",
  bottom: 0,
  zIndex: 1,
};

export {
  getGridContainerStyle,
  toolbarStyle,
  columnMenuStyle,
  scrollAreaStyle,
  tableStyle,
  headerCellBaseStyle,
  cellBaseStyle,
  headerButtonStyle,
  pinButtonStyle,
  smallButtonStyle,
  getSortedHeaderStyle,
  getRowStyle,
  getCellBackgroundColor,
  totalRowStyle,
};
