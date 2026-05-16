import { useCallback, useEffect, useState } from 'react';

const getInitialColumnOrder = (columns = [], columnConfig = []) => {
  if (!columns.length) return [];

  if (Array.isArray(columnConfig) && columnConfig.length > 0) {
    const orderedFields = [...columnConfig]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((column) => column.field)
      .filter(Boolean);

    const additionalFields = columns
      .map((column) => column.field)
      .filter((field) => !orderedFields.includes(field));

    return [...orderedFields, ...additionalFields];
  }

  return columns.map((column) => column.field);
};

const reorderColumnOrder = (columnOrder = [], field, targetIndex) => {
  if (!field || !Array.isArray(columnOrder)) return columnOrder;

  const nextOrder = [...columnOrder];
  const oldIndex = nextOrder.indexOf(field);
  if (oldIndex === -1 || targetIndex == null) return columnOrder;

  const [removed] = nextOrder.splice(oldIndex, 1);
  nextOrder.splice(targetIndex, 0, removed);
  return nextOrder;
};

const buildColumnConfig = (
  columns = [],
  columnVisibilityModel = {},
  columnOrder = []
) => {
  const orderMap = new Map(
    (Array.isArray(columnOrder) ? columnOrder : []).map((field, index) => [field, index])
  );

  return columns.map((column, index) => {
    const visibilityValue = columnVisibilityModel[column.field];
    const isVisible = visibilityValue === true;

    return {
      field: column.field,
      headerName: column.headerName,
      width: column.width,
      minWidth: column.minWidth,
      maxWidth: column.maxWidth,
      hide: !isVisible,
      sortable: column.sortable,
      filterable: column.filterable,
      order: orderMap.has(column.field) ? orderMap.get(column.field) : index,
    };
  });
};

const useColumnOrder = ({ columns = [], columnConfig = [] } = {}) => {
  const [columnOrder, setColumnOrder] = useState(() =>
    getInitialColumnOrder(columns, columnConfig)
  );

  useEffect(() => {
    if (!columns.length) {
      setColumnOrder([]);
      return;
    }

    const nextOrder = getInitialColumnOrder(columns, columnConfig);
    setColumnOrder((previousOrder) => {
      if (!previousOrder.length) {
        return nextOrder;
      }

      const mergedOrder = [
        ...previousOrder.filter((field) => nextOrder.includes(field)),
        ...nextOrder.filter((field) => !previousOrder.includes(field)),
      ];

      return mergedOrder.join('|') !== previousOrder.join('|')
        ? mergedOrder
        : previousOrder;
    });
  }, [columns, columnConfig]);

  const onColumnOrderChange = useCallback((params) => {
    if (!params?.column?.field) return;
    setColumnOrder((previousOrder) =>
      reorderColumnOrder(previousOrder, params.column.field, params.targetIndex)
    );
  }, []);

  const applyColumnOrderToGrid = useCallback((apiRef, order = []) => {
    if (!apiRef?.current || !Array.isArray(order)) return;
    if (typeof apiRef.current.setColumnOrder !== 'function') {
      console.warn('applyColumnOrderToGrid: setColumnOrder is not available on apiRef');
      return;
    }
    if (!order.length) return;
    apiRef.current.setColumnOrder(order);
  }, []);

  const getColumnConfig = useCallback(
    (columnVisibilityModel = {}, overrideOrder = null) =>
      buildColumnConfig(columns, columnVisibilityModel, overrideOrder || columnOrder),
    [columns, columnOrder]
  );

  return {
    columnOrder,
    setColumnOrder,
    onColumnOrderChange,
    applyColumnOrderToGrid,
    getColumnConfig,
  };
};

export { getInitialColumnOrder, reorderColumnOrder, buildColumnConfig, useColumnOrder };
