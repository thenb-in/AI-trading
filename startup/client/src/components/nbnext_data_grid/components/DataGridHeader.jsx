import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import PropTypes from "prop-types";
import { ArrowUpDown, ArrowUp, ArrowDown, Pin, PinOff, Layers } from "lucide-react";
import { ColumnFilterInput } from "./ColumnFilterInput";
import {
  headerCellBaseStyle,
  getSortedHeaderStyle,
} from "../utils/styles.js";
import { fallbackColumnWidth } from "../utils/helpers.js";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";

function DataGridHeader({
  headerRef,
  frozenColumns,
  nonFrozenColumns,
  cumulativeFrozenLeftOffsets,
  sortModel,
  frozenState,
  handleHeaderClick,
  toggleFrozen,
  columnWidths,
  handleColumnResize,
  fullScreen = false,
  filterModel = {},
  columnFilterTypes = {},
  handleFilterChange,
  groupByField = null,
  toggleGroupBy = null,
  onColumnReorder = null,
  selection = null,
}) {
  const selectionEnabled = Boolean(selection?.enabled);
  const selectionWidth = selectionEnabled ? selection.columnWidth || 40 : 0;
  // Optimized column resizing refs (shared across all columns)
  const resizeStateRef = useRef({});
  const rafRef = useRef();
  const filterRowRef = useRef(null);
  const [headerRowHeight, setHeaderRowHeight] = useState(48); // Default estimate

  // Drag-and-drop state
  const [dragField, setDragField] = useState(null);
  const [dragOverField, setDragOverField] = useState(null);

  // Derive field → { sort, priority } map from the sortModel array for header
  // rendering (priority badge + arrow direction).
  const sortByField = useMemo(() => {
    const arr = (sortModel || []).filter((s) => s && s.field && s.sort);
    const map = new Map();
    arr.forEach((s, idx) => map.set(s.field, { sort: s.sort, priority: idx + 1 }));
    return { map, count: arr.length };
  }, [sortModel]);

  const handleToggleFrozen = (field) => (e) => {
    e.stopPropagation();
    toggleFrozen(field);
  };

  const handleToggleGroupBy = (field) => (e) => {
    e.stopPropagation();
    if (typeof toggleGroupBy === "function") {
      toggleGroupBy(field);
    }
  };

  const onResizeStart = (field, e) => {
    e.preventDefault();
    const th = e.target.closest('th');
    if (!th) return;
    const startX = e.clientX;
    const startWidth = th.offsetWidth;
    resizeStateRef.current = { field, startX, startWidth, th };

    const onMouseMove = (moveEvent) => {
      if (!resizeStateRef.current) return;
      const { startX, startWidth, th } = resizeStateRef.current;
      const deltaX = moveEvent.clientX - startX;
      let newWidth = Math.max(40, startWidth + deltaX);
      // Throttle DOM update with rAF
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          th.style.width = newWidth + 'px';
          th.style.minWidth = newWidth + 'px';
          th.style.maxWidth = newWidth + 'px';
          rafRef.current = null;
        });
      }
      resizeStateRef.current.latestWidth = newWidth;
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Commit to React state
      if (resizeStateRef.current && resizeStateRef.current.latestWidth) {
        handleColumnResize(field, resizeStateRef.current.latestWidth);
      }
      resizeStateRef.current = {};
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDragStart = useCallback((field, e) => {
    setDragField(field);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", field);
  }, []);

  const handleDragOver = useCallback((field, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverField(field);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverField(null);
  }, []);

  const handleDrop = useCallback((targetField, e) => {
    e.preventDefault();
    const sourceField = e.dataTransfer.getData("text/plain");
    if (sourceField && sourceField !== targetField && onColumnReorder) {
      onColumnReorder(sourceField, targetField);
    }
    setDragField(null);
    setDragOverField(null);
  }, [onColumnReorder]);

  const handleDragEnd = useCallback(() => {
    setDragField(null);
    setDragOverField(null);
  }, []);

  const renderHeaderCell = (col, isFrozen) => {
    const sortInfo = sortByField.map.get(col.field) || null;
    const isSorted = sortInfo?.sort || null;
    const showPriority = sortByField.count > 1 && Boolean(sortInfo);
    const sortedStyle = getSortedHeaderStyle(isSorted);
    const left = isFrozen
      ? (cumulativeFrozenLeftOffsets[col.field] || 0) + selectionWidth
      : undefined;
    const isGrouped = groupByField === col.field;
    const isDragging = dragField === col.field;
    const isDragOver = dragOverField === col.field && dragField !== col.field;

    // Use server-provided width and add icon space
    // Use columnWidths if present, else fallback
    const totalWidth = columnWidths && columnWidths[col.field]
      ? columnWidths[col.field]
      : fallbackColumnWidth(col);

    const cellStyle = {
      ...headerCellBaseStyle,
      ...(sortedStyle || {}),
      width: totalWidth,
      minWidth: totalWidth,
      maxWidth: totalWidth,
      zIndex: fullScreen ? (isFrozen ? 10002 : 10001) : (isFrozen ? 2 : 1),
      ...(isFrozen && {
        position: "sticky",
        left,
      }),
      // Drag visual feedback
      ...(isDragging && { opacity: 0.4 }),
      ...(isDragOver && { borderLeft: "3px solid #3b82f6" }),
      cursor: "grab",
    };

    // --- Column resizing logic ---
    // Optimized column resizing
    // NOTE: This code was causing React Hooks violations when called inside .map()
    // Hooks must be called at the component level, not inside render functions
    // const resizeStateRef = useRef({});
    // const rafRef = useRef();

    // const onResizeStart = (field, e) => {
    //   e.preventDefault();
    //   const th = e.target.closest('th');
    //   if (!th) return;
    //   const startX = e.clientX;
    //   const startWidth = th.offsetWidth;
    //   resizeStateRef.current = { field, startX, startWidth, th };

    //   const onMouseMove = (moveEvent) => {
    //     if (!resizeStateRef.current) return;
    //     const { startX, startWidth, th } = resizeStateRef.current;
    //     const deltaX = moveEvent.clientX - startX;
    //     let newWidth = Math.max(40, startWidth + deltaX);
    //     // Throttle DOM update with rAF
    //     if (!rafRef.current) {
    //       rafRef.current = requestAnimationFrame(() => {
    //         th.style.width = newWidth + 'px';
    //         th.style.minWidth = newWidth + 'px';
    //         th.style.maxWidth = newWidth + 'px';
    //         rafRef.current = null;
    //       });
    //     }
    //     resizeStateRef.current.latestWidth = newWidth;
    //   };
    //   const onMouseUp = () => {
    //     window.removeEventListener('mousemove', onMouseMove);
    //     window.removeEventListener('mouseup', onMouseUp);
    //     if (rafRef.current) cancelAnimationFrame(rafRef.current);
    //     // Commit to React state
    //     if (resizeStateRef.current && resizeStateRef.current.latestWidth) {
    //       handleColumnResize(field, resizeStateRef.current.latestWidth);
    //     }
    //     resizeStateRef.current = {};
    //   };
    //   window.addEventListener('mousemove', onMouseMove);
    //   window.addEventListener('mouseup', onMouseUp);
    // };
    // End optimized column resizing

    return (
      <th
        key={col.field}
        style={cellStyle}
        draggable
        onDragStart={(e) => handleDragStart(col.field, e)}
        onDragOver={(e) => handleDragOver(col.field, e)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(col.field, e)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => handleHeaderClick(col, e)}
            className="bg-transparent border-none p-0 m-0 font-inherit text-inherit cursor-pointer inline-flex items-center gap-2"
            title={`${col.headerName} — click to sort, Shift+click to add to multi-sort`}
            aria-label={`Sort by ${col.headerName}`}
          >
            <span>{col.headerName}</span>
            {col.sortable && (
              <span className="inline-flex items-center ml-1.5">
                {isSorted === "asc" ? (
                  <ArrowUp size={16} color="var(--grid-header-icon-sorted)" strokeWidth={2.8} />
                ) : isSorted === "desc" ? (
                  <ArrowDown size={16} color="var(--grid-header-icon-sorted)" strokeWidth={2.8} />
                ) : (
                  <ArrowUpDown size={15} color="var(--grid-header-icon-muted)" strokeWidth={2} />
                )}
                {showPriority && (
                  <span
                    className="ml-1 inline-flex items-center justify-center font-bold rounded-full bg-blue-500 text-white min-w-4 h-4 px-1 text-[10px] leading-none"
                    title={`Sort priority ${sortInfo.priority}`}
                  >
                    {sortInfo.priority}
                  </span>
                )}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleFrozen(col.field)}
            className={`p-1 ml-2 cursor-pointer rounded-md border inline-flex items-center justify-center transition-all duration-120 ${
              frozenState[col.field] 
                ? 'bg-red-100 border-red-500' 
                : 'bg-transparent border-white/20'
            }`}
            title={frozenState[col.field] ? "Unfreeze column" : "Freeze column"}
            aria-label={frozenState[col.field] ? `Unfreeze ${col.headerName}` : `Freeze ${col.headerName}`}
          >
            {frozenState[col.field] ? (
              <Pin size={14} color="#ef4444" fill="#ef4444" strokeWidth={2.5} />
            ) : (
              <PinOff size={14} color="var(--grid-header-icon)" strokeWidth={2} />
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleGroupBy(col.field)}
            className={`p-1 ml-2 cursor-pointer rounded-md border inline-flex items-center justify-center transition-all duration-120 ${
              isGrouped
                ? "bg-green-100 border-green-600"
                : "bg-transparent border-white/20"
            }`}
            title={isGrouped ? "Ungroup column" : "Group by this column"}
            aria-label={isGrouped ? `Ungroup ${col.headerName}` : `Group by ${col.headerName}`}
          >
            <Layers size={14} color={isGrouped ? "#16a34a" : "var(--grid-header-icon)"} strokeWidth={2} />
          </button>
          <div
            className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-10 column-resizer"
            data-field={col.field}
            onMouseDown={e => onResizeStart(col.field, e)}
          />
        </div>
      </th>
    );
  };

  const handleFilterInputChange = useCallback((field, value) => {
    if (handleFilterChange) {
      handleFilterChange(field, value);
    }
  }, [handleFilterChange]);

  const handleFilterInputClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // Measure header row height for sticky filter positioning
  useEffect(() => {
    if (headerRef?.current) {
      const headerRow = headerRef.current;
      const height = headerRow.offsetHeight;
      if (height > 0) {
        setHeaderRowHeight(height);
      }
    }
  }, [headerRef, columnWidths, frozenColumns, nonFrozenColumns]);

  const renderFilterCell = (col, isFrozen) => {
    const left = isFrozen
      ? (cumulativeFrozenLeftOffsets[col.field] || 0) + selectionWidth
      : undefined;
    const totalWidth = columnWidths && columnWidths[col.field]
      ? columnWidths[col.field]
      : fallbackColumnWidth(col);

    const filterCellStyle = {
      ...headerCellBaseStyle,
      padding: "4px 8px",
      height: "auto",
      background: "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
      borderBottom: "2px solid #cbd5e1",
      borderRight: "2px solid #e5e7eb",
      position: "sticky",
      top: headerRowHeight,
      zIndex: fullScreen ? (isFrozen ? 10004 : 10003) : (isFrozen ? 4 : 3),
      width: totalWidth,
      minWidth: totalWidth,
      maxWidth: totalWidth,
      ...(isFrozen && {
        left,
      }),
    };

    return (
      <th key={`filter-${col.field}`} style={filterCellStyle}>
        <ColumnFilterInput
          column={col}
          columnType={columnFilterTypes[col.field]}
          entry={filterModel[col.field]}
          onChange={handleFilterInputChange}
          onInputClick={handleFilterInputClick}
        />
      </th>
    );
  };

  const selectionHeaderCellStyle = {
    ...headerCellBaseStyle,
    width: selectionWidth,
    minWidth: selectionWidth,
    maxWidth: selectionWidth,
    padding: 0,
    textAlign: "center",
    position: "sticky",
    left: 0,
    zIndex: fullScreen ? 10002 : 2,
    cursor: "default",
  };

  const selectionFilterCellStyle = {
    ...headerCellBaseStyle,
    padding: 0,
    height: "auto",
    background: "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
    borderBottom: "2px solid #cbd5e1",
    borderRight: "2px solid #e5e7eb",
    position: "sticky",
    top: headerRowHeight,
    left: 0,
    zIndex: fullScreen ? 10004 : 4,
    width: selectionWidth,
    minWidth: selectionWidth,
    maxWidth: selectionWidth,
  };

  const handleSelectAllChange = (e) => {
    e.stopPropagation();
    if (typeof selection?.onToggleAll === "function") {
      selection.onToggleAll();
    }
  };

  const setIndeterminate = (el) => {
    if (el) el.indeterminate = Boolean(selection?.someSelected) && !selection?.allSelected;
  };

  return (
    <thead>
      <tr ref={headerRef}>
        {selectionEnabled && (
          <th style={selectionHeaderCellStyle}>
            <CheckboxTypeField
              mode="bare"
              inputRef={setIndeterminate}
              checked={Boolean(selection?.allSelected)}
              onChange={handleSelectAllChange}
              onClick={(e) => e.stopPropagation()}
              aria-label="Select all rows on this page"
              className="cursor-pointer"
            />
          </th>
        )}
        {frozenColumns.map((col) => renderHeaderCell(col, true))}
        {nonFrozenColumns.map((col) => renderHeaderCell(col, false))}
      </tr>
      <tr ref={filterRowRef}>
        {selectionEnabled && <th style={selectionFilterCellStyle} />}
        {frozenColumns.map((col) => renderFilterCell(col, true))}
        {nonFrozenColumns.map((col) => renderFilterCell(col, false))}
      </tr>
    </thead>
  );
}

DataGridHeader.propTypes = {
  columnWidths: PropTypes.object,
  handleColumnResize: PropTypes.func,
  headerRef: PropTypes.object.isRequired,
  frozenColumns: PropTypes.array.isRequired,
  nonFrozenColumns: PropTypes.array.isRequired,
  cumulativeFrozenLeftOffsets: PropTypes.object.isRequired,
  sortModel: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      sort: PropTypes.oneOf(["asc", "desc"]).isRequired,
    })
  ).isRequired,
  frozenState: PropTypes.object.isRequired,
  handleHeaderClick: PropTypes.func.isRequired,
  toggleFrozen: PropTypes.func.isRequired,
  fullScreen: PropTypes.bool,
  filterModel: PropTypes.object,
  columnFilterTypes: PropTypes.object,
  handleFilterChange: PropTypes.func,
  groupByField: PropTypes.string,
  toggleGroupBy: PropTypes.func,
  onColumnReorder: PropTypes.func,
  selection: PropTypes.shape({
    enabled: PropTypes.bool,
    columnWidth: PropTypes.number,
    allSelected: PropTypes.bool,
    someSelected: PropTypes.bool,
    onToggleAll: PropTypes.func,
  }),
};

export { DataGridHeader };

