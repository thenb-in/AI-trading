import { useEffect, useMemo, useState } from "react";

// Pick a subset of columns (and reorder them) by field name. Unknown fields are dropped.
const resolveColumnSubset = (allColumns, fields) => {
  if (!Array.isArray(fields)) return allColumns;
  const byField = new Map(allColumns.map((c) => [c.field, c]));
  return fields.map((f) => byField.get(f)).filter(Boolean);
};

// When `tabs` is provided, owns the active-tab state and derives the
// rows / summary / columns that flow into the rest of the grid pipeline.
// Only the active tab's data enters sort/filter/render — inactive tabs
// stay inert in props.
//
// A tab may optionally override any of:
//   - `rows`         (full row override; otherwise shares top-level rows)
//   - `summary`      (override or share top-level summary)
//   - `columnFields` (subset + ordering of top-level columns by field name)
//   - `columns`      (full column override; wins over `columnFields`)
const useTabsState = ({ tabs, defaultActiveTabId, rowsProp, summaryProp, columnsProp }) => {
  const hasTabs = Array.isArray(tabs) && tabs.length > 0;

  const [activeTabId, setActiveTabId] = useState(() => {
    if (!hasTabs) return null;
    const preferred =
      defaultActiveTabId != null ? tabs.find((t) => t.id === defaultActiveTabId) : null;
    return (preferred ?? tabs[0]).id;
  });

  // If `tabs` prop changes and the current id disappears, fall back to the first tab.
  useEffect(() => {
    if (!hasTabs) return;
    if (!tabs.some((t) => t.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, hasTabs, activeTabId]);

  const activeTab = hasTabs ? (tabs.find((t) => t.id === activeTabId) ?? tabs[0]) : null;
  const rows    = hasTabs ? (activeTab?.rows    ?? rowsProp)    : rowsProp;
  const summary = hasTabs ? (activeTab?.summary ?? summaryProp) : summaryProp;

  const columns = useMemo(() => {
    if (!hasTabs) return columnsProp;
    if (Array.isArray(activeTab?.columns)) return activeTab.columns;
    if (Array.isArray(activeTab?.columnFields)) {
      return resolveColumnSubset(columnsProp, activeTab.columnFields);
    }
    return columnsProp;
  }, [hasTabs, activeTab, columnsProp]);

  return { hasTabs, activeTabId, setActiveTabId, rows, summary, columns };
};

export { useTabsState };
