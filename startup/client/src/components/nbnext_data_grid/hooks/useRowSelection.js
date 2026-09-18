import { useState } from "react";
import { isAltClick } from "../utils/helpers.js";

const useRowSelection = (onRowSelect, onRowClick) => {
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const handleRowClick = (key, row, event) => {
    // Option/Alt + click only highlights the row — the row's own action (opening
    // a modal, drilling in …) stays put, so a row can be marked while reading.
    if (!isAltClick(event) && typeof onRowClick === "function") {
      onRowClick(row, key);
    }
    setSelectedRowId((prev) => {
      const newId = prev === key ? null : key;
      if (typeof onRowSelect === "function") {
        onRowSelect(newId === null ? null : row, newId);
      }
      return newId;
    });
  };

  const handleRowHover = (key) => {
    setHoveredRowId(key);
  };

  const handleRowLeave = (key) => {
    setHoveredRowId((prev) => (prev === key ? null : prev));
  };

  return {
    selectedRowId,
    hoveredRowId,
    handleRowClick,
    handleRowHover,
    handleRowLeave,
  };
};

export { useRowSelection };

