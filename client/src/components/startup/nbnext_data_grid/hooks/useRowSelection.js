import { useState } from "react";

const useRowSelection = (onRowSelect) => {
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const handleRowClick = (key, row) => {
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

