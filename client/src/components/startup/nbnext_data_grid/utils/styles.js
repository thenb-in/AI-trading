const getGridContainerStyle = (computedContainerHeight, fullScreen = false, sidebarWidth = 0) => {
  const baseStyle = {
    width: fullScreen ? undefined : "100%", // Let left/right handle width in fullscreen
    height: fullScreen ? "100vh" : computedContainerHeight,
    position: fullScreen ? "fixed" : "relative",
    top: fullScreen ? 0 : undefined,
    left: fullScreen ? sidebarWidth : undefined,
    right: fullScreen ? 0 : undefined,
    bottom: fullScreen ? 0 : undefined,
    zIndex: fullScreen ? 9999 : undefined,
    border: fullScreen ? "none" : "1px solid #e2e8f0",
    borderRadius: fullScreen ? 0 : 12,
    overflow: "hidden",
    boxShadow: fullScreen ? "none" : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
  };
  return baseStyle;
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
  height: fullScreen ? "calc(100vh - 44px)" : undefined, // Subtract toolbar height in fullscreen
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
  background: "linear-gradient(180deg, #2563eb 0%, #1e40af 100%)",
  borderBottom: "3px solid #3b82f6",
  borderRight: "2px solid rgba(59, 130, 246, 0.3)",
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

const cellBaseStyle = (rowHeight) => ({
  borderBottom: "2px solid #d1d5db",
  borderRight: "2px solid #e5e7eb",
  padding: "12px 16px",
  height: rowHeight,
  boxSizing: "border-box",
  background: "#fff",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
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
    background: "#1e3a8a",
    borderBottom: "2px solid #60a5fa",
    boxShadow: "inset 0 -3px 0 #60a5fa",
    color: "#ffffff",
  };
};

const getRowStyle = (isEven, isSelected, isHovered) => {
  const baseBg = isEven ? "#ffffff" : "#f9fafb";
  const hoverBg = "#eff6ff";
  const selectedBg = "#dbeafe";

  return {
    background: isSelected ? selectedBg : isHovered ? hoverBg : baseBg,
    transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
    boxShadow: isSelected ? "inset 4px 0 0 0 #2563eb" : undefined,
    transform: isHovered && !isSelected ? "translateX(2px)" : undefined,
  };
};

const getCellBackgroundColor = (isEven, isSelected, isHovered) => {
  const baseBg = isEven ? "#ffffff" : "#f9fafb";
  const hoverBg = "#eff6ff";
  const selectedBg = "#dbeafe";
  return isSelected ? selectedBg : isHovered ? hoverBg : baseBg;
};

export { getGridContainerStyle, toolbarStyle, columnMenuStyle, scrollAreaStyle, tableStyle, headerCellBaseStyle, cellBaseStyle, headerButtonStyle, pinButtonStyle, smallButtonStyle, getSortedHeaderStyle, getRowStyle, getCellBackgroundColor };

