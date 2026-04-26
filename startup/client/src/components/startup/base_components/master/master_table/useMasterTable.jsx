// useMasterTable hook - placeholder implementation
import { useState } from 'react';

const useMasterTable = () => {
  const [tableState, setTableState] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);

  return {
    tableState,
    setTableState,
    selectedRows,
    setSelectedRows,
  };
};

export { useMasterTable };

