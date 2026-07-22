import { useState, useEffect, useCallback } from 'react';
import { ApiService as layoutApi } from '@services/ApiService';
import { buildColumnConfig } from './useColumnOrder';

/**
 * Hook for managing data-grid layouts
 * Provides functionality to save, load, and manage column configurations
 */
const useLayoutManager = (documentName, initialColumnConfig = []) => {
  const [layouts, setLayouts] = useState({ private: [], public: [] });
  const [currentColumnConfig, setCurrentColumnConfig] = useState(initialColumnConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load layouts when document name changes
  useEffect(() => {
    if (documentName) {
      loadLayouts();
    }
  }, [documentName, loadLayouts]);

  // Update current column config when initial config changes
  useEffect(() => {
    if (initialColumnConfig.length > 0) {
      setCurrentColumnConfig(initialColumnConfig);
    }
  }, [initialColumnConfig]);

  const loadLayouts = useCallback(async () => {
    if (!documentName) return;

    try {
      setLoading(true);
      setError(null);
      const response = await layoutApi.getLayoutsByDocument(documentName);
      setLayouts(response.data.data);
      
      // Return layouts so we can check for default
      return response.data.data;
    } catch (err) {
      setError(err.message || 'Failed to load layouts');
      console.error('Error loading layouts:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [documentName]);

  const saveLayout = useCallback(async (layoutName, type = 'private', layoutId = null, columnConfig = null) => {
    if (!documentName || !layoutName.trim()) {
      throw new Error('Document name and layout name are required');
    }

    try {
      setError(null);
      
      const layoutData = {
        document_name: documentName,
        layout_name: layoutName.trim(),
        type,
        column_config: columnConfig || currentColumnConfig, // Use provided config or fallback to current
      };

      // Add ID if updating existing layout
      if (layoutId) {
        layoutData.id = layoutId;
        console.log('🔧 UPDATING EXISTING LAYOUT - Adding ID to layoutData:', layoutId);
      } else {
        console.log('🆕 CREATING NEW LAYOUT - No ID provided');
      }

      const response = await layoutApi.createOrUpdateLayout(layoutData);
      
      // Refresh layouts
      await loadLayouts();
      
      return response.data.data;
    } catch (err) {
      setError(err.message || 'Failed to save layout');
      throw err;
    }
  }, [documentName, currentColumnConfig, loadLayouts]);

  const loadLayout = useCallback(async (layoutId) => {
    try {
      setError(null);
      const response = await layoutApi.getLayoutById(layoutId);
      const layout = response.data.data;
      
      setCurrentColumnConfig(layout.column_config);
      return layout.column_config;
    } catch (err) {
      setError(err.message || 'Failed to load layout');
      throw err;
    }
  }, []);

  const deleteLayout = useCallback(async (layoutId) => {
    try {
      setError(null);
      await layoutApi.deleteLayout(layoutId);
      
      // Refresh layouts
      await loadLayouts();
    } catch (err) {
      setError(err.message || 'Failed to delete layout');
      throw err;
    }
  }, [loadLayouts]);

  const setDefaultLayout = useCallback(async (layoutId) => {
    try {
      setError(null);
      await layoutApi.setDefaultLayout(layoutId);
      
      // Refresh layouts to update is_default flags
      await loadLayouts();
    } catch (err) {
      setError(err.message || 'Failed to set default layout');
      throw err;
    }
  }, [loadLayouts]);

  const unsetDefaultLayout = useCallback(async (documentName) => {
    try {
      setError(null);
      await layoutApi.unsetDefaultLayout(documentName);
      
      // Refresh layouts to update is_default flags
      await loadLayouts();
    } catch (err) {
      setError(err.message || 'Failed to unset default layout');
      throw err;
    }
  }, [loadLayouts]);

  const updateColumnConfig = useCallback((newConfig) => {
    setCurrentColumnConfig(newConfig);
  }, []);

  const getColumnConfigFromGrid = useCallback((apiRef, columnVisibilityModel = {}, columns = [], columnOrder = []) => {
    if (!columns.length) {
      console.warn('Cannot get column config: columns missing', { columns: columns.length });
      return currentColumnConfig;
    }

    try {
      const order = columnOrder.length
        ? columnOrder
        : (apiRef?.current?.getColumnOrder ? apiRef.current.getColumnOrder() : columns.map((col) => col.field));

      const config = buildColumnConfig(columns, columnVisibilityModel, order);

      setCurrentColumnConfig(config);
      return config;
    } catch (err) {
      console.error('Error getting column config from grid:', err);
      return currentColumnConfig;
    }
  }, [currentColumnConfig]);

  const applyColumnConfigToGrid = useCallback((config, apiRef) => {
    if (!apiRef?.current || !config) {
      console.warn('Cannot apply column config: apiRef or config is missing', { apiRef: !!apiRef?.current, config: !!config });
      return;
    }

    try {
      console.log('Applying column config to grid:', config);
      console.log('Column visibility from config:', config.map(col => ({ field: col.field, hide: col.hide })));
      
      // Apply column order
      const order = config
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(col => col.field);
      
      if (apiRef.current.setColumnOrder) {
        apiRef.current.setColumnOrder(order);
        console.log('Applied column order:', order);
      } else {
        console.warn('setColumnOrder method not available');
      }

      // Apply column widths
      config.forEach(col => {
        if (col.width && apiRef.current.setColumnWidth) {
          apiRef.current.setColumnWidth(col.field, col.width);
        }
      });
      console.log('Applied column widths');
      
      // Note: Column visibility will be handled by the parent component using columnVisibilityModel prop
      console.log('Column visibility should be handled by parent component');
    } catch (err) {
      console.error('Error applying column config to grid:', err);
    }
  }, []);

  return {
    layouts,
    currentColumnConfig,
    loading,
    error,
    loadLayouts,
    saveLayout,
    loadLayout,
    deleteLayout,
    setDefaultLayout,
    unsetDefaultLayout,
    updateColumnConfig,
    getColumnConfigFromGrid,
    applyColumnConfigToGrid,
    setError,
  };
};

export { useLayoutManager };
